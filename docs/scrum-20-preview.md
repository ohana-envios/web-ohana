# SCRUM-20 — Listado administrativo de usuarios

## Invitaciones de identidad

En Usuarios, ADMIN puede generar una invitación para una cuenta interna deshabilitada sin identidad; se muestra el código una sola vez para compartirlo por un canal seguro. Al iniciar sesión con su correo verificado, la persona puede ingresar el código y vincular su identidad; un administrador habilita la cuenta después. Las cuentas no administrativas habilitadas ven una bienvenida limitada hasta que existan sus funciones operativas. Falta validación visual y con identidad real.


## Alta local de usuarios internos

ADMIN puede crear cuentas internas deshabilitadas desde Usuarios, con revisión y confirmación. La pantalla informa que falta vincular la identidad y no crea credenciales; la asociación segura aún no está disponible. Se verificaron compilación y contratos, no la interacción con servicios de identidad reales.


## Alta administrativa y cuenta de cliente aprobada

En Clientes, ADMIN puede registrar una ficha habilitada sin crear una cuenta, con confirmación y control de correo duplicado. En Usuarios puede deshabilitar o reactivar cuentas de clientes con aprobación inicial registrada; no cambia su rol ni el estado de su ficha comercial. Clientes habilitados ven una bienvenida limitada, sin funciones administrativas; los envíos aún no están implementados. La prueba visual y la conexión con identidad real siguen pendientes.


## Autorregistro y habilitación inicial

La web ofrece solicitud para una identidad autenticada sin sesión operativa resuelta y permite a ADMIN revisar solicitudes pendientes desde Usuarios. El correo procede del proveedor y la solicitud requiere confirmación; la habilitación también requiere confirmación. La pantalla y el tenant no se probaron de extremo a extremo con identidad real. Falta alta por administrador y administración posterior del acceso cliente.


## Actualización: conexión real de acceso interno

La web conectada permite cambiar rol y estado de cuentas internas mediante la API, con confirmación, detección de conflicto y evidencia de auditoría persistida. El flujo real no permite modificar cuentas cliente ni asignar ese rol hasta implementar su habilitación inicial. La vista previa conserva datos ficticios y su registro temporal. Se verificaron compilación y pruebas de fuentes; resta probar eventos y pantalla con identidad real.


Actualización: el panel web y el panel móvil incluyen una conexión de solo lectura con `GET /api/users` para administradores habilitados. La vista previa documentada abajo continúa usando datos ficticios; los cambios de rol o acceso siguen siendo temporales. Falta probar el acceso real con los servicios y dispositivos configurados.

Incremento en `cesarworkbench`: consulta de solo lectura con búsqueda por nombre/email, filtros por rol y estado de acceso, paginación y estados de carga, vacío y error. Se usan los roles existentes: ADMIN (Administrador), OPERATOR (Operador), CUSTOMER (Cliente) y COURIER (Repartidor).

La vista previa usa seis usuarios ficticios y no depende de login ni base de datos. No crea cuentas, modifica roles, habilita accesos ni simula un control real de permisos. La ruta administrativa preparada en la API, `GET /api/users`, sí exige ADMIN mediante los guards de SCRUM-20; la conexión de la pantalla con esa ruta queda pendiente.

## Contrato y estructura

Cada usuario expone `id`, `email`, `displayName`, `role` y `enabled`. La fuente `UsersSource.list` recibe `search`, `role`, `status`, `page` y `pageSize`, y devuelve `{ items, page, pageSize, total, totalPages }`, con cero páginas cuando no hay resultados. La búsqueda es parcial sin distinción de mayúsculas; los filtros se combinan y ordenan por nombre e ID. No se expone `externalAuthId`.

Código en `src/users/`, página independiente `users-preview.html`, pruebas de datos en `test/users-preview.test.mjs`. La vista utiliza la base visual existente del sitio. No cambia `App.tsx`, el login, la vista de clientes ni CI. Los datos de prueba solo se importan en desarrollo, y la página no se añade como entrada al build de producción.

