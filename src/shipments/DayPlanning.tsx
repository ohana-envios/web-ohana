import { useEffect, useState } from 'react';
import { planningPayload, selectAssignment, type PlanningCourier, type PlanningDraft, type PlanningRow } from './planning-draft';

type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
type Row = PlanningRow & { status: string; assignedCourier: { displayName: string } | null };
type Data = { items: Row[]; totalPages: number; couriers: PlanningCourier[]; moreCouriers: boolean };
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

export function DayPlanning({ request }: { request: Request }) {
  const [date, setDate] = useState(today); const [page, setPage] = useState(1); const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState<PlanningDraft>({}); const [review, setReview] = useState(false);
  const [searchDraft, setSearchDraft] = useState(''); const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [revision, setRevision] = useState(0);
  useEffect(() => { if (!date) return; const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    request<Data>(`/api/shipments/planning/day?date=${encodeURIComponent(date)}&page=${page}&search=${encodeURIComponent(search)}`, { signal: controller.signal }).then(setData).catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar la jornada.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, page, search, request, revision]);
  const entries = Object.values(selected);
  function choose(row: Row, courierId: string) {
    const courier = data?.couriers.find((item) => item.id === courierId) ?? null;
    try { setSelected(selectAssignment(selected, row, courier)); setReview(false); setError(''); } catch { setError('Podés confirmar hasta 50 envíos a la vez.'); }
  }
  async function confirm() {
    if (!entries.length) return;
    setBusy(true); setError(''); setMessage('');
    try { await request('/api/shipments/planning/day', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, entries: planningPayload(selected) }) }); setSelected({}); setReview(false); setMessage('Jornada actualizada.'); setRevision((n) => n + 1); }
    catch { setError('No se guardó la jornada. Algún envío o cadete pudo cambiar: volvé a consultar y seleccioná de nuevo los afectados.'); } finally { setBusy(false); }
  }
  function changeDate(value: string) { if (entries.length && !window.confirm('Se perderá la selección sin confirmar. ¿Continuar?')) return; setSelected({}); setReview(false); setData(null); setDate(value); setPage(1); setMessage(''); }
  return <section className="panel"><h2>Planificar jornada</h2><p>Podés elegir envíos de distintas páginas y buscar varios cadetes antes de confirmar. La custodia no cambia.</p>
    <label>Fecha<input type="date" value={date} disabled={busy} onChange={(e) => changeDate(e.target.value)} /></label>
    <label>Buscar repartidor<input maxLength={120} value={searchDraft} disabled={busy} onChange={(e) => setSearchDraft(e.target.value)} /></label>
    <button type="button" disabled={loading || busy || !date} onClick={() => { if (search === searchDraft) setRevision((n) => n + 1); else setSearch(searchDraft); }}>Buscar repartidor</button>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}{loading && <p>Cargando…</p>}
    {data && <>{data.moreCouriers && <p>Hay más resultados; buscá por nombre.</p>}{data.items.length ? <ul>{data.items.map((row) => {
      const chosen = selected[row.id]; const visible = data.couriers.some((courier) => courier.id === chosen?.courierId);
      return <li key={row.id}><strong>{row.code}</strong> · {row.recipientName} · {row.plannedFor ? 'Planificado' : 'Sin planificar'}<p>Responsable actual: {row.assignedCourier?.displayName ?? 'Sin asignar'}</p>
        <label>Asignar a<select value={chosen?.courierId ?? ''} disabled={busy} onChange={(e) => choose(row, e.target.value)}><option value="">Sin cambios</option>{chosen && !visible && <option value={chosen.courierId}>{chosen.courierName} (seleccionado)</option>}{data.couriers.map((courier) => <option key={courier.id} value={courier.id}>{courier.displayName}</option>)}</select></label></li>;
    })}</ul> : <p>No hay envíos disponibles para esta jornada.</p>}
      <p><button type="button" disabled={busy || page <= 1} onClick={() => setPage(page - 1)}>Anterior</button> Página {page} de {Math.max(1, data.totalPages)} <button type="button" disabled={busy || page >= data.totalPages} onClick={() => setPage(page + 1)}>Siguiente</button></p></>}
    <h3>Selección para {date}</h3>{entries.length ? <ul>{entries.map((entry) => <li key={entry.id}>{entry.code} · {entry.recipientName} → {entry.courierName} <button type="button" disabled={busy} onClick={() => { setSelected(selectAssignment(selected, { ...entry, assignedCourierId: entry.expectedCourierId, plannedFor: entry.expectedPlannedFor }, null)); setReview(false); }}>Quitar</button></li>)}</ul> : <p>No hay envíos seleccionados.</p>}
    {entries.length > 0 && (review ? <><p>Se guardarán estas {entries.length} asignaciones juntas.</p><button type="button" disabled={busy} onClick={() => void confirm()}>{busy ? 'Guardando…' : 'Confirmar jornada'}</button> <button type="button" disabled={busy} onClick={() => setReview(false)}>Seguir editando</button></> : <button type="button" disabled={busy} onClick={() => setReview(true)}>Revisar {entries.length} seleccionados</button>)}
  </section>;
}
