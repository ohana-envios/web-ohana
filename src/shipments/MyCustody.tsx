import { useEffect, useState } from 'react';
import { ShipmentCustody } from './ShipmentCustody';

type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
type Item = { id: string; code: string };
export function MyCustody({ request }: { request: Request }) {
  const [items, setItems] = useState<Item[]>([]); const [selected, setSelected] = useState<Item | null>(null);
  const [page, setPage] = useState(1); const [pages, setPages] = useState(0); const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError('');
    request<{ items: Item[]; totalPages: number }>(`/api/shipments/custody/mine?page=${page}`, { signal: controller.signal }).then((result) => { setItems(result.items); setPages(result.totalPages); }).catch(() => { if (!controller.signal.aborted) { setItems([]); setError('No se pudieron cargar los paquetes bajo tu custodia.'); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [request, page, revision]);
  return <section className="panel"><h2>Paquetes bajo mi custodia</h2><p>Incluye los paquetes que tenés físicamente, aunque se haya asignado el envío a otro cadete.</p>
    {selected ? <><button type="button" onClick={() => setSelected(null)}>Volver a mis paquetes</button><h3>Envío {selected.code}</h3><ShipmentCustody id={selected.id} request={request} onUpdated={() => { setSelected(null); setPage(1); setRevision((n) => n + 1); }} /></> : <><button type="button" disabled={loading} onClick={() => setRevision((n) => n + 1)}>Actualizar paquetes</button>{error && <p role="alert">{error}</p>}{loading ? <p>Cargando…</p> : !error && (items.length ? <ul>{items.map((item) => <li key={item.id}>{item.code} <button type="button" onClick={() => setSelected(item)}>Gestionar custodia</button></li>)}</ul> : <p>No tenés paquetes bajo tu custodia.</p>)}<button type="button" disabled={loading || page <= 1} onClick={() => setPage((n) => n - 1)}>Anterior</button> Página {page} de {Math.max(1, pages)} <button type="button" disabled={loading || page >= pages} onClick={() => setPage((n) => n + 1)}>Siguiente</button></>}
  </section>;
}
