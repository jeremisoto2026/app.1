# Auditoría de seguridad inicial — Binance P2P para JJXCAPITAL

**Fecha:** 2026-10-28  
**Rama revisada:** `feat/arbitrage-sessions-export-profile`  
**Tipo de revisión:** estática y preliminar del repositorio; no es una auditoría de penetración ni una validación del despliegue.

## Dictamen

**Conector inicial implementado en la rama de trabajo; no está validado contra una cuenta real ni listo para producción.** El alcance es consultar el historial personal P2P y guardar solo operaciones completadas. Se añadieron endpoints de conexión, estado, sincronización y desconexión; credenciales cifradas por usuario; importación deduplicada; interfaz en Perfil y sondeo cada cinco minutos mientras la aplicación está abierta. Siguen pendientes configurar los secretos del servidor, validar las respuestas reales de Binance, confirmar el mapeo de cantidades/comisiones y superar las pruebas. No se crean órdenes, no se publican anuncios ni se liberan pagos desde JJXCAPITAL.

## Alcance revisado

Se inspeccionaron además `lib/binance-p2p.js`, los endpoints de `api/integrations/binance-p2p/`, `src/components/BinanceP2PSyncCard.js`, `src/components/BinanceP2PAutoSync.js` y `src/binanceP2PBackend.test.js`. No se inspeccionaron los valores de variables de entorno de Vercel o Firebase, y el acceso conectado a Vercel no permitió verificar la configuración real del proyecto. Se ha iniciado CI de GitHub Actions para tests y build; su resultado aún debe confirmarse. No se hizo análisis completo del historial de Git ni auditoría dinámica de seguridad.

## Hallazgos

### P0 — Verificar el acceso de solo lectura al historial personal P2P

La integración actual de `api/payments/binance` sirve para **Binance Pay y el cobro de la suscripción Pro**; no importa operaciones P2P personales.

La documentación pública del repositorio oficial `binance/binance-cli` presenta `GET /sapi/v1/c2c/orderMatch/listUserOrderHistory` como “Get C2C Trade History (USER_DATA)”. El Binance Skills Hub describe igualmente el historial P2P personal mediante una solicitud autenticada y firmada. La respuesta documentada incluye campos relevantes para JJXCAPITAL: número de orden, tipo BUY/SELL, cripto, fiat, cantidad de cripto, total fiat, tasa/unidad de precio, estado, hora de creación y comisiones. La API también contempla paginación y filtros temporales. Las respuestas de la API real deberán verificarse antes de mapearlas al historial financiero.

Referencias:
- https://github.com/binance/binance-cli/blob/master/examples/c2c.md
- https://github.com/binance/binance-skills-hub/blob/main/skills/binance/p2p/SKILL.md
- https://github.com/binance/binance-skills-hub/blob/main/skills/binance/p2p/references/authentication.md

**Condición antes de activar:** validar desde Preview que la cuenta y la API key pueden consultar el endpoint de historial P2P personal. El backend ya firma las solicitudes con HMAC-SHA256 y timestamp. La conexión se prueba antes de guardar las credenciales. Crear la clave sin permisos de trading ni retiros y con el permiso mínimo de lectura de historial. No usar endpoints de agente/comerciante no necesarios ni hacer scraping de la web de Binance.

### P1 — Higiene de archivos de entorno (mitigación aplicada)

Se añadieron al `.gitignore` las reglas `.env` y `.env.*`, permitiendo plantillas explícitas `.env.example` y `.env.template`. No se encontró un archivo `.env` en la lista de la raíz revisada. Aún hay que escanear el historial de Git y los artefactos de CI antes de afirmar que nunca se filtró un secreto.

### P1 — Protección del conector (implementación inicial, pendiente de validación)

La rama ahora incluye credenciales cifradas con AES-256-GCM en el servidor, guardadas bajo `users/{uid}/privateIntegrations/binanceP2P`; las reglas versionadas deniegan rutas privadas no contempladas al cliente. Se verifica el usuario mediante el helper de token de Firebase, la sincronización trabaja sobre el UID autenticado y la API key no vuelve a mostrarse. Se añadió deduplicación por número de orden y un bloqueo de sincronización por usuario.

Pendientes importantes:
- configurar `BINANCE_P2P_ENCRYPTION_KEY` en Preview y Production desde Vercel; el valor debe ser 32 bytes aleatorios en hex;
- confirmar en Preview permisos de lectura y mapeo de una orden real ya completada;
- evaluar verificación de revocación de sesión y una política más completa de rate limiting;
- confirmar comisiones y cantidades netas antes de usar el resultado importado para analizar beneficios;
- añadir pruebas específicas para conflictos de importación, estados, paginación y desconexión.

El importador solo considera completadas las órdenes que Binance marque explícitamente como `COMPLETED` o su código documentado equivalente. No se guardan nicknames ni métodos de pago de la contraparte.

### P1 — Falta de limitación de frecuencia visible en las funciones actuales

La conexión y sincronización incorporan una espera mínima de cinco segundos por usuario y bloqueo para impedir solicitudes simultáneas, además de paginación acotada. Esto no equivale a rate limiting distribuido por IP ni a una cuota global. Antes de producción debe ampliarse la protección si el tráfico, el plan de Vercel o los límites de Binance lo requieren.

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

- Las nuevas rutas de Binance exigen un ID token de Firebase y derivan el UID de los claims verificados.
- La clave secreta de Binance se cifra en el servidor y no se devuelve en las respuestas del API.
- La importación usa escrituras con ID de documento determinista y comprobación de `order_id` existentes para evitar duplicados en sincronizaciones repetidas.
- Las nuevas llamadas no incluyen endpoints de trading, de liberación de pagos, ni de retiradas.
- Las reglas versionadas deniegan rutas Firestore no contempladas, aunque las reglas desplegadas siguen pendientes de verificación.
- La configuración incluida en `src/firebase.js` es configuración cliente pública y no una cuenta de servicio.

## Pasos pendientes antes de habilitar la sincronización en producción

1. Configurar `BINANCE_P2P_ENCRYPTION_KEY` en Vercel Preview y comprobar que las funciones existentes tienen la configuración segura de Firebase.
2. Confirmar que el build y los tests pasan en GitHub Actions.
3. Verificar las reglas activas de Firestore, dominios y protección de previews de Vercel sin revelar valores secretos.
4. Con una API key de solo lectura creada por el usuario, conectar desde Preview y validar que el endpoint devuelve el historial esperado.
5. Comparar varias órdenes ya completadas, validar unidades de importe y tasa, y decidir la semántica de comisiones antes de hacer conclusiones de beneficio.
6. Repetir sincronización, probar importación duplicada, estado incompleto, desconexión y recuperación de errores.
7. La sincronización automática actual funciona cada cinco minutos mientras la app esté abierta y haya sesión iniciada. El procesamiento con navegador cerrado requiere un programador backend que aún no se ha configurado. No se necesitan permisos de trading ni retiros.

**No se han creado órdenes reales ni se han cambiado variables de entorno, reglas de Firebase o configuración de producción durante esta auditoría.**
