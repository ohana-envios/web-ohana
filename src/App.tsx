import { useAuth } from 'react-oidc-context';
import { useEffect, useState } from 'react';
import type { AppConfig } from './config';

type Section = 'Resumen' | 'Envíos' | 'Clientes' | 'Rutas';
type Health = 'checking' | 'up' | 'down';

const sections: Section[] = ['Resumen', 'Envíos', 'Clientes', 'Rutas'];

function Dashboard({ config }: { config: AppConfig }) {
  const { user, signoutRedirect } = useAuth();
  const [section, setSection] = useState<Section>('Resumen');
  const [health, setHealth] = useState<Health>('checking');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${config.apiBaseUrl}/api/health`, { signal: controller.signal })
      .then((response) => setHealth(response.ok ? 'up' : 'down'))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') setHealth('down');
      });
    return () => controller.abort();
  }, [config.apiBaseUrl]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">O</span><div><strong>Ohana</strong><small>Envíos</small></div></div>
        <p className="nav-label">OPERACIONES</p>
        <nav aria-label="Secciones principales">
          {sections.map((item) => (
            <button key={item} type="button" className={`nav-item ${section === item ? 'active' : ''}`} onClick={() => setSection(item)}>{item}</button>
          ))}
        </nav>
        <div className="sidebar-footer"><span className={`status-dot ${health}`} /> API {health === 'up' ? 'conectada' : health === 'down' ? 'sin conexión' : 'comprobando'}</div>
      </aside>
      <main className="content">
        <header className="topbar"><div><span className="eyebrow">PANEL DE GESTIÓN</span><h1>{section}</h1></div><div className="account"><span>{user?.profile.name ?? user?.profile.email ?? 'Usuario'}</span><button type="button" onClick={() => void signoutRedirect()}>Salir</button></div></header>
        {section === 'Resumen' ? <Overview /> : <SectionPlaceholder section={section} />}
      </main>
    </div>
  );
}

function Overview() {
  return <>
    <div className="welcome"><div><span className="eyebrow">OPERACIÓN DIARIA</span><h2>Todo empieza con un envío bien gestionado.</h2><p>Este panel sigue la organización visual del prototipo de Ohana. Los indicadores se conectarán a datos reales cuando estén disponibles los casos de uso de la API.</p></div><span className="welcome-symbol" aria-hidden="true">↗</span></div>
    <div className="metric-grid">
      {['Envíos activos', 'Entregas de hoy', 'Pendientes', 'Incidencias'].map((label) => <article className="metric" key={label}><p>{label}</p><strong>—</strong><small>Sin datos operativos aún</small></article>)}
    </div>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">SEGUIMIENTO</span><h2>Últimos envíos</h2></div></div><div className="empty"><span aria-hidden="true">◫</span><h3>Todavía no hay envíos para mostrar</h3><p>Cuando la API incorpore los casos de uso de envíos, aparecerán aquí.</p></div></section>
  </>;
}

function SectionPlaceholder({ section }: { section: Exclude<Section, 'Resumen'> }) {
  const descriptions: Record<Exclude<Section, 'Resumen'>, string> = {
    Envíos: 'Listado, alta y seguimiento de solicitudes de envío.',
    Clientes: 'Consulta de clientes y sus direcciones habituales.',
    Rutas: 'Planificación y asignación de recorridos.',
  };
  return <section className="panel placeholder"><span className="eyebrow">PRÓXIMA IMPLEMENTACIÓN</span><h2>{section}</h2><p>{descriptions[section]}</p><p>La estructura de navegación está lista para incorporar esta funcionalidad cuando exista su API.</p></section>;
}

export default function App({ config }: { config: AppConfig }) {
  const { isLoading, isAuthenticated, error, signinRedirect } = useAuth();
  if (isLoading) return <main className="setup"><p>Cargando sesión…</p></main>;
  if (error) return <main className="setup"><div className="setup-card"><h1>No se pudo iniciar sesión</h1><p>{error.message}</p><button className="primary-button" onClick={() => void signinRedirect()}>Reintentar</button></div></main>;
  if (!isAuthenticated) return <main className="login-layout"><div className="login-hero"><span className="brand-mark">O</span><p className="eyebrow">OHANA ENVÍOS</p><h1>Tu operación,<br />siempre en movimiento.</h1><p>Gestión de cadetería y envíos en un solo lugar.</p></div><div className="login-side"><div className="login-card"><span className="eyebrow">BIENVENIDO</span><h2>Ingresá a Ohana</h2><p>Accedé de forma segura con tu cuenta de la organización.</p><button className="primary-button" onClick={() => void signinRedirect()}>Iniciar sesión <span>→</span></button><small>El segundo factor se solicita durante el ingreso según la política de ZITADEL.</small></div></div></main>;
  return <Dashboard config={config} />;
}
