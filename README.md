# Ohana Envíos — web

Base React 19 + Vite 7 + TypeScript para la plataforma web. Toma como referencia el prototipo de Ohana (`CadeteriaFull_Stack/CadeteriaFE`) en la organización visual del panel, sus secciones y colores. El prototipo usa una API de demostración y guarda un token en `localStorage`; esta base usa el cliente OIDC de ZITADEL y no reutiliza ese flujo.

## Inicio local

Requiere Node.js 22.12 o superior. Desde este directorio:

```bash
npm install
cp .env.example .env
npm run dev
```

Abra `http://localhost:5173`. Complete `.env` con el emisor, Client ID y Project ID públicos de una SPA **User Agent** de ZITADEL (Code + PKCE). Registre `http://localhost:5173` como Redirect URI y Post Logout URI, con Dev Mode solo para desarrollo local. En la API NestJS agregue `http://localhost:5173` a `CORS_ORIGINS`. Las variables `VITE_` se publican en el navegador: nunca coloque secretos o client secrets en ellas.

| Variable | Valor esperado |
| --- | --- |
| `VITE_ZITADEL_ISSUER_URL` | URL HTTPS de la instancia ZITADEL. |
| `VITE_ZITADEL_CLIENT_ID` | Client ID público de la SPA de este ambiente. |
| `VITE_ZITADEL_PROJECT_ID` | ID numérico del proyecto de este ambiente. |
| `VITE_API_BASE_URL` | URL de la API NestJS, por ejemplo `http://localhost:3000`. |

`npm run typecheck` valida TypeScript y `npm run build` produce `dist/`. CI ejecuta ambos con `npm ci`.

## Alcance

El cliente OIDC usa Code + PKCE. Su almacenamiento predeterminado es `sessionStorage` del navegador; configure una política CSP y trate cualquier XSS como riesgo de robo de tokens. `src/api.ts` prepara llamadas autenticadas con un access token obtenido por el SDK. La API introspecta el token y comprueba su estado, emisor, proyecto, cliente y expiración; una sesión visible en el navegador no sustituye ese control. El panel muestra el estado de `/api/health` y verifica la sesión con una llamada autenticada a `/api/auth/me`. El indicador «Sesión verificada por la API» solo aparece si el sujeto devuelto coincide con el usuario OIDC. Los datos operativos siguen siendo marcadores vacíos; no inventa métricas ni envíos.

Para MFA, habilitar TOTP y Force MFA en la instancia ZITADEL y probarlo con cuentas de cada ambiente; este repositorio no habilita la política por sí solo. Las pantallas de Envíos, Clientes y Rutas son puntos de entrada para los casos de uso posteriores.

## Pendientes de validación

- Confirmar con Fernando qué roles verán cada módulo y la política de MFA.
- Definir las rutas y respuestas de los casos de uso antes de conectar datos operativos.
- Verificar el despliegue Vercel y registrar sus URLs en ZITADEL al publicar el entorno.

## Ramas y ambientes

La promoción acordada es `feature/* → dev → staging → main`, siempre mediante PR y revisión. `main` representa producción, pero la rama no demuestra por sí sola qué commit está publicado. En Vercel, configurar `main` como Production Branch solo después de confirmar que este repositorio corresponde al sitio de Ohana. `dev` y `staging` pueden usar Preview Deployments con variables `VITE_` específicas por rama; cada una debe apuntar a su API y SPA y proyecto ZITADEL correspondientes. No usar la audiencia ni la API de producción en previews. La guía general está en `api-ohana/docs/branching-and-environments.md`.
