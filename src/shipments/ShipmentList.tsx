import { useEffect, useState, type FormEvent } from 'react';
import { ShipmentHistory } from './ShipmentHistory';
import { ShipmentAssignment } from './ShipmentAssignment';
import { ShipmentCustody } from './ShipmentCustody';
import { ShipmentPickup } from './ShipmentPickup';
import { directShipmentCode } from './code-search';
import { shipmentStatuses as statuses } from './statuses';
import { ShipmentLabel } from './ShipmentLabel';

type Summary = { id: string; code: string; recipientName: string; status: string; priority: string; createdAt: string; customer: { displayName: string } };
type Detail = Summary & { senderName: string; recipientPhone: string | null; pickupStreet: string; pickupNumber: string; pickupLocality: string; pickupDepartment: string; deliveryStreet: string; deliveryNumber: string; deliveryLocality: string; deliveryDepartment: string; requestedPickupAt: string | null; requestedDeliveryAt: string | null; receipt: { id: string; version: number } | null; assignedCourier?: { id: string; displayName: string } | null; packages: { description: string | null }[]; notes?: string | null };
type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
const empty = { code: '', customer: '', recipient: '', responsible: '', status: '', priority: '', from: '', to: '' };

export function ShipmentList({ request, downloadReceipt, own = false, readOnly = false, canChangeStatus = false, onCustodyUpdated }: { request: Request; downloadReceipt: (id: string) => Promise<void>; own?: boolean; readOnly?: boolean; canChangeStatus?: boolean; onCustodyUpdated?: () => void }) {
  const [draft, setDraft] = useState(empty); const [query, setQuery] = useState(empty); const [page, setPage] = useState(1);
  const [items, setItems] = useState<Summary[]>([]); const [pages, setPages] = useState(0); const [detail, setDetail] = useState<Detail | null>(null);
  const [uploading, setUploading] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [statusObservation, setStatusObservation] = useState('');
  const [historyRevision, setHistoryRevision] = useState(0);
  const [directResult, setDirectResult] = useState(false);
  async function uploadReceipt(item: Detail, file: File) {
    if (file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) { setError('Elegí un PDF, PNG o JPG de hasta 5 MB.'); return; }
    if (item.receipt && !window.confirm('¿Reemplazar el comprobante? El anterior quedará conservado en el historial.')) return;
    const body = new FormData(); body.append('receipt', file); if (item.receipt) body.append('version', String(item.receipt.version));
    setUploading(true); setError('');
    try { const result = await request<{ receipt: { id: string; version: number } }>(`/api/shipments/${encodeURIComponent(item.id)}/receipt`, { method: item.receipt ? 'PATCH' : 'POST', body }); setDetail({ ...item, receipt: result.receipt }); setHistoryRevision((v) => v + 1); }
    catch { setError('No se pudo guardar el comprobante. Recargá el envío e intentá de nuevo.'); } finally { setUploading(false); }
  }
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    const params = new URLSearchParams({ page: String(page) });
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, key === 'from' || key === 'to' ? new Date(value).toISOString() : value);
    request<{ items: Summary[]; totalPages: number }>(`/api/shipments?${params}`, { signal: controller.signal }).then((result) => { setItems(result.items); setPages(result.totalPages); }).catch(() => { if (!controller.signal.aborted) { setItems([]); setPages(0); setError('No se pudieron cargar los envíos.'); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request, query, page]);
  async function changeStatus(item: Detail, status: 'IN_ROUTE' | 'IN_DEPOT') {
    if (!window.confirm(`¿Marcar como ${statuses[status]}? Esto no registra una transferencia de custodia.`)) return;
    setChangingStatus(true); setError('');
    try { await request(`/api/shipments/${encodeURIComponent(item.id)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, expectedStatus: item.status, observation: statusObservation }) }); setDetail({ ...item, status }); setItems((items) => items.map((entry) => entry.id === item.id ? { ...entry, status } : entry)); setStatusObservation(''); setHistoryRevision((v) => v + 1); }
    catch { setError('No se pudo cambiar el estado. Recargá el envío e intentá de nuevo.'); } finally { setChangingStatus(false); }
  }
  async function cancelShipment(item: Detail) {
    if (!cancelReason.trim() || !window.confirm('¿Confirmás la cancelación de este envío?')) return;
    setChangingStatus(true); setError('');
    try { await request(`/api/shipments/${encodeURIComponent(item.id)}/cancel`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedStatus: item.status, reason: cancelReason }) }); setDetail({ ...item, status: 'CANCELED' }); setItems((items) => items.map((entry) => entry.id === item.id ? { ...entry, status: 'CANCELED' } : entry)); setCancelReason(''); setHistoryRevision((v) => v + 1); }
    catch { setError('No se pudo cancelar. Revisá el estado y recargá el envío.'); } finally { setChangingStatus(false); }
  }
  async function open(id: string) {
    setError(''); setCancelReason(''); setStatusObservation(''); setLoading(true);
    try { setDetail(await request<Detail>(`/api/shipments/${encodeURIComponent(id)}`)); }
    catch { setError('No se pudo cargar el envío.'); } finally { setLoading(false); }
  }
  async function search(event: FormEvent) {
    event.preventDefault();
    if (draft.from && draft.to && new Date(draft.from) > new Date(draft.to)) { setError('La fecha inicial debe ser anterior a la final.'); return; }
    const code = directShipmentCode(draft);
    if (!code) { setDirectResult(false); setPage(1); setQuery({ ...draft }); return; }
    setDirectResult(true); setLoading(true); setError(''); setItems([]); setPages(0);
    try { const found = await request<Detail>(`/api/shipments/by-code/${encodeURIComponent(code)}`); setItems([found]); setPages(1); setDetail(found); }
    catch (reason) { setError(typeof reason === 'object' && reason !== null && 'status' in reason && reason.status === 404 ? 'No se encontraron envíos.' : 'No se pudo realizar la búsqueda.'); }
    finally { setLoading(false); }
  }
  if (detail) return <section className="panel"><button type="button" onClick={() => setDetail(null)}>Volver a los envíos</button><h2>Envío {detail.code}</h2>
    <p>Estado: {statuses[detail.status] ?? detail.status} · Prioridad: {detail.priority === 'HIGH' ? 'Alta' : 'Normal'}</p><p>Cliente: {detail.customer.displayName} · Remitente: {detail.senderName}</p><p>Destinatario: {detail.recipientName} · {detail.recipientPhone || 'Sin teléfono'}</p>
    {!own && !readOnly && ['PENDING', 'ASSIGNED'].includes(detail.status) && <section><label>Motivo de cancelación<input maxLength={500} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} /></label><button type="button" disabled={changingStatus || !cancelReason.trim()} onClick={() => void cancelShipment(detail)}>Cancelar envío antes del retiro</button></section>}
    {canChangeStatus && ['PICKED_UP', 'IN_ROUTE', 'IN_DEPOT'].includes(detail.status) && <div><p>Cambiar estado operativo (no modifica la custodia).</p><label>Observación opcional<input maxLength={1000} value={statusObservation} onChange={(e) => setStatusObservation(e.target.value)} /></label>{detail.status !== 'IN_ROUTE' && <button type="button" disabled={changingStatus} onClick={() => void changeStatus(detail, 'IN_ROUTE')}>Marcar en ruta</button>}{detail.status !== 'IN_DEPOT' && <button type="button" disabled={changingStatus} onClick={() => void changeStatus(detail, 'IN_DEPOT')}>Marcar en depósito</button>}</div>}
    {!readOnly && <ShipmentLabel key={detail.id} id={detail.id} request={request} />}
    {own && canChangeStatus && detail.status === 'ASSIGNED' && <ShipmentPickup key={detail.id} id={detail.id} request={request} onComplete={() => { setDetail({ ...detail, status: 'PICKED_UP' }); setItems((items) => items.map((item) => item.id === detail.id ? { ...item, status: 'PICKED_UP' } : item)); setHistoryRevision((v) => v + 1); onCustodyUpdated?.(); }} />}
    {canChangeStatus && <ShipmentCustody key={`${detail.id}-${historyRevision}`} id={detail.id} request={request} onUpdated={() => { setHistoryRevision((v) => v + 1); onCustodyUpdated?.(); }} />}
    <p>Retiro: {detail.pickupStreet} {detail.pickupNumber}, {detail.pickupLocality}, {detail.pickupDepartment}</p><p>Entrega: {detail.deliveryStreet} {detail.deliveryNumber}, {detail.deliveryLocality}, {detail.deliveryDepartment}</p><p>Paquete: {detail.packages.map((item) => item.description).filter(Boolean).join(', ') || 'Sin descripción'}</p>
    <p>Registrado: {new Date(detail.createdAt).toLocaleString('es-UY')} · Retiro solicitado: {detail.requestedPickupAt ? new Date(detail.requestedPickupAt).toLocaleString('es-UY') : 'Sin indicar'} · Entrega solicitada: {detail.requestedDeliveryAt ? new Date(detail.requestedDeliveryAt).toLocaleString('es-UY') : 'Sin indicar'}</p>{!own && detail.notes && <p>Observaciones: {detail.notes}</p>}{!readOnly && <>{detail.receipt && <button type="button" onClick={() => void downloadReceipt(detail.id).catch(() => setError('No se pudo descargar el comprobante.'))}>Descargar comprobante</button>}<label>{detail.receipt ? 'Reemplazar comprobante' : 'Adjuntar comprobante'} (PDF, PNG o JPG, hasta 5 MB)<input type="file" disabled={uploading} accept="application/pdf,image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadReceipt(detail, file); }} /></label><p>Adjuntar un comprobante no confirma el pago.</p>{!own && <ShipmentAssignment id={detail.id} current={detail.assignedCourier ?? null} request={request} onUpdated={() => { void open(detail.id); setHistoryRevision((v) => v + 1); }} />}<ShipmentHistory id={detail.id} request={request} revision={historyRevision} basic={own} /></>}{readOnly && !own && <ShipmentHistory id={detail.id} request={request} revision={historyRevision} />}{error && <p role="alert">{error}</p>}</section>;
  return <section className="panel"><h2>{own ? 'Mis envíos' : 'Consultar envíos'}</h2><form onSubmit={(event: FormEvent) => void search(event)}>
    {([['code', 'Código'], ...(!own ? [['customer', 'Cliente'], ['responsible', 'Repartidor']] as const : []), ['recipient', 'Destinatario']] as const).map(([key, label]) => <label key={key}>{label}<input maxLength={120} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
    <label>Estado<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">Todos</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label>Prioridad<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option value="">Todas</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option></select></label>
    <label>Registrado desde<input type="datetime-local" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></label><label>Registrado hasta<input type="datetime-local" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></label>
    <button type="submit" disabled={loading}>Buscar</button> <button type="button" disabled={loading} onClick={() => { setDirectResult(false); setDraft(empty); setQuery({ ...empty }); setPage(1); setError(''); }}>Limpiar filtros</button>
  </form>{error && <p role="alert">{error}</p>}{loading ? <p>Cargando…</p> : items.length === 0 ? (!error && <p>No se encontraron envíos.</p>) : <ul>{items.map((item) => <li key={item.id}><strong>{item.code}</strong> · {item.recipientName} · {statuses[item.status] ?? item.status} <button type="button" onClick={() => void open(item.id)}>Ver detalle</button></li>)}</ul>}
    <button type="button" disabled={directResult || page <= 1} onClick={() => setPage(page - 1)}>Anterior</button> Página {directResult ? 1 : page} de {Math.max(1, pages)} <button type="button" disabled={directResult || page >= pages} onClick={() => setPage(page + 1)}>Siguiente</button>
  </section>;
}
