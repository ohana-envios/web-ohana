# SCRUM-21 — Vista previa de clientes

## Actualización: correo duplicado

Las altas y ediciones reales rechazan asignar un correo ya utilizado por otro cliente o reservado por otra solicitud, ignorando mayúsculas y espacios externos. El formulario conserva los datos e informa el problema en el campo, separado de los conflictos por cambios simultáneos. Las fichas históricas duplicadas se conservan; no se modifican automáticamente.


## Actualización: autogestión

Los clientes con cuenta habilitada y asociación aprobada pueden ingresar a «Mis datos y direcciones» para consultar y editar su ficha y gestionar sus direcciones. Se conserva la regla de al menos una dirección activa. La API decide el cliente a partir de la sesión; la interfaz no proporciona un identificador de cliente para la autorización. La integración real con ZITADEL y la revisión visual permanecen pendientes.


## Actualización: estado real y auditoría

La web conectada permite desactivar y reactivar fichas de cliente, conservando las direcciones y la cuenta de acceso. Clientes pendientes deben pasar por la aprobación inicial; no se habilitan desde este control. Las escrituras administrativas de datos y direcciones registran auditoría persistente en la API. La vista previa continúa usando datos en memoria. Falta validación visual y con ZITADEL real.


Actualización: la API registra los endpoints de lectura de clientes para administradores habilitados, según la decisión del usuario. Los paneles reales de web y móvil se conectaron en código a esa lectura, pero falta validarlos con identidad y base de datos reales. Esta vista previa sigue usando datos ficticios. Las referencias posteriores a un módulo sin controladores o a la conexión pendiente describen etapas anteriores.

La edición de nombre y contacto también está conectada en los paneles reales a la API; falta probarla con servicios reales. Los formularios de esta vista previa continúan con guardado temporal.

El alta, edición, desactivación y reactivación de direcciones están conectadas en código a la API para administradores; se verificaron contra PostgreSQL aislado con identidad simulada. La migración del estado debe coordinarse antes de aplicarla en ambientes compartidos. Esta vista previa conserva sus cambios temporales. Las notas posteriores que describen la escritura como exclusivamente temporal corresponden a etapas anteriores.

Primer incremento en `cesarworkbench`: consulta de clientes existentes, búsqueda, filtro de habilitación, paginación y navegación a la ficha con contactos y direcciones habituales. Se conserva la estructura visual del panel y se toma como referencia la sección Clientes del prototipo HTML aportado.

## Segundo incremento: edición temporal

Desde la ficha se puede editar nombre visible, razón social y contacto. Guardar actualiza la ficha y el listado solamente en memoria; recargar restablece los datos ficticios. Cancelar descarta el borrador. Si falla el guardado, el formulario mantiene los datos ingresados y permite reintentar.

Validaciones técnicas propuestas para esta vista previa: nombre obligatorio hasta 120 caracteres; razón social opcional hasta 160; email opcional hasta 254 con formato de email; teléfono opcional hasta 40 con números y separadores habituales. Los espacios externos se recortan y los campos opcionales vacíos se convierten a `null`. No se agregan reglas fiscales ni de unicidad. Estos límites deben acordarse antes de conectar la API.

El documento, tipo de cliente, habilitación, permisos, acceso y direcciones no son editables en este formulario. La fuente de datos expone edición como capacidad opcional, conservando el contrato de lectura existente. No se implementa un endpoint de escritura ni se modifica la API en este incremento.

## Tercer incremento: direcciones temporales

Desde la ficha se agregan y editan direcciones habituales: etiqueta opcional, calle, número, localidad, departamento, referencia y observaciones. Calle, número, localidad y departamento son obligatorios, como en Prisma; el número sigue siendo texto para admitir formatos como `s/n` o letras.

Límites técnicos de la vista previa: etiqueta 80, calle 160, número 30, localidad y departamento 80, referencia 240 y observaciones 500 caracteres. Se recortan espacios externos y los opcionales vacíos se convierten a `null`. Una coincidencia exacta normalizada de calle, número, localidad y departamento genera un aviso de posible duplicación, sin imponer una regla de unicidad todavía no acordada.

Guardar actualiza la ficha y el contador del listado en memoria; cancelar descarta el borrador. Los IDs se generan en la fuente de prueba y la edición se limita a direcciones del cliente seleccionado. Los errores no descartan el formulario. El usuario corroboró visualmente este incremento de alta y edición de direcciones, además del anterior de edición de datos de cliente.

