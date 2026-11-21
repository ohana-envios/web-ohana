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
import { CouriersPage } from './couriers/CouriersPage';
import { ShipmentForm } from './shipments/ShipmentForm';
import { ShipmentList } from './shipments/ShipmentList';

type Section = 'Resumen' | 'Envíos' | 'Clientes' | 'Rutas' | 'Usuarios' | 'Repartidores';
type Health = 'checking' | 'up' | 'down';
type SessionCheck = 'checking' | 'verified' | 'failed';

const sections: Section[] = ['Resumen', 'Envíos', 'Clientes', 'Repartidores', 'Rutas', 'Usuarios'];

function Dashboard({ config }: { config: AppConfig }) {
  const { user, signoutRedirect } = useAuth();
  const [section, setSection] = useState<Section>('Resumen');
  const [accessView, setAccessView] = useState<'directory' | 'pending' | 'email'>('directory');
  const [hasInvite, setHasInvite] = useState(false);
  const [customersRevision, setCustomersRevision] = useState(0);
  const [shipmentsRevision, setShipmentsRevision] = useState(0);
  const [health, setHealth] = useState<Health>('checking');
  const [sessionCheck, setSessionCheck] = useState<SessionCheck>('checking');
  const [operationalSession, setOperationalSession] = useState<OperationalSession | null>(null);
  const [canInvite, setCanInvite] = useState(false);
  const accessToken = user?.access_token;
  const courierRequest = useMemo(() => accessToken ? createApiClient(config.apiBaseUrl, async () => accessToken) : null, [accessToken, config.apiBaseUrl]);
  const downloadReceipt = useMemo(() => async (id: string) => {
    if (!accessToken) throw new Error('Sesión no disponible');
    const response = await fetch(`${config.apiBaseUrl}/api/shipments/${encodeURIComponent(id)}/receipt`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error('No se pudo descargar el comprobante.');
    const file = await response.blob(); const url = URL.createObjectURL(file);
    const link = document.createElement('a'); link.href = url; link.download = `comprobante.${file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg'}`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [accessToken, config.apiBaseUrl]);

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

  if (operationalSession?.user.role === 'CUSTOMER' && operationalSession.token === accessToken && sources && courierRequest) return <SelfCustomerPage source={sources.selfCustomer} request={courierRequest} downloadReceipt={downloadReceipt} name={operationalSession.user.displayName} onExit={() => void signoutRedirect()} />;

  if (operationalSession && (operationalSession.user.role === 'OPERATOR' || operationalSession.user.role === 'COURIER') && operationalSession.token === accessToken && courierRequest) return <main className="content"><header className="topbar"><h1>Hola, {operationalSession.user.displayName}</h1><button type="button" onClick={() => void signoutRedirect()}>Salir</button></header><ShipmentList request={courierRequest} downloadReceipt={downloadReceipt} own={operationalSession.user.role === 'COURIER'} readOnly /></main>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">O</span><div><strong>Ohana</strong><small>Envíos</small></div></div>
        <p className="nav-label">OPERACIONES</p>
        <nav aria-label="Secciones principales">
          {sections.filter((item) => (item !== 'Usuarios' && item !== 'Repartidores') || admin).map((item) => (
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
        {section === 'Resumen' ? (!operationalSession && sessionCheck === 'verified' && sources ? <>
          <div className="access-choices" role="group" aria-label="Acceso a Ohana">
            <button aria-pressed={!hasInvite} onClick={() => setHasInvite(false)}>Solicitar alta</button>
            <button aria-pressed={hasInvite} onClick={() => setHasInvite(true)}>Tengo una invitación</button>
          </div>
          {hasInvite ? <InvitationClaim source={sources.registrations} /> : <RegistrationForm source={sources.registrations} />}
        </> : (admin ? <section className="panel"><h2>Operaciones</h2>
            <div className="access-choices">
              <button onClick={() => setSection('Envíos')}>Ver envíos</button>
              <button onClick={() => { setAccessView('pending'); setSection('Usuarios'); }}>Revisar solicitudes de clientes</button>
              <button onClick={() => { setAccessView('directory'); setSection('Usuarios'); }}>Administrar usuarios</button>
            </div>
          </section> : <section className="panel" role="status">{sessionCheck === 'failed' ? 'No pudimos verificar tu sesión. Volvé a iniciar sesión.' : 'Consultando tu acceso…'}</section>)) : section === 'Clientes' ? <>{admin && sources && <><div className="access-choices"><button onClick={() => { setAccessView('pending'); setSection('Usuarios'); }}>Revisar solicitudes de clientes</button></div><AdminCustomerRegistration source={sources.registrations} onCreated={() => setCustomersRevision(value => value + 1)} /></>}<CustomersPage key={customersRevision} source={admin ? sources?.customers : undefined} /></> : section === 'Usuarios' ?
          (admin && sources && <>
            <div className="access-choices" role="group" aria-label="Administración de acceso">
              <button aria-pressed={accessView === 'directory'} onClick={() => setAccessView('directory')}>Usuarios y roles</button>
              <button aria-pressed={accessView === 'pending'} onClick={() => setAccessView('pending')}>Clientes pendientes</button>
              {canInvite && <button aria-pressed={accessView === 'email'} onClick={() => setAccessView('email')}>Invitar por correo</button>}
            </div>
            {accessView === 'pending' ? <PendingRegistrations source={sources.registrations} /> :
              accessView === 'email' && canInvite && accessToken ? <UserInvitations config={config} accessToken={accessToken} /> : <UsersPage source={sources.users} />}
          </>)
          : section === 'Repartidores' ? (admin && courierRequest && <CouriersPage request={courierRequest} />) : section === 'Envíos' ? (admin && courierRequest && sources && <><ShipmentList key={shipmentsRevision} request={courierRequest} downloadReceipt={downloadReceipt} /><ShipmentForm source={sources.customers} request={courierRequest} registrations={sources.registrations} onCreated={() => setShipmentsRevision((v) => v + 1)} /></>) : <SectionPlaceholder section={section} />}
      </main>
    </div>
  );
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

function SectionPlaceholder({ section }: { section: Exclude<Section, 'Resumen' | 'Clientes' | 'Usuarios' | 'Repartidores' | 'Envíos'> }) {
  const descriptions: Record<Exclude<Section, 'Resumen' | 'Clientes' | 'Usuarios' | 'Repartidores' | 'Envíos'>, string> = {
    Rutas: 'Planificación y asignación de recorridos.',
  };
  return <section className="panel placeholder"><span className="eyebrow">PRÓXIMA IMPLEMENTACIÓN</span><h2>{section}</h2><p>{descriptions[section]}</p><p>La estructura de navegación está lista para incorporar esta funcionalidad cuando exista su API.</p></section>;
}

export default function App({ config }: { config: AppConfig }) {
  const { isLoading, isAuthenticated, error, signinRedirect } = useAuth();
  if (isLoading) return <main className="setup"><p>Cargando sesión…</p></main>;
  if (error) return <main className="setup"><div className="setup-card"><h1>No se pudo iniciar sesión</h1><p>{error.message}</p><button className="primary-button" onClick={() => void signinRedirect()}>Reintentar</button></div></main>;
  if (!isAuthenticated) return <main className="login-layout"><div className="login-hero"><span className="brand-mark">O</span><p className="eyebrow">OHANA ENVÍOS</p><h1>Tu operación,<br />siempre en movimiento.</h1><p>Gestión de cadetería y envíos en un solo lugar.</p></div><div className="login-side"><div className="login-card"><span className="eyebrow">BIENVENIDO</span><h2>Ingresá a Ohana</h2><p>Accedé de forma segura con tu cuenta de la organización.</p><button className="primary-button" onClick={() => void signinRedirect()}>Iniciar sesión <span>→</span></button><p>Si olvidaste tu contraseña, ingresá tu correo en la pantalla de acceso y elegí la opción para recuperarla.</p><button type="button" onClick={() => void signinRedirect()}>Recuperar contraseña</button><small>Si se te pide configurar el segundo factor, seguí los pasos de ZITADEL y confirmá el método antes de volver a Ohana.</small></div></div></main>;
  return <Dashboard config={config} />;
}
