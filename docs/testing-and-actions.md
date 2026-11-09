# SCRUM-9 — Base de capacitación en pruebas y GitHub Actions

Duración propuesta: 2 horas. Objetivo: que los dos integrantes puedan ejecutar las verificaciones localmente, leer un fallo de CI y corregirlo en un PR pequeño. La capacitación se considera realizada cuando el segundo integrante repite el ejercicio y deja evidencia en Jira/Teams.

## Ruta práctica

1. **20 min — Qué comprobar.** Distinguir pruebas unitarias (reglas aisladas), integración (Prisma/PostgreSQL) y una prueba HTTP de la API. Usar como ejemplo los 4 tests de `api-ohana`, `db:verify` y `GET /api/health`.
2. **25 min — Ejecutar localmente.** En API: `bash scripts/verify-local.sh` con PostgreSQL de desarrollo. En web: `npm ci && npm run typecheck && npm run build`. En móvil: `npm ci && npm run typecheck && npm run export:ios && npm run export:android`.
3. **35 min — Leer GitHub Actions.** Abrir el PR de API, revisar `API CI`, identificar qué pasos preparan PostgreSQL, aplican migraciones y verifican HTTP. Comparar con los workflows `Web CI` y `Mobile CI` cuando estén publicados.
4. **25 min — Ejercicio.** Crear una rama de prueba, provocar un fallo de TypeScript o un test unitario, abrir PR, leer la línea exacta del error, corregirla y comprobar que CI vuelve a verde. No hacer merge del ejercicio sin revisión.
5. **15 min — Cierre.** El otro integrante explica el resultado y deja en Jira el enlace al PR/ejecución, comandos usados y aprendizaje o duda pendiente.

## Línea base de calidad

| Repositorio | Verificación automática inicial | Próximo incremento útil |
| --- | --- | --- |
| `api-ohana` | PostgreSQL 17, migraciones, restricciones, build, unit tests y HTTP health. | Pruebas de contratos y casos de uso al agregar endpoints. |
| `web-ohana` | Instalación reproducible, TypeScript y build de Vite. | Pruebas de componentes y flujo de Auth0 con mocks, luego pruebas de navegación. |
| `app-mobile-ohana` | Instalación reproducible, TypeScript y exportación de bundles iOS/Android. | Pruebas de componentes y un flujo E2E en simuladores cuando haya autenticación y casos de uso. |

La exportación de Expo comprueba el bundle JavaScript para cada plataforma; la ejecución en simulador/dispositivo y la compilación nativa son controles distintos. La primera entrega móvil debe registrarlos por separado. Antes de exigir cobertura porcentual, elegir casos críticos (alta de envío, cambios de estado, custodia, permisos) y agregar pruebas que detecten errores reales.

## Opciones para el equipo

- **Mínimo en cada PR:** `npm ci`, TypeScript/build y pruebas pertinentes. Es rápido y ya está preparado en los tres repositorios.
- **Protección de `main`:** requerir CI verde y una revisión de otro integrante. Activarla en GitHub cuando el equipo confirme los permisos y nombres de checks.
- **Siguiente nivel:** entorno de staging con Auth0 de prueba y PostgreSQL aislado; ejecutar un flujo web/API y otro móvil/API antes de publicar. Requiere URLs y cuentas de prueba, por lo que aún no se configura.

No guardar secretos de Auth0, base de datos o EAS en workflows. Las variables públicas de cliente pueden documentarse en ejemplos; credenciales reales deben estar en GitHub Secrets o en el gestor del entorno correspondiente.