## Cuarto incremento: desactivación y reactivación temporales

La ficha permite desactivar y reactivar clientes y direcciones después de una confirmación explícita. Cancelar vuelve a la ficha sin cambios; un fallo permite reintentar. No hay eliminación.

Reactivar un cliente cambia únicamente el estado de su ficha comercial en la vista previa: no habilita cuentas de acceso ni cambia permisos, y no reactiva automáticamente sus direcciones. Reactivar una dirección tampoco habilita al cliente. Cada registro conserva sus datos y su estado independiente.

Desactivar Cliente actualiza su indicador y los filtros del listado, sin borrar su ficha, direcciones ni modificar cuentas de acceso. Las direcciones desactivadas siguen visibles, identificadas como tales. El contador conserva el total de direcciones registradas; la ficha distingue activas y desactivadas.

Como Prisma todavía no modela el estado de direcciones, la simulación usa `CustomerDetail.preview.inactiveAddressIds`: metadatos opcionales exclusivos de la fuente de vista previa. No se cambia el contrato de lectura de API ni se presenta este estado como persistido. Editar una dirección desactivada no la reactiva. Todos los cambios se reinician al recargar; la integración de las restricciones de operación e historial sigue pendiente.

El usuario validó visualmente el listado y las fichas, la edición de datos de clientes, el alta y edición de direcciones y, posteriormente, la desactivación y reactivación de clientes y direcciones. Esta evidencia corresponde a la vista previa con datos ficticios; no acredita persistencia, permisos, auditoría ni integración con la API.

## Cómo probar

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Abrir `http://127.0.0.1:5173/customers-preview.html`. No requiere configurar ZITADEL ni una base de datos: es una página separada de desarrollo con cuatro clientes ficticios, un aviso permanente y guardado temporal en memoria. La página normal de la aplicación sigue usando el login existente.

Recorrido de revisión:

1. Ver la primera página y avanzar a la segunda; volver con Anterior.
2. Buscar `Librería`, filtrar Habilitados y abrir su ficha.
3. Volver a clientes: se conservan búsqueda, filtro y página.
4. Buscar `Atelier` y abrir su ficha con dos direcciones.
5. Buscar `Persona` para revisar una ficha sin direcciones ni teléfono.
6. Buscar un texto inexistente y usar Limpiar filtros.
7. Repetir con teclado y a 320, 768, 1024 y 1440 píxeles de ancho.
8. Abrir una ficha, pulsar Editar datos, cambiar el nombre y cancelar: la ficha conserva el nombre anterior.
9. Editar de nuevo, dejar el nombre vacío o escribir un email inválido e intentar guardar: aparecen errores en los campos.
10. Corregir, guardar y volver al listado: se reflejan los cambios y la búsqueda usa los datos nuevos.
11. Recargar la página: vuelven los datos ficticios iniciales.
12. Abrir una ficha, pulsar Agregar dirección y guardar sin completar: aparecen los errores de los campos obligatorios.
13. Completar la dirección, guardar y volver al listado: aumenta el contador de direcciones de ese cliente.
14. Editar una dirección, cambiar calle, referencia u observaciones y guardar; verificar que las otras direcciones conservan sus datos.
15. Editar de nuevo y cancelar: la dirección conserva los datos anteriores.
16. Agregar otra dirección con la misma calle, número, localidad y departamento: se muestra un aviso de posible duplicación.
17. En un cliente habilitado, pulsar Desactivar cliente y Cancelar: se conserva habilitado.
18. Repetir y confirmar: la ficha muestra Deshabilitado; al volver al listado cambia su pertenencia a los filtros de estado.
19. Pulsar Desactivar dirección y Cancelar: la dirección conserva su estado activo.
20. Repetir y confirmar: la dirección sigue visible como Desactivada y no vuelve a ofrecer desactivación; el total registrado se conserva.
21. Editar esa dirección desactivada: conserva ese estado después de guardar. Recargar restablece todos los datos iniciales.
22. Desactivar un cliente y pulsar Reactivar cliente: cancelar conserva su estado; confirmar lo devuelve al filtro Habilitados sin cambiar sus direcciones.
23. Desactivar una dirección y pulsar Reactivar dirección: cancelar conserva su estado; confirmar la muestra activa sin modificar las demás ni el estado del cliente.

