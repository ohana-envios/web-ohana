import { useEffect, useRef, useState } from 'react';
import type { CustomerDetail } from './types';

export function StatusChangeConfirmation({ kind, activate, name, onConfirm, onSaved, onCancel }: {
  kind: 'customer' | 'address';
  activate: boolean;
  name: string;
  onConfirm(signal: AbortSignal): Promise<CustomerDetail>;
  onSaved(customer: CustomerDetail): void;
  onCancel(): void;
}) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    cancelButton.current?.focus();
    return () => request.current?.abort();
  }, []);
  useEffect(() => { if (failed) errorMessage.current?.focus(); }, [failed]);

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    const controller = new AbortController();
    request.current = controller;
    try {
      const saved = await onConfirm(controller.signal);
      if (!controller.signal.aborted) {
        setSaving(false);
        onSaved(saved);
      }
    } catch {
      if (!controller.signal.aborted) {
        setSaving(false);
        setFailed(true);
      }
    }
  }

  const action = activate ? 'reactivación' : 'desactivación';
  const target = kind === 'customer' ? 'cliente' : 'dirección';
  return <section className="customer-detail panel customer-confirmation" aria-labelledby="status-change-heading" aria-busy={saving}>
    <span className="eyebrow">CONFIRMAR {action.toLocaleUpperCase('es')}</span>
    <h2 id="status-change-heading">¿{activate ? 'Reactivar' : 'Desactivar'} {kind === 'customer' ? 'este cliente' : 'esta dirección'}?</h2>
    <p className="customer-confirmation-name">{name}</p>
    <div id="status-change-description" className="customer-muted">
      {kind === 'customer' ? <p>El cliente se mostrará como {activate ? 'habilitado' : 'deshabilitado'}. Su ficha y sus direcciones se conservan; esta acción no cambia su cuenta de acceso ni sus permisos. El estado de sus direcciones se mantiene.</p> :
        <p>La dirección se mostrará como {activate ? 'activa' : 'desactivada'}. Se conservan todos sus datos y no se modifica el estado del cliente.</p>}
      <p>El cambio es temporal en esta vista previa y se restablece al recargar.</p>
    </div>
    {failed && <p className="customer-save-error" role="alert" tabIndex={-1} ref={errorMessage}>No se pudo completar la {action}. Podés reintentar o cancelar.</p>}
    <div className="customer-edit-actions">
      <button type="button" className="customer-button" ref={cancelButton} disabled={saving} aria-describedby="status-change-description" onClick={onCancel}>Cancelar</button>
      <button type="button" className={`customer-button ${activate ? 'customer-button-primary' : 'customer-button-danger'}`} disabled={saving} onClick={() => void confirm()}>{saving ? (activate ? 'Reactivando…' : 'Desactivando…') : `Confirmar ${action} ${kind === 'customer' ? 'del' : 'de la'} ${target}`}</button>
    </div>
  </section>;
}
