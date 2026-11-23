import { useEffect, useRef, useState } from 'react';
import type { RegistrationsSource } from './registrations';
export function InvitationClaim({ source }: { source: RegistrationsSource }) {
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null); useEffect(() => () => pending.current?.abort(), []);
  async function claim() { if (busy) return; const controller = new AbortController(); pending.current = controller; setBusy(true); setError('');
    try { await source.claimInvitation(code.trim(), controller.signal); if (!controller.signal.aborted) { setCode(''); setDone(true); } }
    catch { if (!controller.signal.aborted) setError('No se pudo usar la invitación. Verificá el código, su vigencia y que hayas ingresado con el correo indicado.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <section className="panel user-access-form"><h2>¿Tenés una invitación?</h2>
    {done ? <p role="status">Tu identidad quedó vinculada. Un administrador debe habilitar tu acceso.</p> : <><p>Ingresá con el correo verificado al que está destinada la invitación.</p>
      <div className="users-field"><label htmlFor="invitation-code">Código de invitación</label><input id="invitation-code" autoComplete="off" value={code} maxLength={43} onChange={e => setCode(e.target.value)} /></div>
      {error && <p role="alert">{error}</p>}<button className="users-button" type="button" disabled={busy || !code.trim()} onClick={() => void claim()}>{busy ? 'Vinculando…' : 'Vincular identidad'}</button></>}
  </section>;
}
