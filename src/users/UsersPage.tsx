import { useEffect, useRef, useState } from 'react';
import { InvitationAction } from './InvitationAction';
import { InternalUserForm } from './InternalUserForm';
import { UserAccessForm } from './UserAccessForm';
import { userRoleLabels, userRoles } from './types';
import type { UserAccessChange, UserList, UserListQuery, UserSummary, UsersSource } from './types';
import './users.css';

type ListState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; result: UserList };

export function UsersPage({ source, pageSize = 20, preview = false }: { source: UsersSource; pageSize?: number; preview?: boolean }) {
  const [query, setQuery] = useState<UserListQuery>({ search: '', role: 'all', status: 'all', page: 1, pageSize });
  const [state, setState] = useState<ListState>({ kind: 'loading' });
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<UserSummary | null>(null);
  const [change, setChange] = useState<UserAccessChange | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const returning = useRef(false);
  useEffect(() => {
    if (!selected && returning.current) { heading.current?.focus(); returning.current = false; }
  }, [selected]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    source.list(query, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, result.totalPages);
        if (query.page > lastPage) setQuery((current) => ({ ...current, page: lastPage }));
        else setState({ kind: 'ready', result });
      })
      .catch(() => { if (!controller.signal.aborted) setState({ kind: 'error' }); });
    return () => controller.abort();
  }, [query, source, retry]);

  const filtered = Boolean(query.search || query.role !== 'all' || query.status !== 'all');
  if (selected) return <UserAccessForm key={selected.id} user={selected} source={source} preview={preview} onReload={() => { setSelected(null); setRetry((value) => value + 1); }}
    onCancel={() => { returning.current = true; setSelected(null); }}
    onSaved={(saved) => { setChange(saved); returning.current = true; setSelected(null); setRetry((value) => value + 1); }} />;

  return <section className="users-directory" aria-labelledby="users-heading">
    <div className="users-heading"><span className="eyebrow">DIRECTORIO DE ACCESO</span>
      <h2 id="users-heading" tabIndex={-1} ref={heading}>Usuarios y roles</h2><p>Consultá las cuentas de usuario y su estado de acceso.</p>
    </div>
    <InternalUserForm source={source} onCreated={() => setRetry(value => value + 1)} />
    {change && <aside className="panel user-access-evidence" role="status">
      <strong>Acceso actualizado{preview ? ' en la vista previa' : ''}: {change.user.displayName}</strong>
      {(change.audit || change.previewAudit) && <>
        <p>{preview ? 'Registro temporal' : 'Registro de auditoría'} · Responsable: {(change.audit || change.previewAudit)!.actorId} · {new Date((change.audit || change.previewAudit)!.occurredAt).toLocaleString('es-UY')}</p>
        <p>{userRoleLabels[(change.audit || change.previewAudit)!.previous.role]} → {userRoleLabels[(change.audit || change.previewAudit)!.next.role]} · {(change.audit || change.previewAudit)!.previous.enabled ? 'Habilitado' : 'Deshabilitado'} → {(change.audit || change.previewAudit)!.next.enabled ? 'Habilitado' : 'Deshabilitado'}</p>
      </>}
      {preview && <p>Los cambios y este registro son de prueba; no se guardan en la API.</p>}
    </aside>}
    {!preview && <p>La habilitación inicial se realiza desde Clientes pendientes. Las cuentas de clientes ya aprobados pueden habilitarse o deshabilitarse aquí.</p>}
    <div className="panel users-filters">
      <div className="users-field"><label htmlFor="user-search">Buscar usuario</label>
        <input id="user-search" type="search" value={query.search} maxLength={120} placeholder="Nombre o email"
          onChange={(event) => setQuery({ ...query, search: event.target.value, page: 1 })} />
      </div>
      <div className="users-field"><label htmlFor="user-role">Rol</label>
        <select id="user-role" value={query.role} onChange={(event) => {
          const role = event.target.value;
          if (role === 'all' || userRoles.some((value) => value === role)) setQuery({ ...query, role: role as UserListQuery['role'], page: 1 });
        }}><option value="all">Todos los roles</option>{userRoles.map((role) => <option key={role} value={role}>{userRoleLabels[role]}</option>)}</select>
      </div>
      <div className="users-field"><label htmlFor="user-status">Estado de acceso</label>
        <select id="user-status" value={query.status} onChange={(event) => {
          const status = event.target.value;
          if (status === 'all' || status === 'enabled' || status === 'disabled') setQuery({ ...query, status, page: 1 });
        }}><option value="all">Todos los estados</option><option value="enabled">Acceso habilitado</option><option value="disabled">Acceso deshabilitado</option></select>
      </div>
    </div>
    <p className="users-result-count" aria-live="polite" aria-atomic="true">
      {state.kind === 'loading' ? 'Buscando usuarios…' : state.kind === 'error' ? 'Consulta no disponible' : `${state.result.total} ${state.result.total === 1 ? 'usuario encontrado' : 'usuarios encontrados'}`}
    </p>
    {state.kind === 'loading' && <div className="panel users-loading" aria-busy="true" aria-label="Cargando usuarios"><div /><div /><div /></div>}
    {state.kind === 'error' && <div className="panel users-message" role="alert">
      <h3>No se pudo cargar el listado</h3><p>Volvé a intentar para consultar los usuarios.</p>
      <button className="users-button" type="button" onClick={() => setRetry((value) => value + 1)}>Reintentar</button>
    </div>}
    {state.kind === 'ready' && <>
      {state.result.items.length === 0 ? <div className="panel users-message" role="status">
        <h3>{filtered ? 'No hay usuarios que coincidan' : 'Todavía no hay usuarios para mostrar'}</h3>
        <p>{filtered ? 'Probá otra búsqueda o cambiá los filtros.' : 'Los usuarios aparecerán cuando estén registrados.'}</p>
        {filtered && <button className="users-button" type="button" onClick={() => setQuery({ ...query, search: '', role: 'all', status: 'all', page: 1 })}>Limpiar filtros</button>}
      </div> : <ul className="users-list">{state.result.items.map((user) => <li key={user.id} className="panel user-row">
        <div className="user-identity"><h3>{user.displayName}</h3><p>{user.email}</p></div>
        <div><span className="user-label">Rol</span><span className="user-role">{userRoleLabels[user.role]}</span></div>
        <span className={`user-status ${user.enabled ? 'is-enabled' : 'is-disabled'}`}><span aria-hidden="true">{user.enabled ? '●' : '○'}</span>{user.enabled ? 'Acceso habilitado' : 'Acceso deshabilitado'}</span>
        <InvitationAction source={source} user={user} />
        {source.updateAccess && <button type="button" className="users-button user-access-action" aria-label={`Administrar acceso de ${user.displayName}`} onClick={() => setSelected(user)}>Administrar acceso</button>}
      </li>)}</ul>}
      {state.result.totalPages > 1 && <nav className="users-pagination" aria-label="Páginas de usuarios">
        <button type="button" className="users-button" disabled={query.page === 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Anterior</button>
        <span>Página {state.result.page} de {state.result.totalPages}</span>
        <button type="button" className="users-button" disabled={query.page >= state.result.totalPages} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Siguiente</button>
      </nav>}
    </>}
  </section>;
}
