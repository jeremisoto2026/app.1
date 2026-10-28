# Auditoría de seguridad inicial — Binance P2P para JJXCAPITAL

**Fecha:** 2026-10-28  
**Rama revisada:** `feat/arbitrage-sessions-export-profile`  
**Tipo de revisión:** estática y preliminar del repositorio; no es una auditoría de penetración ni una validación del despliegue.

## Dictamen

**No conectar todavía la sincronización automática a una cuenta real.** El alcance correcto es importar el historial P2P de solo lectura, únicamente para órdenes completadas. El repositorio dispone de algunas bases útiles de backend y autenticación, pero no contiene aún un importador P2P. Antes de programarlo hay que corregir las observaciones prioritarias, comprobar el acceso a la API de historial con una clave de solo lectura y verificar sus respuestas en pruebas. No se enviarán órdenes, no se publicarán anuncios ni se marcarán pagos como realizados desde JJXCAPITAL.

## Alcance revisado

Se inspeccionaron `package.json`, `.gitignore`, `firebase.json`, `firestore.rules`, `src/firebase.js`, `src/contexts/AuthContext.js`, `api/operations/create.js`, `api/sessions/create.js`, `api/usage/record-export.js`, las funciones actuales de Binance Pay y pagos blockchain, `lib/payments.js`, `docs/PAYMENTS_SETUP.md` y el workflow de GitHub Actions. No se inspeccionaron los valores de variables de entorno de Vercel o Firebase, y el acceso conectado a Vercel no permitió verificar el proyecto desplegado. No se ejecutó el build ni una auditoría de dependencias; no se hizo un análisis completo de todo el historial de Git.

## Hallazgos

### P0 — Verificar el acceso de solo lectura al historial personal P2P

La integración actual de `api/payments/binance` sirve para **Binance Pay y el cobro de la suscripción Pro**; no importa operaciones P2P personales.

La documentación pública del repositorio oficial `binance/binance-cli` presenta `GET /sapi/v1/c2c/orderMatch/listUserOrderHistory` como “Get C2C Trade History (USER_DATA)”. El Binance Skills Hub describe igualmente el historial P2P personal mediante una solicitud autenticada y firmada. La respuesta documentada incluye campos relevantes para JJXCAPITAL: número de orden, tipo BUY/SELL, cripto, fiat, cantidad de cripto, total fiat, tasa/unidad de precio, estado, hora de creación y comisiones. La API también contempla paginación y filtros temporales. Las respuestas de la API real deberán verificarse antes de mapearlas al historial financiero.

Referencias:
- https://github.com/binance/binance-cli/blob/master/examples/c2c.md
- https://github.com/binance/binance-skills-hub/blob/main/skills/binance/p2p/SKILL.md
- https://github.com/binance/binance-skills-hub/blob/main/skills/binance/p2p/references/authentication.md

**Condición antes de implementar:** validar desde Preview que la cuenta y la clave API pueden consultar el endpoint de historial P2P personal. No usar endpoints de agente/comerciante que no sean necesarios para este alcance. Crear la clave sin permisos de trading ni retiros; solo habilitar el permiso mínimo que permita leer los datos. La autenticación deberá realizarse desde el backend, con firma HMAC y timestamp actual. No se debe hacer scraping de la web de Binance.

### P1 — `.gitignore` no excluye archivos `.env`

El archivo ignora algunos archivos de tokens/credenciales, pero no incluye reglas generales para `.env`, `.env.local` ni `.env.*`. No se encontró un archivo `.env` en la lista de la raíz revisada, pero la protección preventiva es insuficiente. Añadir una regla de exclusión para los archivos de entorno y permitir únicamente una plantilla sin secretos (por ejemplo, `.env.example`). Revisar también el historial antes de asumir que nunca se filtró una credencial.

### P1 — No hay protección específica para la sincronización P2P

No se encontró un conector de Binance P2P de solo lectura ni un almacén de credenciales por usuario. Antes de importar órdenes se necesitará:
- guardar API keys individuales cifradas en el servidor, con clave maestra almacenada como secreto del entorno de servidor; nunca en texto claro en el perfil de Firestore, en `localStorage`, en variables `REACT_APP_*` ni en logs;
- verificar el ID token de Firebase en cada petición, autorizar por UID y evaluar revocación de sesión;
- mantener los secretos fuera del frontend y solicitar únicamente permisos de consulta del historial; sin permisos de trading/retiros;
- deduplicar por número de orden de Binance y procesar cada orden idempotentemente, incluso si se repite el sondeo;
- guardar el momento de última sincronización, consultar con una ventana temporal superpuesta para capturar cambios de estado y respetar paginación y límites de Binance;
- registrar fuente, fecha de importación y los campos originales necesarios para auditar la conversión a `Compra`/`Venta`, sin guardar datos de más ni exponer información de contrapartes;
- tratar órdenes incompletas/canceladas como no importables por defecto y no considerar completada una orden si el estado devuelto no se ha validado.

