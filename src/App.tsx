import { useAuth } from 'react-oidc-context';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { AppConfig } from './config';
import { createApiClient } from './api';
import { SelfCustomerPage } from './SelfCustomerPage';
import { CustomersPage } from './customers/CustomersPage';
import { UsersPage } from './users/UsersPage';
import { createApiCustomersSource, createSelfCustomerSource, createApiUsersSource, getOperationalSession } from './api-sources';
import { InvitationClaim } from './InvitationClaim';
import { AdminCustomerRegistration } from './AdminCustomerRegistration';
import { createRegistrationsSource } from './registrations';
import { RegistrationForm, PendingRegistrations } from './RegistrationViews';
import { isCurrentAdministrator, type OperationalSession } from './operational-session';

type Section = 'Resumen' | 'Envíos' | 'Clientes' | 'Rutas' | 'Usuarios';
type Health = 'checking' | 'up' | 'down';
type SessionCheck = 'checking' | 'verified' | 'failed';

const sections: Section[] = ['Resumen', 'Envíos', 'Clientes', 'Rutas', 'Usuarios'];

function Dashboard({ config }: { config: AppConfig }) {
  const { user, signoutRedirect } = useAuth();
  const [section, setSection] = useState<Section>('Resumen');
  const [customersRevision, setCustomersRevision] = useState(0);
  const [health, setHealth] = useState<Health>('checking');
  const [sessionCheck, setSessionCheck] = useState<SessionCheck>('checking');
  const [operationalSession, setOperationalSession] = useState<OperationalSession | null>(null);
  const [canInvite, setCanInvite] = useState(false);
  const accessToken = user?.access_token;

  const sources = useMemo(() => {
    if (!accessToken) return null;
    const request = createApiClient(config.apiBaseUrl, async () => accessToken);
    return { customers: createApiCustomersSource(request), selfCustomer: createSelfCustomerSource(request), users: createApiUsersSource(request), registrations: createRegistrationsSource(request) };
  }, [accessToken, config.apiBaseUrl]);

  useEffect(() => {
    setOperationalSession(null);
    if (!accessToken) return;
    const controller = new AbortController();
    const request = createApiClient(config.apiBaseUrl, async () => accessToken);
    getOperationalSession(request, controller.signal)
      .then((user) => { if (!controller.signal.aborted) setOperationalSession({ token: accessToken, user }); })
      .catch(() => { if (!controller.signal.aborted) setOperationalSession(null); });
    return () => controller.abort();
  }, [accessToken, config.apiBaseUrl]);
  const admin = isCurrentAdministrator(accessToken, operationalSession);

  useEffect(() => {
    if (!accessToken) {
      setCanInvite(false);
      return;
    }
    setCanInvite(false);
    const controller = new AbortController();
    const request = createApiClient(config.apiBaseUrl, async () => accessToken);
    request<{ canInvite: boolean }>('/api/users/invitations/access', { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setCanInvite(result.canInvite); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && error instanceof Error && error.name !== 'AbortError') setCanInvite(false);
      });
    return () => controller.abort();
  }, [accessToken, config.apiBaseUrl]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${config.apiBaseUrl}/api/health`, { signal: controller.signal })
      .then((response) => setHealth(response.ok ? 'up' : 'down'))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') setHealth('down');
      });
    return () => controller.abort();
  }, [config.apiBaseUrl]);

  useEffect(() => {
    if (!accessToken) {
      setSessionCheck('failed');
      return;
    }
    const controller = new AbortController();
    setSessionCheck('checking');
    const request = createApiClient(config.apiBaseUrl, async () => accessToken);
    request<{ sub: string }>('/api/auth/me', { signal: controller.signal })
      .then((identity) => setSessionCheck(identity.sub === user?.profile.sub ? 'verified' : 'failed'))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') setSessionCheck('failed');
      });
    return () => controller.abort();
  }, [accessToken, config.apiBaseUrl, user?.profile.sub]);

  if (operationalSession?.user.role === 'CUSTOMER' && operationalSession.token === accessToken && sources) return <SelfCustomerPage source={sources.selfCustomer} name={operationalSession.user.displayName} onExit={() => void signoutRedirect()} />;

  if (operationalSession && operationalSession.user.role !== 'ADMIN' && operationalSession.token === accessToken) return <main className="setup"><div className="setup-card">
    <h1>Hola, {operationalSession.user.displayName}</h1><p>{operationalSession.user.role === 'CUSTOMER' ? 'Tu cuenta de cliente está habilitada. Las funciones de envíos todavía no están disponibles.' : 'Tu cuenta está habilitada. Las funciones operativas de tu rol todavía no están disponibles.'}</p>
    <button className="primary-button" type="button" onClick={() => void signoutRedirect()}>Salir</button>
  </div></main>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">O</span><div><strong>Ohana</strong><small>Envíos</small></div></div>
        <p className="nav-label">OPERACIONES</p>
        <nav aria-label="Secciones principales">
          {sections.filter((item) => item !== 'Usuarios' || admin || canInvite).map((item) => (
            <button key={item} type="button" className={`nav-item ${section === item ? 'active' : ''}`} onClick={() => setSection(item)}>{item}</button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div><span className={`status-dot ${health}`} /> API {health === 'up' ? 'conectada' : health === 'down' ? 'sin conexión' : 'comprobando'}</div>
          <div><span className={`status-dot ${sessionCheck === 'verified' ? 'up' : sessionCheck === 'failed' ? 'down' : 'checking'}`} /> Sesión {sessionCheck === 'verified' ? 'verificada por la API' : sessionCheck === 'failed' ? 'sin verificar en la API' : 'comprobando'}</div>
        </div>
      </aside>
      <main className="content">
        <header className="topbar"><div><span className="eyebrow">PANEL DE GESTIÓN</span><h1>{section}</h1></div><div className="account"><span>{user?.profile.name ?? user?.profile.email ?? 'Usuario'}</span><button type="button" onClick={() => void signoutRedirect()}>Salir</button></div></header>
        {section === 'Resumen' ? <>{!operationalSession && sessionCheck === 'verified' && sources && <><InvitationClaim source={sources.registrations} /><RegistrationForm source={sources.registrations} /></>}<Overview /></> : section === 'Clientes' ? <>{admin && sources && <AdminCustomerRegistration source={sources.registrations} onCreated={() => setCustomersRevision(value => value + 1)} />}<CustomersPage key={customersRevision} source={admin ? sources?.customers : undefined} /></> : section === 'Usuarios' ?
          <>{canInvite && accessToken && <UserInvitations config={config} accessToken={accessToken} />} {admin && sources && <><PendingRegistrations source={sources.registrations} /><UsersPage source={sources.users} /></>}</>
          : <SectionPlaceholder section={section} />}
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

function UserInvitations({ config, accessToken }: { config: AppConfig; accessToken: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const request = createApiClient(config.apiBaseUrl, async () => accessToken);
      const result = await request<{ email: string }>('/api/users/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, lastName }),
      });
      setMessage({ kind: 'success', text: `Invitación enviada a ${result.email}. La persona podrá activar su cuenta y configurar el acceso.` });
      setEmail('');
      setFirstName('');
      setLastName('');
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo enviar la invitación.' });
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel user-invitations">
    <span className="eyebrow">ACCESO A LA PLATAFORMA</span>
    <h2>Invitar por correo</h2>
    <p className="form-intro">ZITADEL enviará un correo para verificar la dirección y configurar el acceso. La política de seguridad solicitará MFA al iniciar sesión.</p>
    <form onSubmit={(event) => void submit(event)}>
      <div className="form-grid">
        <label>Nombre<input required maxLength={100} autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
        <label>Apellido<input required maxLength={100} autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
        <label className="wide">Correo electrónico<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      </div>
      {message && <p className={`form-message ${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
      <button className="primary-button submit-invitation" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar invitación'}</button>
    </form>
  </section>;
}

function SectionPlaceholder({ section }: { section: Exclude<Section, 'Resumen' | 'Clientes' | 'Usuarios'> }) {
  const descriptions: Record<Exclude<Section, 'Resumen' | 'Clientes' | 'Usuarios'>, string> = {
    Envíos: 'Listado, alta y seguimiento de solicitudes de envío.',
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