La paginación muestra tres registros por página en esta vista previa para poder recorrerla; el componente usa veinte por defecto.

## Integración pendiente

`CustomersPage` recibe una fuente `CustomersSource` con `list` y `get`, y las capacidades opcionales `update`, `addAddress`, `updateAddress`, `deactivateCustomer`, `deactivateAddress`, `reactivateCustomer` y `reactivateAddress`; `preview-source.ts` implementa esa interfaz solo con datos ficticios. En el panel normal, Clientes muestra la conexión pendiente y, en desarrollo, el enlace a la vista previa. No hay sustitución automática de una API fallida por datos de prueba.

Los tipos corresponden al contrato documentado en `api-ohana/docs/scrum-21-read-contract.md`. La API prepara consultas administrativas en un módulo sin controladores, todavía no registrado. Antes de habilitar llamadas reales hay que acordar e integrar permisos, usuarios habilitados y alcance con el trabajo de RF-16. La autogestión requiere además asociar Usuario y Cliente.

No se modificaron `src/main.tsx`, la configuración OIDC, el esquema de Prisma, migraciones ni CI. La edición y desactivación son solo temporales en la vista previa: no se implementaron escrituras en API ni alta de clientes. El modelo no distingue clientes pendientes ni permite desactivar direcciones todavía: el estado de dirección se representa exclusivamente como metadatos de prueba y requiere acordar su persistencia.

## Comprobaciones

La fuente de datos de prueba se verifica sin dependencias adicionales, con Node 22.12 o superior:

```powershell
node --experimental-strip-types --test test/*.test.mjs
```

Las pruebas cubren paginación, filtros, búsqueda, detalle, edición de clientes, alta y edición de direcciones, avisos de duplicados, desactivación y reactivación sin borrar datos ni cambiar estados de otros registros, normalización, protección de campos y operaciones canceladas o fallidas. No ejecutan eventos de React ni reemplazan la revisión de la interfaz en un navegador.

`npm run build` ejecuta TypeScript y genera el sitio normal. Vite no incluye `customers-preview.html` como entrada de producción; sus datos ficticios se importan únicamente en desarrollo. La verificación visual y por teclado requiere un navegador; el build por sí solo no la reemplaza.


## Ajustes de correspondencia con el prototipo ? 14/11/2026

Regla confirmada por el usuario: debe quedar al menos una direcci?n activa. Para desactivar la ?ltima se debe agregar o reactivar otra primero. Se bloquea el bot?n, se explica el motivo y la fuente rechaza la operaci?n sin modificar datos. Las direcciones desactivadas se conservan para consulta. Los ejemplos iniciales tienen al menos una direcci?n. Esta regla deber? validarse tambi?n en el backend al implementar las escrituras; hoy solo existe en la vista previa.

Las vistas previas de Clientes y Usuarios usan ahora la paleta verde, tipograf?a Plus Jakarta Sans (con alternativa del sistema), radios, superficies y navegaci?n inferior inspirados en el prototipo guardado. La navegaci?n ofrece ?nicamente las dos secciones implementadas. No constituye una reproducci?n completa de todas las vistas del HTML. No se modific? la pantalla de autenticaci?n del compa?ero.

El estado de Cliente y el acceso de Usuario contin?an separados: su relaci?n operativa requiere acuerdo antes de implementar efectos sobre cuentas reales. Auth0 en el documento frente a ZITADEL en el c?digo sigue siendo una diferencia a coordinar. Persistencia, auditor?a, aprobaci?n y administraci?n completa de usuarios siguen pendientes.

Alcance por repositorio: las interfaces de este trabajo est?n en web-ohana; la API contiene las bases documentadas de lectura y acceso; app-mobile-ohana conserva su base Expo y todav?a no incorpora Clientes/Usuarios de este trabajo. La web responsive no reemplaza esa implementaci?n m?vil.

Verificaci?n de esta entrega: 24 pruebas de datos y validaci?n aprobadas, TypeScript y build aprobados; las dos p?ginas y sus nuevos m?dulos responden HTTP 200 en Vite. La nueva apariencia y navegaci?n requieren revisi?n visual y por teclado; las confirmaciones visuales anteriores no validan este ajuste.