### P1 — Falta de limitación de frecuencia visible en las funciones actuales

En los helpers y endpoints revisados no aparece una capa general de rate limiting por usuario/IP. Las cuotas de uso de la aplicación no sustituyen los límites de llamadas. El sincronizador debe tener límites por usuario y globales, no consultar Binance en cada renderizado del frontend, espaciar los reintentos y respetar los límites de la API. Los sondeos repetidos no deben crear registros duplicados.

### P1 — Las reglas activas de Firestore no están verificadas

La rama contiene reglas que limitan perfiles a su propietario y deniegan por defecto otras rutas, lo cual es una buena base. Sin embargo, el propio README de la rama avisa de que guardar `firestore.rules` no publica esas reglas en Firebase. Hay que comparar las reglas desplegadas con el archivo y probar acceso cruzado con dos cuentas.

Las reglas actuales permiten al propietario actualizar y borrar sus propias sesiones y operaciones. Eso no expone por sí mismo datos de terceros, pero el futuro motor de órdenes no debe tratar registros del frontend como una autorización suficiente: cada instrucción deberá validarse en el servidor contra el usuario, la cuenta Binance conectada y el estado actual.

### P1 — Verificación de tokens personalizada sin comprobación visible de revocación

`lib/payments.js` comprueba la firma del ID token de Firebase, emisor, audiencia, expiración e instante de emisión. En el código inspeccionado no se ve una comprobación de revocación de tokens ni de cuentas deshabilitadas. Para operaciones que puedan mover dinero, evaluar la verificación de tokens con comprobación de revocación mediante Firebase Admin SDK (o un equivalente seguro) y definir cómo se invalidan conexiones y sesiones.

### P2 — Dependencias no reproducibles y CI limitada

La raíz revisada no contiene `package-lock.json` ni `yarn.lock`, aunque `package.json` declara Yarn y el workflow instala con `npm install --legacy-peer-deps`. Sin un lockfile se pueden resolver versiones diferentes entre ejecuciones. El workflow actual prueba cálculos financieros y compila el frontend; no se encontraron pruebas específicas para los endpoints de backend, autenticación/roles o escenarios de reintentos y duplicación. Crear lockfile, usar instalación determinista y añadir tests de seguridad y contrato para las funciones API.

### P2 — Webhook público sin límite de tamaño explícito en el código inspeccionado

El webhook de Binance Pay lee el cuerpo crudo por fragmentos para verificar la firma, pero no aplica en ese código un límite propio de bytes antes de acumular el cuerpo. Aunque no es una función de trading P2P, conviene limitar el tamaño, validar estructura y probar el comportamiento ante entradas grandes o malformadas.

### P2 — El despliegue y los secretos de Vercel quedan fuera de esta revisión

No fue posible consultar el proyecto de Vercel con la conexión disponible. Por tanto, no se verificaron las variables configuradas, sus entornos (Preview/Production), la protección de previews, dominios, restricciones de red ni el servicio que recibe las peticiones en producción. No compartir valores secretos para realizar esa comprobación. Debe revisarse la lista de nombres y su ámbito desde Vercel, sin revelar los valores.

## Aspectos positivos observados

- Las rutas API revisadas requieren un ID token de Firebase y las funciones de servidor usan credenciales de Firebase a través de variables de entorno.
- Las reglas versionadas limitan el acceso a recursos propios y tienen una denegación general por defecto.
- Las credenciales de Binance Pay se leen desde variables de entorno del servidor; no se encontró una clave privada o una clave de trading literal en los archivos seleccionados.
- La configuración de Firebase incluida en `src/firebase.js` es configuración cliente pública, no una cuenta de servicio. Su exposición no equivale a filtrar una clave privada; la protección depende de reglas, autenticación y restricciones apropiadas.

## Plan de remediación antes de cualquier orden real

1. Confirmar por escrito con Binance el acceso a P2P API y las funciones autorizadas para la cuenta (consulta, anuncios, creación/aceptación de órdenes, pago/liberación, etc.).
2. Endurecer higiene del repositorio, revocación de sesiones, límites de peticiones y cobertura de pruebas.
3. Verificar las reglas activas de Firebase y el entorno de Vercel sin mostrar secretos.
4. Diseñar el almacén cifrado de credenciales por usuario, controles de permiso mínimos y registro de auditoría.
5. Implementar primero consulta de solo lectura. Probar después la lógica de escritura en un entorno oficialmente admitido, sin fondos reales.
6. Habilitar producción solo tras revisar resultados, límites, idempotencia, conciliación y procedimiento de emergencia.

**No se han creado órdenes reales ni se han cambiado variables de entorno, reglas de Firebase o configuración de producción durante esta auditoría.**
