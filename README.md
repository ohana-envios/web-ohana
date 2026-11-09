# Ohana Envíos — web

Base React 19 + Vite 7 + TypeScript para la plataforma web. Toma como referencia el prototipo de Ohana (`CadeteriaFull_Stack/CadeteriaFE`) en la organización visual del panel, sus secciones y colores. El prototipo usa una API de demostración y guarda un token en `localStorage`; esta base usa el SDK de Auth0 y no reutiliza ese flujo.

## Inicio local

Requiere Node.js 22.12 o superior. Desde este directorio:

```bash
npm install
cp .env.example .env
npm run dev
```

Abra `http://localhost:5173`. Complete `.env` con los valores públicos de una aplicación **Single Page Application** de Auth0 y el identificador (audience) de una API registrada allí. Configure en Auth0 `http://localhost:5173` como **Allowed Callback URL**, **Allowed Logout URL** y **Allowed Web Origin**. En la API NestJS agregue `http://localhost:5173` a `CORS_ORIGINS`. Las variables `VITE_` se publican en el navegador: nunca coloque secretos o client secrets en ellas.

| Variable | Valor esperado |
| --- | --- |
| `VITE_AUTH0_DOMAIN` | Dominio del tenant, sin `https://`. |
| `VITE_AUTH0_CLIENT_ID` | Client ID público de la SPA. |
| `VITE_AUTH0_AUDIENCE` | Identificador de la API de Auth0. |
| `VITE_API_BASE_URL` | URL de la API NestJS, por ejemplo `http://localhost:3000`. |

`npm run typecheck` valida TypeScript y `npm run build` produce `dist/`. CI ejecuta ambos con `npm ci`.

## Alcance

El SDK de Auth0 maneja el ingreso y la sesión; el token se mantiene en memoria. `src/api.ts` prepara llamadas autenticadas con un access token obtenido por el SDK. La API debe validar firma, emisor y audiencia antes de aceptar una llamada protegida; una sesión visible en el navegador no sustituye ese control. El panel solo muestra el estado de `/api/health` y marcadores vacíos; no inventa métricas ni envíos.

Para MFA, habilitar una política en el tenant Auth0 y probarla con cuentas de prueba; todavía no hay tenant ni credenciales de Ohana configurados en este repositorio. Las pantallas de Envíos, Clientes y Rutas son puntos de entrada para los casos de uso posteriores.

## Pendientes de validación

- Confirmar con Fernando qué roles verán cada módulo y la política de MFA.
- Definir las rutas y respuestas de los casos de uso antes de conectar datos operativos.
- Verificar el despliegue Vercel y registrar sus URLs en Auth0 al publicar el entorno.
