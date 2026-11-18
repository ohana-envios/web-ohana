import { useEffect, useRef, useState } from 'react';
import { userRoleLabels, userRoles } from './types';
import type { UserAccessChange, UserAccessDraft, UserSummary, UsersSource } from './types';

export function UserAccessForm({ user, source, onSaved, onCancel, onReload, preview = false }: {
  preview?: boolean; onReload: () => void; user: UserSummary; source: UsersSource; onSaved: (change: UserAccessChange) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState<UserAccessDraft>({ role: user.role, enabled: user.enabled });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => { heading.current?.focus(); }, [confirming]);
  useEffect(() => () => pending.current?.abort(), []);
  const unchanged = user.role === draft.role && user.enabled === draft.enabled;
  async function save() {
    if (busy || !source.updateAccess) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    try { const change = await source.updateAccess(user.id, draft, controller.signal, user); if (!controller.signal.aborted) onSaved(change); }
    catch (failure) { if (!controller.signal.aborted) { if (typeof failure === 'object' && failure !== null && 'status' in failure && failure.status === 409) { setConflict(true); setError('No se pudo aplicar el cambio. La cuenta puede haber cambiado o el cambio no está permitido. Recargá el listado.'); } else setError(failure instanceof Error ? failure.message : 'No se pudo actualizar el acceso. Podés reintentar.'); } }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <section className="panel user-access-form" aria-labelledby="access-heading">
    <h2 id="access-heading" tabIndex={-1} ref={heading}>{confirming ? 'Confirmar cambio de acceso' : 'Administrar acceso'}</h2>
    <p><strong>{user.displayName}</strong><br />{user.email}</p>
    <p>{preview ? 'Esta vista modifica cuentas ficticias ya existentes.' : 'Esta operación modifica el acceso de una cuenta existente.'} La aprobación inicial de clientes corresponde a otro flujo.</p>
    {confirming ? <>
      <dl><dt>Rol</dt><dd>{userRoleLabels[user.role]} → {userRoleLabels[draft.role]}</dd>
        <dt>Acceso</dt><dd>{user.enabled ? 'Habilitado' : 'Deshabilitado'} → {draft.enabled ? 'Habilitado' : 'Deshabilitado'}</dd></dl>
      <p>{draft.enabled ? 'La cuenta tendrá acceso habilitado.' : 'La cuenta quedará sin acceso operativo; su información se conserva.'} {preview && 'Este cambio es una simulación.'} La ficha comercial del cliente no cambia.</p>
    </> : <>
      <div className="users-field"><label htmlFor="access-role">Rol de la cuenta</label>
        <select id="access-role" value={draft.role} onChange={(event) => {
          const role = userRoles.find((item) => item === event.target.value);
          if (role) setDraft({ ...draft, role });
        }}>{userRoles.filter((role) => preview || (user.role === 'CUSTOMER' ? role === 'CUSTOMER' : role !== 'CUSTOMER')).map((role) => <option key={role} value={role}>{userRoleLabels[role]}</option>)}</select></div>
      <label className="user-access-toggle"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />Acceso habilitado</label>
    </>}
    {error && <p role="alert">{error}</p>}
    {conflict && <button className="users-button" type="button" onClick={onReload}>Recargar listado</button>}
    <div className="user-access-actions">
      <button className="users-button" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
      {confirming && <button className="users-button" type="button" disabled={busy} onClick={() => { setConfirming(false); setError(''); }}>Volver a editar</button>}
      <button className="users-button" type="button" disabled={busy || unchanged || conflict} onClick={() => confirming ? void save() : setConfirming(true)}>{busy ? 'Guardando…' : confirming ? 'Confirmar cambio' : 'Revisar cambio'}</button>
    </div>
  </section>;
}
