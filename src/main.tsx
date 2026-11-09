import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import { readConfig } from './config';
import './styles.css';

const config = readConfig(import.meta.env);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {config ? (
      <Auth0Provider
        domain={config.domain}
        clientId={config.clientId}
        authorizationParams={{ redirect_uri: window.location.origin, audience: config.audience }}
        cacheLocation="memory"
      >
        <App config={config} />
      </Auth0Provider>
    ) : (
      <main className="setup">
        <div className="setup-card">
          <span className="brand-mark">O</span>
          <h1>Configuración pendiente</h1>
          <p>Copiá <code>.env.example</code> a <code>.env</code> y completá los datos públicos de Auth0 y la URL de la API.</p>
        </div>
      </main>
    )}
  </React.StrictMode>,
);
