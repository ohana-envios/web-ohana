import { useEffect, useState, type FormEvent } from 'react';
import { CourierUserLink } from './CourierUserLink';

type Courier = { id: string; displayName: string; active: boolean; available: boolean; vehicle: string | null; capacity: string | null; workingHours: string | null; notes: string | null; version: number; activeAssignmentCount: number; userId: string | null; user: { id: string; displayName: string; email: string; enabled: boolean; role: string } | null };
type Draft = { displayName: string; active: boolean; available: boolean; vehicle: string; capacity: string; workingHours: string; notes: string };
type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
const blank: Draft = { displayName: '', active: true, available: true, vehicle: '', capacity: '', workingHours: '', notes: '' };

export function CouriersPage({ request }: { request: Request }) {
  const [items, setItems] = useState<Courier[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Courier | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [duplicates, setDuplicates] = useState<Courier[]>([]);
  const [duplicateName, setDuplicateName] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    request<{ items: Courier[]; totalPages: number }>(`/api/couriers?${new URLSearchParams({ search, page: String(page) })}`, { signal: controller.signal })
      .then((result) => { setItems(result.items); setPages(result.totalPages); setMessage(''); })
      .catch(() => { if (!controller.signal.aborted) setMessage('No se pudo cargar la lista.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request, search, page, revision]);
  function edit(courier: Courier) {
    setSelected(courier); setEditing(true); setMessage('');
    setDraft({ displayName: courier.displayName, active: courier.active, available: courier.available, vehicle: courier.vehicle ?? '', capacity: courier.capacity ?? '', workingHours: courier.workingHours ?? '', notes: courier.notes ?? '' });
  }
  async function save(event: FormEvent, reviewed = false) {
    event.preventDefault();
    const reducing = selected && ((selected.active && !draft.active) || (selected.available && !draft.available));
    if (reducing && !window.confirm(selected.activeAssignmentCount ? `Este repartidor tiene ${selected.activeAssignmentCount} tarea(s) activas. ¿Querés continuar?` : '¿Querés cambiar la disponibilidad o desactivar esta ficha?')) return;
    setBusy(true); setMessage('');
    try {
      if (!selected || selected.displayName.trim().toLowerCase() !== draft.displayName.trim().toLowerCase()) {
        const query = new URLSearchParams({ name: draft.displayName.trim(), ...(selected ? { exclude: selected.id } : {}) });
        const result = await request<{ possibleDuplicate: boolean; matches: Courier[] }>(`/api/couriers/possible-duplicate?${query}`);
        if (result.possibleDuplicate && (!reviewed || duplicateName !== draft.displayName.trim().toLowerCase())) { setDuplicates(result.matches); setDuplicateName(draft.displayName.trim().toLowerCase()); return; }
      }
      await request<Courier>(selected ? `/api/couriers/${encodeURIComponent(selected.id)}` : '/api/couriers', { method: selected ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, ...(selected ? { version: selected.version, ...(reducing ? { confirmedActiveAssignments: selected.activeAssignmentCount } : {}) } : {}) }) });
      setDuplicates([]); setEditing(false); setSelected(null); setRevision((v) => v + 1);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar la ficha.'); }
    finally { setBusy(false); }
  }
  return <section className="panel"><h2>Repartidores</h2><p>Administrá la información del equipo para la planificación.</p>
    {message && <p role="alert">{message}</p>}
    {editing && duplicates.length > 0 && duplicateName === draft.displayName.trim().toLowerCase() && <div role="alert"><h3>Revisá las fichas con el mismo nombre</h3>{duplicates.map((item) => <p key={item.id}>{item.displayName} · {item.active ? 'Activo' : 'Inactivo'} · {item.available ? 'Disponible' : 'No disponible'} · Vehículo: {item.vehicle || 'sin indicar'} · Horario: {item.workingHours || 'sin indicar'} · {item.notes || 'sin observaciones'}</p>)}<p>Si corresponde a otra persona, podés guardar igualmente.</p><button type="button" disabled={busy} onClick={(event) => void save(event as unknown as FormEvent, true)}>Guardar igualmente</button></div>}
    {editing ? <><form onSubmit={(event) => void save(event)} className="form-grid">
      {([['displayName', 'Nombre', 120], ['vehicle', 'Vehículo', 120], ['capacity', 'Capacidad', 120], ['workingHours', 'Horario de trabajo', 120], ['notes', 'Observaciones', 1000]] as const).map(([key, label, max]) => <label key={key}>{label}<input value={draft[key]} maxLength={max} required={key === 'displayName'} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
      <label><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Ficha activa</label>
      <label><input type="checkbox" checked={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.checked })} /> Disponible</label>
      <div><button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button> <button type="button" disabled={busy} onClick={() => setEditing(false)}>Cancelar</button></div>
    </form>{selected && <CourierUserLink courier={selected} request={request} onChanged={() => { setSelected(null); setEditing(false); setRevision((value) => value + 1); setMessage('Cuenta actualizada.'); }} />}</> : <><button type="button" onClick={() => { setSelected(null); setDraft(blank); setEditing(true); setMessage(''); }}>Agregar repartidor</button>
      <label>Buscar por nombre<input value={search} maxLength={120} onChange={(event) => { setPage(1); setSearch(event.target.value); }} /></label>
      {loading ? <p>Cargando…</p> : items.length === 0 ? <p>No hay repartidores para mostrar.</p> : <ul>{items.map((item) => <li key={item.id}><strong>{item.displayName}</strong> · {!item.active ? 'Inactivo' : item.available ? 'Disponible' : 'No disponible'} <button type="button" onClick={() => edit(item)}>Ver o editar</button></li>)}</ul>}
      <div><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button> Página {page} de {Math.max(pages, 1)} <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</button></div>
    </>}
  </section>;
}
