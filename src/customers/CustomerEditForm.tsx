import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { isCustomerConflict, validateCustomerEdit } from './customer-edit';
import type { CustomerEditErrors } from './customer-edit';
import type { CustomerDetail, CustomerEditDraft } from './types';

const fields = [
  { name: 'displayName', label: 'Nombre o nombre comercial (obligatorio)', type: 'text', maximum: 120 },
  { name: 'legalName', label: 'Razón social (opcional)', type: 'text', maximum: 160 },
  { name: 'email', label: 'Email (opcional)', type: 'email', maximum: 254 },
  { name: 'phone', label: 'Teléfono (opcional)', type: 'tel', maximum: 40 },
] as const;

export function CustomerEditForm({ customer, preview, onSave, onSaved, onCancel, onReload }: {
  customer: CustomerDetail;
  preview: boolean;
  onSave(draft: CustomerEditDraft, signal: AbortSignal): Promise<CustomerDetail>;
  onSaved(customer: CustomerDetail): void;
  onCancel(): void;
  onReload(): void;
}) {
  const [draft, setDraft] = useState<CustomerEditDraft>({
    displayName: customer.displayName, legalName: customer.legalName ?? '',
    email: customer.email ?? '', phone: customer.phone ?? '',
  });
  const [errors, setErrors] = useState<CustomerEditErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState<'error' | 'conflict' | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorMessage = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const focusInvalid = useRef(false);

  useEffect(() => {
    heading.current?.focus();
    return () => request.current?.abort();
  }, []);

  useEffect(() => {
    if (focusInvalid.current) {
      form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
      focusInvalid.current = false;
    }
  }, [errors]);

  useEffect(() => { if (saveFailed) errorMessage.current?.focus(); }, [saveFailed]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || saveFailed === 'conflict') return;
    setSaveFailed(null);
    const validation = validateCustomerEdit(draft);
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

  return <section className="customer-detail panel customer-edit" aria-labelledby="customer-edit-heading">
    <span className="eyebrow">{customer.displayName}</span>
    <h2 id="customer-edit-heading" ref={heading} tabIndex={-1}>Editar datos del cliente</h2>
    <p className="customer-muted" id="customer-edit-notice">{preview ? 'Los cambios de esta vista previa son temporales. Al recargar se restablecen los datos de prueba.' : 'Los cambios se guardarán en la ficha del cliente.'}</p>
    <form ref={form} onSubmit={submit} noValidate aria-busy={saving} aria-describedby="customer-edit-notice">
      {saveFailed && <div className="customer-save-error" role="alert" tabIndex={-1} ref={errorMessage}>
        <strong>{saveFailed === 'conflict' ? 'La ficha cambió mientras la editabas.' : 'No se pudieron guardar los cambios.'}</strong>
        <p>{saveFailed === 'conflict' ? 'Tus cambios siguen en el formulario. Copialos si los necesitás; después descartalos y recargá la ficha antes de editar nuevamente.' : 'Tus datos siguen en el formulario. Podés volver a guardar o cancelar.'}</p>
        {saveFailed === 'conflict' && <button type="button" className="customer-button" onClick={onReload}>Descartar y recargar ficha</button>}
      </div>}
      <fieldset disabled={saving} className="customer-edit-fields">
        <legend className="customer-sr-only">Datos de nombre y contacto</legend>
        {fields.map((field) => {
          const inputId = `edit-customer-${field.name}`;
          return <div className="customer-field" key={field.name}>
            <label htmlFor={inputId}>{field.label}</label>
            <input id={inputId} name={field.name} type={field.type} maxLength={field.maximum}
              required={field.name === 'displayName'} value={draft[field.name]}
              aria-invalid={Boolean(errors[field.name])}
              aria-describedby={errors[field.name] ? `${inputId}-error` : undefined}
              onChange={(event) => {
                setDraft({ ...draft, [field.name]: event.target.value });
                setErrors({ ...errors, [field.name]: undefined });
                if (saveFailed !== 'conflict') setSaveFailed(null);
              }} />
            {errors[field.name] && <span className="customer-field-error" id={`${inputId}-error`}>{errors[field.name]}</span>}
          </div>;
        })}
        <div className="customer-edit-actions">
          <button type="submit" className="customer-button customer-button-primary" disabled={saveFailed === 'conflict'}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          <button type="button" className="customer-button" onClick={saveFailed === 'conflict' ? onReload : onCancel}>Cancelar</button>
        </div>
      </fieldset>
    </form>
  </section>;
}
