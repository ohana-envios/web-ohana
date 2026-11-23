import React from 'react';
import ReactDOM from 'react-dom/client';
import { CustomersPage } from './CustomersPage';
import '../styles.css';
import { PreviewNavigation } from '../preview/PreviewNavigation';
import '../preview/preview.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (import.meta.env.DEV) {
  const { previewCustomersSource } = await import('./preview-source');
  root.render(<React.StrictMode>
    <main className="ohana-preview customer-preview">
      <header className="customer-preview-header"><span className="brand-mark" aria-hidden="true">O</span>
        <div><span className="eyebrow">OHANA ENVÍOS · SCRUM-21</span><h1>Clientes</h1></div>
      </header>
      <aside className="customer-preview-banner" aria-label="Modo de vista previa">
        <strong>Vista previa · Datos ficticios</strong>
        <p>Podés editar y desactivar clientes y direcciones de prueba. Los cambios duran hasta recargar: esta vista no se conecta a la API.</p>
      </aside>
      <CustomersPage source={previewCustomersSource} pageSize={3} preview />
    <PreviewNavigation active="customers" />
    </main>
  </React.StrictMode>);
} else {
  root.render(<main className="setup"><h1>Vista previa disponible solo en desarrollo</h1></main>);
}
