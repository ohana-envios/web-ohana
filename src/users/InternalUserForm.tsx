import { useEffect, useRef, useState } from 'react';
import { userRoleLabels } from './types';
import type { InternalUserDraft, UsersSource } from './types';
const empty: InternalUserDraft = { displayName: '', email: '', role: 'OPERATOR' };
const roles = ['ADMIN', 'OPERATOR', 'COURIER'] as const;
export function InternalUserForm({ source, onCreated }: { source: UsersSource; onCreated: (email: string) => void }) {
  const [open, setOpen] = useState(false); const [draft, setDraft] = useState(empty); const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  if (!source.createInternal) return null;
  async function save() {
    if (busy || !source.createInternal) return; const controller = new AbortController(); pending.current = controller; setBusy(true); setMessage('');
    try { await source.createInternal(draft, controller.signal); if (!controller.signal.aborted) { setDraft(empty); setOpen(false); setReview(false); setMessage('Usuario creado. Generá la invitación en su ficha y compartí el código con la persona.'); onCreated(draft.email.trim()); } }
    catch (failure) { if (!controller.signal.aborted) setMessage(typeof failure === 'object' && failure !== null && 'status' in failure && failure.status === 409 ? 'Ya existe una cuenta con ese correo.' : 'No se pudo crear el usuario. Revisá los datos e intentá nuevamente.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <section className="panel user-access-form"><h3>Crear usuario interno</h3><p>Elegí el rol y revisá los datos. Después de que la persona vincule su correo, podrás habilitar su acceso.</p>
    {message && <p role="status">{message}</p>}
    {!open ? <button className="users-button" type="button" onClick={() => { setMessage(''); setOpen(true); }}>Nuevo usuario</button> : <>
      {review ? <><p>Nombre: {draft.displayName}</p><p>Correo: {draft.email}</p><p>Rol: {userRoleLabels[draft.role]}</p></> : <>
        <div className="users-field"><label htmlFor="new-user-name">Nombre</label><input id="new-user-name" maxLength={120} value={draft.displayName} onChange={e => setDraft({ ...draft, displayName: e.target.value })} /></div>
        <div className="users-field"><label htmlFor="new-user-email">Correo</label><input id="new-user-email" type="email" maxLength={254} value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></div>
        <div className="users-field"><label htmlFor="new-user-role">Rol</label><select id="new-user-role" value={draft.role} onChange={e => { const role = roles.find(value => value === e.target.value); if (role) setDraft({ ...draft, role }); }}>{roles.map(role => <option key={role} value={role}>{userRoleLabels[role]}</option>)}</select></div>
      </>}
      <button className="users-button" type="button" disabled={busy} onClick={() => { setOpen(false); setReview(false); setMessage(''); }}>Cancelar</button>
      {review && <button className="users-button" type="button" disabled={busy} onClick={() => setReview(false)}>Volver a editar</button>}
      <button className="users-button" type="button" disabled={busy || !draft.displayName.trim() || !draft.email.trim()} onClick={() => review ? void save() : setReview(true)}>{busy ? 'Guardando…' : review ? 'Confirmar alta' : 'Revisar alta'}</button>
    </>}
  </section>;
}
