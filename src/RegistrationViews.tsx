import { useEffect, useRef, useState } from 'react';
import type { PendingPage, RegistrationDraft, RegistrationsSource } from './registrations';

export function RegistrationForm({ source }: { source: RegistrationsSource }) {
  const [draft, setDraft] = useState<RegistrationDraft>({ displayName: '', type: 'PERSON', phone: '' });
  const [review, setReview] = useState(false); const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false); const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function submit() { if (busy) return; setBusy(true); setError(''); const pending = new AbortController(); controller.current = pending;
    try { await source.register(draft, pending.signal); if (!pending.signal.aborted) setDone(true); }
    catch { if (!pending.signal.aborted) setError('No se pudo completar la solicitud. Revisá los datos o contactá a Ohana.'); }
    finally { if (!pending.signal.aborted) setBusy(false); }
  }
  if (done) return <section className="panel"><h2>Solicitud enviada</h2><p>Tu registro está pendiente de revisión. Podrás operar cuando se habilite tu cuenta.</p></section>;
  return <section className="panel user-access-form"><h2>Solicitar alta de cliente</h2><p>Usaremos el correo verificado de tu cuenta. El acceso queda pendiente hasta que Ohana lo habilite.</p>
    {review ? <><p>Nombre: {draft.displayName}</p><p>Tipo: {draft.type === 'PERSON' ? 'Persona' : 'Empresa'}</p><p>Teléfono: {draft.phone || 'Sin informar'}</p></> : <>
      <div className="users-field"><label htmlFor="registration-name">Nombre o razón comercial</label><input id="registration-name" maxLength={120} value={draft.displayName} onChange={e => setDraft({ ...draft, displayName: e.target.value })} /></div>
      <div className="users-field"><label htmlFor="registration-type">Tipo de cliente</label><select id="registration-type" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value === 'COMPANY' ? 'COMPANY' : 'PERSON' })}><option value="PERSON">Persona</option><option value="COMPANY">Empresa</option></select></div>
      <div className="users-field"><label htmlFor="registration-phone">Teléfono (opcional)</label><input id="registration-phone" type="tel" maxLength={40} value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} /></div>
    </>}
    {error && <p role="alert">{error}</p>}
    {review && <button className="users-button" type="button" disabled={busy} onClick={() => setReview(false)}>Volver a editar</button>}
    <button className="users-button" type="button" disabled={busy || !draft.displayName.trim()} onClick={() => review ? void submit() : setReview(true)}>{busy ? 'Enviando…' : review ? 'Confirmar solicitud' : 'Revisar solicitud'}</button>
  </section>;
}

export function PendingRegistrations({ source }: { source: RegistrationsSource }) {
  const [page, setPage] = useState(1); const [version, setVersion] = useState(0);
  const [data, setData] = useState<PendingPage | null>(null); const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { const controller = new AbortController(); setData(null); setError('');
    source.list(page, controller.signal).then(value => { if (!controller.signal.aborted) { if (page > Math.max(1, value.totalPages)) setPage(Math.max(1, value.totalPages)); else setData(value); } }).catch(() => { if (!controller.signal.aborted) setError('No se pudieron cargar las solicitudes.'); });
    return () => controller.abort();
  }, [source, page, version]);
  async function approve(id: string) { if (busy) return; setBusy(true); setError('');
    try { await source.approve(id, new AbortController().signal); setSelected(null); setVersion(n => n + 1); }
    catch { setError('No se pudo habilitar. Es posible que la solicitud haya cambiado; recargá la lista.'); }
    finally { setBusy(false); }
  }
  return <section className="panel user-access-form"><h2>Clientes pendientes</h2>
    {error && <p role="alert">{error} <button className="users-button" type="button" onClick={() => setVersion(n => n + 1)}>Recargar</button></p>}
    {!data && !error && <p>Cargando solicitudes…</p>}{data && data.items.length === 0 && <p>No hay solicitudes pendientes.</p>}
    {data?.items.map(item => <article key={item.id}><h3>{item.customer.displayName}</h3><p>{item.customer.type === 'PERSON' ? 'Persona' : 'Empresa'} · {item.customer.email} · {item.customer.phone || 'Sin teléfono'}</p>
      {selected === item.id ? <><p>¿Confirmás la habilitación de este cliente y su acceso?</p><button className="users-button" type="button" disabled={busy} onClick={() => void approve(item.id)}>Confirmar habilitación</button><button className="users-button" type="button" disabled={busy} onClick={() => setSelected(null)}>Cancelar</button></> : <button className="users-button" type="button" onClick={() => setSelected(item.id)}>Revisar habilitación</button>}</article>)}
    {data && data.totalPages > 1 && <nav aria-label="Páginas de solicitudes"><button className="users-button" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button> Página {page} de {data.totalPages} <button className="users-button" type="button" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Siguiente</button></nav>}
  </section>;
}
