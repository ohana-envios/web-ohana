import { useEffect, useRef, useState } from 'react';
import { CustomerDetail } from './CustomerDetail';
import { CustomerStatus } from './CustomerStatus';
import type { CustomerList, CustomerListQuery, CustomersSource } from './types';
import './customers.css';

type ListState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; result: CustomerList };

export function CustomersPage({ source, pageSize = 20, preview = false }: { source?: CustomersSource; pageSize?: number; preview?: boolean }) {
  if (!source) return <section className="panel customer-message">
    <span className="eyebrow">GESTIÓN DE CLIENTES</span>
    <h2>Consulta de clientes en preparación</h2>
    <p>El listado estará disponible cuando se complete la conexión y los permisos de acceso.</p>
    {import.meta.env.DEV && <a className="customer-link" href="/customers-preview.html">Abrir vista previa con datos ficticios →</a>}
  </section>;
  return <CustomerBrowser source={source} pageSize={pageSize} preview={preview} />;
}

function CustomerBrowser({ source, pageSize, preview }: { source: CustomersSource; pageSize: number; preview: boolean }) {
  const [query, setQuery] = useState<CustomerListQuery>({ search: '', status: 'all', page: 1, pageSize });
  const [state, setState] = useState<ListState>({ kind: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const returning = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    source.list(query, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, result.totalPages);
        if (query.page > lastPage) {
          setQuery((current) => ({ ...current, page: lastPage }));
          return;
        }
        setState({ kind: 'ready', result });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: 'error' });
      });
    return () => controller.abort();
  }, [query, source, retry]);

  useEffect(() => {
    if (!selectedId && returning.current) {
      heading.current?.focus();
      returning.current = false;
    }
  }, [selectedId]);

  if (selectedId) return <CustomerDetail id={selectedId} source={source} preview={preview} onUpdated={() => setRetry((value) => value + 1)} onBack={() => {
    returning.current = true;
    setSelectedId(null);
  }} />;

  return <section className="customers" aria-labelledby="customers-heading">
    <div className="customer-section-heading"><div><span className="eyebrow">DIRECTORIO</span>
      <h2 id="customers-heading" ref={heading} tabIndex={-1}>Clientes y direcciones</h2>
      <p className="customer-muted">Consultá los datos de contacto y los lugares habituales de retiro.</p>
    </div></div>
    <div className="panel customer-filters">
      <div className="customer-field"><label htmlFor="customer-search">Buscar cliente</label>
        <input id="customer-search" type="search" maxLength={120} placeholder="Nombre, documento, email o teléfono" value={query.search}
          onChange={(event) => setQuery({ ...query, search: event.target.value, page: 1 })} />
      </div>
      <div className="customer-field"><label htmlFor="customer-status">Estado</label>
        <select id="customer-status" value={query.status} onChange={(event) => {
          const status = event.target.value;
          if (status === 'all' || status === 'enabled' || status === 'disabled') setQuery({ ...query, status, page: 1 });
        }}><option value="all">Todos</option><option value="enabled">Habilitados</option><option value="disabled">Deshabilitados</option></select>
      </div>
    </div>
    <div aria-live="polite" aria-atomic="true" className="customer-result-count">
      {state.kind === 'loading' ? 'Buscando clientes…' : state.kind === 'ready' ? `${state.result.total} ${state.result.total === 1 ? 'cliente encontrado' : 'clientes encontrados'}` : 'Consulta no disponible'}
    </div>
    {state.kind === 'loading' && <div className="panel customer-loading" aria-label="Cargando clientes" aria-busy="true">
      <div /><div /><div />
    </div>}
    {state.kind === 'error' && <div className="panel customer-message" role="alert">
      <h3>No se pudo cargar el listado</h3><p>No se pudieron consultar los clientes. Volvé a intentar.</p>
      <button type="button" className="customer-button" onClick={() => setRetry((value) => value + 1)}>Reintentar</button>
    </div>}
    {state.kind === 'ready' && <>
      {state.result.items.length === 0 ? <div className="panel customer-message" role="status">
        <h3>{query.search || query.status !== 'all' ? 'No hay clientes que coincidan' : 'Todavía no hay clientes para mostrar'}</h3>
        <p>{query.search || query.status !== 'all' ? 'Probá con otro nombre o cambiá el estado seleccionado.' : 'Los clientes aparecerán aquí cuando estén registrados.'}</p>
        {(query.search || query.status !== 'all') && <button type="button" className="customer-button" onClick={() => setQuery({ ...query, search: '', status: 'all', page: 1 })}>Limpiar filtros</button>}
      </div> : <ul className="customer-list">{state.result.items.map((customer) => <li key={customer.id} className="panel customer-row">
        <span className="customer-avatar" aria-hidden="true">{customer.displayName.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('')}</span>
        <div className="customer-row-info"><h3>{customer.displayName}</h3>
          <p>{customer.type === 'COMPANY' ? 'Empresa' : 'Persona'} · {customer.addressCount} {customer.addressCount === 1 ? 'dirección registrada' : 'direcciones registradas'}</p>
          <p className="customer-muted">{customer.phone ?? 'Sin teléfono'} · {customer.email ?? 'Sin email'}</p>
        </div>
        <div className="customer-row-actions"><CustomerStatus enabled={customer.enabled} />
          <button type="button" className="customer-button" aria-label={`Ver ficha de ${customer.displayName}`} onClick={() => setSelectedId(customer.id)}>Ver ficha <span aria-hidden="true">→</span></button>
        </div>
      </li>)}</ul>}
      {state.result.totalPages > 1 && <nav className="customer-pagination" aria-label="Páginas de clientes">
        <button className="customer-button" type="button" disabled={query.page === 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Anterior</button>
        <span>Página {state.result.page} de {state.result.totalPages}</span>
        <button className="customer-button" type="button" disabled={query.page >= state.result.totalPages} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Siguiente</button>
      </nav>}
    </>}
  </section>;
}
