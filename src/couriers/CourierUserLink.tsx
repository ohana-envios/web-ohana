import { useState } from 'react';

type User = { id: string; displayName: string; email: string; enabled: boolean; role: string };
type Request = <T>(path: string, init?: RequestInit) => Promise<T>;

export function CourierUserLink({ courier, request, onChanged }: { courier: { id: string; userId: string | null; user: User | null }; request: Request; onChanged: () => void }) {
  const [search, setSearch] = useState(''); const [items, setItems] = useState<User[]>([]);
  const [page, setPage] = useState(1); const [pages, setPages] = useState(0);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function find(nextPage: number) {
    setBusy(true); setMessage('');
    try {
      const params = new URLSearchParams({ role: 'COURIER', status: 'all', search, page: String(nextPage), pageSize: '20' });
      const result = await request<{ items: User[]; totalPages: number }>(`/api/users?${params}`);
      setItems(result.items); setPage(nextPage); setPages(result.totalPages);
      if (!result.items.length) setMessage('No se encontraron cuentas de repartidor.');
    } catch { setMessage('No se pudieron cargar las cuentas.'); } finally { setBusy(false); }
  }
  async function link(userId: string | null) {
    if (!window.confirm(userId ? '¿Vincular esta cuenta a la ficha? Podrá consultar los envíos asignados.' : '¿Desvincular la cuenta de esta ficha?')) return;
    setBusy(true); setMessage('');
    try { await request(`/api/couriers/${encodeURIComponent(courier.id)}/user`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, expectedUserId: courier.userId }) }); onChanged(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo cambiar la cuenta.'); } finally { setBusy(false); }
  }
  return <section><h3>Cuenta del repartidor</h3><p>{courier.user ? `${courier.user.displayName} · ${courier.user.email}${courier.user.role !== 'COURIER' ? ' · rol distinto de repartidor' : ''}${courier.user.enabled ? '' : ' · acceso deshabilitado'}` : 'Esta ficha no tiene una cuenta vinculada.'}</p>
    {courier.userId && <button type="button" disabled={busy} onClick={() => void link(null)}>Desvincular cuenta</button>}
    <label>Buscar cuenta por nombre o correo<input value={search} maxLength={120} onChange={(event) => setSearch(event.target.value)} /></label> <button type="button" disabled={busy} onClick={() => void find(1)}>Buscar cuenta</button>
    {message && <p role="status">{message}</p>}<ul>{items.map((user) => <li key={user.id}>{user.displayName} · {user.email} · {user.enabled ? 'Habilitada' : 'Deshabilitada'} <button type="button" disabled={busy || user.id === courier.userId} onClick={() => void link(user.id)}>Vincular</button></li>)}</ul>
    {pages > 1 && <div><button type="button" disabled={busy || page <= 1} onClick={() => void find(page - 1)}>Anterior</button> Página {page} de {pages} <button type="button" disabled={busy || page >= pages} onClick={() => void find(page + 1)}>Siguiente</button></div>}
  </section>;
}
