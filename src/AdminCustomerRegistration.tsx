import { useEffect, useRef, useState } from 'react';
import type { AdminRegistrationDraft, RegistrationsSource } from './registrations';

const empty: AdminRegistrationDraft = { displayName: '', type: 'PERSON', phone: '', email: '' };
export function AdminCustomerRegistration({ source, onCreated }: { source: RegistrationsSource; onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false); const [draft, setDraft] = useState(empty);
  const [review, setReview] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const pending = useRef<AbortController | null>(null); useEffect(() => () => pending.current?.abort(), []);
  async function save() {
    if (busy) return; const controller = new AbortController(); pending.current = controller; setBusy(true); setMessage('');
    try { const result = await source.registerByAdmin(draft, controller.signal); if (!controller.signal.aborted) { setDraft(empty); setReview(false); setOpen(false); setMessage('Cliente registrado y habilitado.'); onCreated(result.id); } }
    catch (error) { if (!controller.signal.aborted) setMessage(typeof error === 'object' && error !== null && 'status' in error && error.status === 409 ? 'Ya existe un cliente o solicitud con ese correo.' : 'No se pudo registrar. Revisá los datos e intentá nuevamente.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <section className="panel user-access-form"><h2>Registrar cliente</h2>
    <p>El cliente queda habilitado para operar. Esta alta no crea una cuenta de acceso.</p>
    {message && <p role="status">{message}</p>}
    {!open ? <button className="users-button" type="button" onClick={() => { setMessage(''); setOpen(true); }}>Nuevo cliente</button> : <>
      {review ? <><p>Nombre: {draft.displayName}</p><p>Tipo: {draft.type === 'PERSON' ? 'Persona' : 'Empresa'}</p><p>Correo: {draft.email || 'Sin informar'}</p><p>Teléfono: {draft.phone || 'Sin informar'}</p></> : <>
        <div className="users-field"><label htmlFor="new-customer-name">Nombre o razón comercial</label><input id="new-customer-name" maxLength={120} value={draft.displayName} onChange={e => setDraft({ ...draft, displayName: e.target.value })} /></div>
        <div className="users-field"><label htmlFor="new-customer-type">Tipo de cliente</label><select id="new-customer-type" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value === 'COMPANY' ? 'COMPANY' : 'PERSON' })}><option value="PERSON">Persona</option><option value="COMPANY">Empresa</option></select></div>
        <div className="users-field"><label htmlFor="new-customer-email">Correo (opcional)</label><input id="new-customer-email" type="email" maxLength={254} value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></div>
        <div className="users-field"><label htmlFor="new-customer-phone">Teléfono (opcional)</label><input id="new-customer-phone" type="tel" maxLength={40} value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></div>
      </>}
      <button className="users-button" type="button" disabled={busy} onClick={() => { setOpen(false); setReview(false); setMessage(''); }}>Cancelar</button>
      {review && <button className="users-button" type="button" disabled={busy} onClick={() => setReview(false)}>Volver a editar</button>}
      <button className="users-button" type="button" disabled={busy || !draft.displayName.trim()} onClick={() => review ? void save() : setReview(true)}>{busy ? 'Guardando…' : review ? 'Confirmar alta' : 'Revisar alta'}</button>
    </>}
  </section>;
}
