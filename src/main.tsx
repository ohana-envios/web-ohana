import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import App from './App';
import { readConfig } from './config';
import './styles.css';

const config = readConfig(import.meta.env);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {config ? (
      <AuthProvider
        authority={config.issuerUrl}
        client_id={config.clientId}
        redirect_uri={window.location.origin}
        post_logout_redirect_uri={window.location.origin}
        response_type="code"
        scope={`openid profile email urn:zitadel:iam:org:project:id:${config.projectId}:aud`}
        onSigninCallback={() => window.history.replaceState({}, document.title, window.location.pathname)}
      >
        <App config={config} />
      </AuthProvider>
    ) : (
      <main className="setup">
        <div className="setup-card">
          <span className="brand-mark">O</span>
          <h1>Configuración pendiente</h1>
          <p>Copiá <code>.env.example</code> a <code>.env</code> y completá los datos públicos de ZITADEL y la URL de la API.</p>
        </div>
      </main>
    )}
  </React.StrictMode>,
);
