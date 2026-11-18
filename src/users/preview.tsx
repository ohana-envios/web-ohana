import React from 'react';
import ReactDOM from 'react-dom/client';
import { UsersPage } from './UsersPage';
import '../styles.css';
import { PreviewNavigation } from '../preview/PreviewNavigation';
import '../preview/preview.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
if (import.meta.env.DEV) {
  const { previewUsersSource } = await import('./preview-source');
  root.render(<React.StrictMode><main className="ohana-preview users-preview">
    <header className="users-preview-header"><span className="brand-mark" aria-hidden="true">O</span>
      <div><span className="eyebrow">OHANA ENVÍOS · SCRUM-20</span><h1>Usuarios</h1></div>
    </header>
    <aside className="users-preview-banner" aria-label="Modo de vista previa">
      <strong>Vista previa administrativa · Usuarios ficticios</strong>
      <p>Podés consultar y modificar el rol y acceso de cuentas ficticias ya existentes. Los cambios duran hasta recargar; esta vista no se conecta a servicios reales.</p>
    </aside>
    <UsersPage source={previewUsersSource} pageSize={3} preview />
    <a className="users-preview-link" href="/customers-preview.html">Ir a la vista previa de clientes →</a>
  <PreviewNavigation active="users" />
    </main></React.StrictMode>);
} else {
  root.render(<main className="setup"><h1>Vista previa disponible solo en desarrollo</h1></main>);
}
