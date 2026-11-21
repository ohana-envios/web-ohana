import { useEffect, useRef, useState } from 'react';
import type { UsersSource, UserSummary } from './types';
export function InvitationAction({ source, user }: { source: UsersSource; user: UserSummary }) {
  const [invitation, setInvitation] = useState<{ code: string; expiresAt: string } | null>(null);
  const [error, setError] = useState(''); const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null); useEffect(() => () => pending.current?.abort(), []);
  if (!source.issueInvitation || user.role === 'CUSTOMER' || user.enabled) return null;
  async function issue() {
    if (busy || !source.issueInvitation) return; const controller = new AbortController(); pending.current = controller; setBusy(true); setError(''); setInvitation(null);
    try { const result = await source.issueInvitation(user.id, controller.signal); if (!controller.signal.aborted) { setInvitation(result); setConfirm(false); } }
    catch { if (!controller.signal.aborted) setError('No se pudo generar. Verificá que la cuenta esté deshabilitada y todavía no tenga una identidad vinculada.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <div><button className="users-button" type="button" disabled={busy} onClick={() => setConfirm(true)}>Generar invitación</button>
    {confirm && <div><p>Al generar otra invitación, las anteriores dejan de funcionar.</p><button className="users-button" type="button" disabled={busy} onClick={() => void issue()}>Confirmar</button><button className="users-button" type="button" disabled={busy} onClick={() => setConfirm(false)}>Cancelar</button></div>}
    {error && <p role="alert">{error}</p>}
    {invitation && <div role="status"><p>Compartí este código de forma segura con {user.displayName}. Vence: {new Date(invitation.expiresAt).toLocaleString('es-UY')}.</p><p><strong>{invitation.code}</strong></p><p>Se muestra solo ahora. La persona debe entrar con su correo verificado; después un administrador habilita el acceso.</p></div>}
  </div>;
}
