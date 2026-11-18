import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { addressFieldLimits, hasDuplicateAddress, validateCustomerAddress } from './customer-address';
import { isCustomerConflict } from './customer-edit';
import type { AddressErrors } from './customer-address';
import type { CustomerAddress, CustomerAddressDraft, CustomerDetail } from './types';

const fields = [
  { name: 'label', label: 'Etiqueta (opcional)', required: false },
  { name: 'street', label: 'Calle (obligatorio)', required: true },
  { name: 'number', label: 'Número (obligatorio)', required: true },
  { name: 'locality', label: 'Localidad o barrio (obligatorio)', required: true },
  { name: 'department', label: 'Departamento (obligatorio)', required: true },
  { name: 'reference', label: 'Referencia (opcional)', required: false },
  { name: 'notes', label: 'Observaciones (opcional)', required: false },
] as const;

export function CustomerAddressForm({ customer, address, preview, onSave, onSaved, onCancel, onReload }: {
  customer: CustomerDetail;
  address: CustomerAddress | null;
  preview: boolean;
  onSave(draft: CustomerAddressDraft, signal: AbortSignal): Promise<CustomerDetail>;
  onSaved(customer: CustomerDetail): void;
  onCancel(): void;
  onReload(): void;
}) {
  const [draft, setDraft] = useState<CustomerAddressDraft>({
    label: address?.label ?? '', street: address?.street ?? '', number: address?.number ?? '',
    locality: address?.locality ?? '', department: address?.department ?? '',
    reference: address?.reference ?? '', notes: address?.notes ?? '',
  });
  const [errors, setErrors] = useState<AddressErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState<'error' | 'conflict' | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const errorMessage = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const focusInvalid = useRef(false);
  const duplicate = hasDuplicateAddress(customer.addresses, draft, address?.id);

  useEffect(() => {
    heading.current?.focus();
    return () => request.current?.abort();
  }, []);
  useEffect(() => {
    if (focusInvalid.current) {
      form.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>('[aria-invalid="true"]')?.focus();
      focusInvalid.current = false;
    }
  }, [errors]);
  useEffect(() => { if (saveFailed) errorMessage.current?.focus(); }, [saveFailed]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || saveFailed === 'conflict') return;
    setSaveFailed(null);
    const validation = validateCustomerAddress(draft);
    if (!validation.valid) {
      focusInvalid.current = true;
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      const saved = await onSave(draft, controller.signal);
      if (!controller.signal.aborted) {
        setSaving(false);
        onSaved(saved);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setSaving(false);
        setSaveFailed(isCustomerConflict(error) ? 'conflict' : 'error');
      }
    }
  }

  return <section className="customer-detail panel customer-edit customer-address-form" aria-labelledby="address-form-heading">
    <span className="eyebrow">{customer.displayName}</span>
    <h2 id="address-form-heading" ref={heading} tabIndex={-1}>{address ? 'Editar dirección habitual' : 'Agregar dirección habitual'}</h2>
    <p className="customer-muted" id="address-form-notice">{preview ? 'Los cambios son temporales y se restablecen al recargar. ' : ''}Usá los campos de referencia y observaciones para instrucciones de retiro.</p>
    <form ref={form} noValidate onSubmit={submit} aria-busy={saving} aria-describedby="address-form-notice">
      {saveFailed && <div className="customer-save-error" role="alert" tabIndex={-1} ref={errorMessage}>
        <strong>{saveFailed === 'conflict' ? 'La dirección cambió mientras la editabas.' : 'No se pudo guardar la dirección.'}</strong>
        <p>{saveFailed === 'conflict' ? 'Tus cambios siguen en el formulario. Copialos si los necesitás; después descartalos y recargá la ficha.' : 'Los datos siguen en el formulario. Podés volver a guardar o cancelar.'}</p>
        {saveFailed === 'conflict' && <button type="button" className="customer-button" onClick={onReload}>Descartar y recargar ficha</button>}
      </div>}
      {duplicate && <p className="customer-duplicate-warning" role="status">Ya hay una dirección con la misma calle, número, localidad y departamento. Revisala antes de guardar otra.</p>}
      <fieldset disabled={saving} className="customer-edit-fields">
        <legend className="customer-sr-only">Datos de la dirección de retiro</legend>
        {fields.map((field) => {
          const inputId = `address-${field.name}`;
          const attributes = {
            id: inputId, name: field.name, value: draft[field.name], required: field.required,
            maxLength: addressFieldLimits[field.name],
            'aria-invalid': Boolean(errors[field.name]),
            'aria-describedby': errors[field.name] ? `${inputId}-error` : undefined,
            onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              setDraft({ ...draft, [field.name]: event.target.value });
              setErrors({ ...errors, [field.name]: undefined });
              if (saveFailed !== 'conflict') setSaveFailed(null);
            },
          };
          return <div className={`customer-field ${field.name === 'notes' || field.name === 'reference' ? 'customer-field-wide' : ''}`} key={field.name}>
            <label htmlFor={inputId}>{field.label}</label>
            {field.name === 'notes' ? <textarea {...attributes} rows={4} /> : <input {...attributes} type="text" />}
            {errors[field.name] && <span className="customer-field-error" id={`${inputId}-error`}>{errors[field.name]}</span>}
          </div>;
        })}
        <div className="customer-edit-actions customer-field-wide">
          <button type="submit" className="customer-button customer-button-primary" disabled={saveFailed === 'conflict'}>{saving ? 'Guardando…' : address ? 'Guardar cambios' : 'Guardar dirección'}</button>
          <button type="button" className="customer-button" onClick={saveFailed === 'conflict' ? onReload : onCancel}>Cancelar</button>
        </div>
      </fieldset>
    </form>
  </section>;
}
