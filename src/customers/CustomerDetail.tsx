import { useEffect, useRef, useState } from 'react';
import { CustomerStatus } from './CustomerStatus';
import { CustomerEditForm } from './CustomerEditForm';
import { CustomerAddressForm } from './CustomerAddressForm';
import { CustomerAddresses } from './CustomerAddresses';
import { StatusChangeConfirmation } from './StatusChangeConfirmation';
import type { CustomerAddress, CustomerDetail as Detail, CustomersSource } from './types';

type DetailState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; customer: Detail };
type Editor = { kind: 'customer' } | { kind: 'address'; address: CustomerAddress | null }
  | { kind: 'customerStatus'; activate: boolean } | { kind: 'addressStatus'; address: CustomerAddress; activate: boolean } | null;

export function CustomerDetail({ id, source, onBack, onUpdated, preview }: {
  id: string;
  source: CustomersSource;
  preview: boolean;
  onBack(): void;
  onUpdated(): void;
}) {
  const [state, setState] = useState<DetailState>({ kind: 'loading' });
  const [retry, setRetry] = useState(0);
  const [editor, setEditor] = useState<Editor>(null);
  const [saved, setSaved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    source.get(id, controller.signal)
      .then((customer) => {
        if (!controller.signal.aborted) setState({ kind: 'ready', customer });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: 'error' });
      });
    return () => controller.abort();
  }, [id, source, retry]);

  useEffect(() => { if (!editor) heading.current?.focus(); }, [state, editor]);

  function handleSaved(customer: Detail) {
    setState({ kind: 'ready', customer });
    setEditor(null);
    setSaved(true);
    onUpdated();
  }

  function openEditor(next: Editor) {
    setSaved(false);
    setEditor(next);
  }

  const update = source.update;
  if (editor?.kind === 'customer' && state.kind === 'ready' && update) {
    return <CustomerEditForm customer={state.customer} preview={preview}
      onSave={(draft, signal) => update(id, draft, signal, state.customer)}
      onReload={() => { setState({ kind: 'loading' }); setEditor(null); setRetry((value) => value + 1); }}
      onCancel={() => setEditor(null)} onSaved={handleSaved} />;
  }
  if (editor?.kind === 'address' && state.kind === 'ready') {
    const address = editor.address;
    return <CustomerAddressForm customer={state.customer} address={address} preview={preview}
      onSave={async (draft, signal) => {
        if (address && source.updateAddress) return source.updateAddress(id, address.id, draft, signal, address);
        if (!address && source.addAddress) return source.addAddress(id, draft, signal);
        throw new Error('La edición de direcciones no está disponible');
      }}
      onCancel={() => setEditor(null)} onSaved={handleSaved}
      onReload={() => { setState({ kind: 'loading' }); setEditor(null); setRetry((value) => value + 1); }} />;
  }
  if ((editor?.kind === 'customerStatus' || editor?.kind === 'addressStatus') && state.kind === 'ready') {
    const address = editor.kind === 'addressStatus' ? editor.address : null;
    const changeAddress = editor.activate ? source.reactivateAddress : source.deactivateAddress;
    const changeCustomer = editor.activate ? source.reactivateCustomer : source.deactivateCustomer;
    return <StatusChangeConfirmation kind={address ? 'address' : 'customer'} activate={editor.activate} preview={preview}
      name={address ? `${address.label ? `${address.label}: ` : ''}${address.street} ${address.number}, ${address.locality}` : state.customer.displayName}
      onConfirm={async (signal) => {
        if (address && changeAddress) return changeAddress(id, address.id, signal);
        if (!address && changeCustomer) return changeCustomer(id, signal);
        throw new Error('El cambio de estado no está disponible');
      }} onSaved={handleSaved} onCancel={() => setEditor(null)}
      onReload={() => { setState({ kind: 'loading' }); setEditor(null); setRetry((value) => value + 1); }} />;
  }

  return <section className="customer-detail" aria-label="Ficha de cliente">
    <button type="button" className="customer-back" onClick={onBack}>← Volver a clientes</button>
    {saved && <p className="customer-save-success" role="status">{preview ? 'Cambios guardados temporalmente en esta vista previa. Se restablecen al recargar.' : 'Cambios guardados.'}</p>}
    {state.kind === 'loading' && <p role="status">Cargando ficha del cliente…</p>}
    {state.kind === 'error' && <div className="panel customer-message" role="alert">
      <h2 ref={heading} tabIndex={-1}>No se pudo cargar la ficha</h2>
      <p>Volvé a intentar para consultar los datos del cliente.</p>
      <button className="customer-button" type="button" onClick={() => setRetry((value) => value + 1)}>Reintentar</button>
    </div>}
    {state.kind === 'ready' && <>
      <div className="panel">
        <div className="customer-detail-heading">
          <div><span className="eyebrow">FICHA DE CLIENTE</span><h2 ref={heading} tabIndex={-1}>{state.customer.displayName}</h2></div>
          <CustomerStatus enabled={state.customer.enabled} />
        </div>
        <dl className="customer-data">
          <div><dt>Tipo de cliente</dt><dd>{state.customer.type === 'COMPANY' ? 'Empresa' : 'Persona'}</dd></div>
          <div><dt>Razón social</dt><dd>{state.customer.legalName ?? 'Sin registrar'}</dd></div>
          <div><dt>Documento</dt><dd>{state.customer.documentNumber ? [state.customer.documentType, state.customer.documentNumber].filter(Boolean).join(' ') : 'Sin registrar'}</dd></div>
          <div><dt>Teléfono</dt><dd>{state.customer.phone ?? 'Sin registrar'}</dd></div>
          <div><dt>Email</dt><dd>{state.customer.email ?? 'Sin registrar'}</dd></div>
        </dl>
        <div className="customer-edit-actions">
          {update && <button type="button" className="customer-button" onClick={() => openEditor({ kind: 'customer' })}>Editar datos</button>}
          {source.deactivateCustomer && state.customer.enabled && <button type="button" className="customer-button customer-button-danger" onClick={() => openEditor({ kind: 'customerStatus', activate: false })}>Desactivar cliente</button>}
          {source.reactivateCustomer && !state.customer.enabled && <button type="button" className="customer-button customer-button-primary" onClick={() => openEditor({ kind: 'customerStatus', activate: true })}>Reactivar cliente</button>}
        </div>
      </div>
      <CustomerAddresses customer={state.customer} preview={preview}
        onAdd={source.addAddress ? () => openEditor({ kind: 'address', address: null }) : undefined}
        onEdit={source.updateAddress ? (address) => openEditor({ kind: 'address', address }) : undefined}
        onDeactivate={source.deactivateAddress ? (address) => openEditor({ kind: 'addressStatus', address, activate: false }) : undefined}
        onReactivate={source.reactivateAddress ? (address) => openEditor({ kind: 'addressStatus', address, activate: true }) : undefined} />
    </>}
  </section>;
}