## Cómo probar

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Abrir `http://127.0.0.1:5173/users-preview.html`.

1. Recorrer las dos páginas de tres usuarios cada una.
2. Buscar un nombre o parte de su email.
3. Combinar el rol Cliente con Acceso deshabilitado.
4. Buscar un texto inexistente y usar Limpiar filtros.
5. Cambiar un filtro desde la segunda página: el listado vuelve a la primera.
6. Revisar teclado y anchos de 320, 768, 1024 y 1440 píxeles.

La pantalla distingue la habilitación de una cuenta de Usuario del estado comercial de una ficha Cliente. Cambiar el filtro de rol no cambia la identidad ni los permisos de nadie.

## Verificación

```powershell
node --experimental-strip-types --test test/*.test.mjs
npm run build
```

Las pruebas de fuente validan filtros, paginación y cancelación, sin ejecutar eventos de React. La revisión visual de esta pantalla de usuarios sigue pendiente; las validaciones visuales anteriores pertenecen a SCRUM-21.

Resultado local: 23 pruebas de datos y validación de web aprobadas (4 nuevas de usuarios y 19 existentes de clientes), chequeo de tipos y build aprobados. El build normal conserva su entrada anterior y no contiene esta página ni los fixtures de usuarios.

Persistencia, conexión al proveedor, correo/MFA, administración y cambios de acceso con auditoría requieren integración posterior; los permisos nunca se decidirán en la pantalla.


Ajuste visual 14/11/2026: paleta verde, tipografía y navegación compartida con Clientes según el prototipo local; ver `scrum-21-preview.md` para alcance y diferencias pendientes. Revisión visual de este ajuste pendiente. Total en ese momento: 24 pruebas aprobadas.

## Cambio de rol y estado — siguiente tramo de SCRUM-20

Se agregó Administrar acceso para las cuentas ficticias existentes. Permite elegir rol y acceso habilitado/deshabilitado, revisar antes/después, cancelar o volver a editar antes de confirmar. Al confirmar se refrescan filtros y paginación y se muestra un registro temporal del último cambio con responsable, fecha/hora y valores anteriores/nuevos. Los errores conservan el formulario para reintentar. Sin cambios no se registra una modificación.

La fuente valida los campos y actualiza exclusivamente rol y habilitación; conserva identidad e historial operativo. Un controlador cancelado, un rol/estado inválido o un usuario inexistente no modifica datos. Una política provisional impide quitar a la administración ficticia su propio rol/acceso. Esa protección debe acordarse antes de implementarla en producción, no se atribuye al documento.

Los seis registros ficticios representan cuentas operativas existentes, incluidas cuentas deshabilitadas previamente; no representan solicitudes iniciales pendientes. Esta función no implementa ni sustituye la aprobación CU18, no modifica fichas Cliente y no llama al proveedor de identidad. La autorización de ejemplo está fijada a `demo-user-admin` dentro de la fuente de desarrollo; no acredita permisos reales.

La referencia es el documento principal entregado por el usuario: RN-CU15-01 a RN-CU15-07, especialmente separación de CU18 y auditoría de cambios. El modelo actual carece de auditoría general; guardar cambios reales de acceso requiere una transacción con registro persistente de actor y fecha/hora. Antes de integrar también hay que definir concurrencia y la distinción de clientes pendientes. Esta entrega no presenta el registro temporal de pantalla como cumplimiento de auditoría persistente.

En móvil se agregó el mismo formulario nativo y se verifican las mismas reglas y pruebas. Los cambios se reinician al recargar web o al salir/reingresar a la vista previa móvil. La revisión en navegador/dispositivo sigue pendiente.

Comprobación local: 27 pruebas por aplicación aprobadas; paridad de contratos/reglas y suites aprobada; build web y TypeScript móvil aprobados. La API, identidad, infraestructura, esquema, migraciones y CI no se modificaron en este tramo.
