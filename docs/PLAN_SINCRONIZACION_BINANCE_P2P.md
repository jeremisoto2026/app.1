# Especificación de sincronización P2P de solo lectura — JJXCAPITAL

**Rama:** `feat/arbitrage-sessions-export-profile`  
**Estado:** diseño previo a implementación; no conecta todavía una cuenta real.

## Objetivo funcional

Cuando el usuario complete una compra o venta en Binance P2P, JJXCAPITAL importará esa orden desde el historial personal de Binance y la guardará en su propio historial de operaciones como si se hubiese introducido manualmente.

JJXCAPITAL no creará ni cancelará órdenes, no publicará anuncios, no enviará pagos y no liberará criptomonedas. La API se usará exclusivamente para leer el historial P2P.

## Fuente de datos

Endpoint de historial personal documentado en el repositorio oficial de Binance CLI:

`GET https://api.binance.com/sapi/v1/c2c/orderMatch/listUserOrderHistory`

La llamada exige autenticación firmada y encabezado API key. El cliente debe crear una solicitud HMAC SHA-256 con timestamp y parámetros correctamente codificados, exclusivamente en el backend. La documentación indica filtros `tradeType`, intervalo de tiempo, página y número de filas. La implementación debe tratar la documentación y la respuesta de la cuenta real como contrato a verificar en Preview; si Binance rechaza el endpoint o la clave, no intentar usar rutas privadas alternativas ni scraping.

Referencias:
- https://github.com/binance/binance-cli/blob/master/examples/c2c.md
- https://github.com/binance/binance-skills-hub/blob/main/skills/binance/p2p/SKILL.md
- https://github.com/binance/binance-skills-hub/blob/main/skills/binance/p2p/references/authentication.md

## Datos a capturar y normalizar

Guardar como mínimo:
- número único de orden de Binance;
- sentido BUY/SELL;
- activo cripto;
- moneda fiat;
- cantidad de cripto;
- importe total fiat;
- precio unitario/tasa;
- estado recibido de Binance;
- hora de creación de la orden;
- hora de finalización, solo cuando la API la proporcione y se haya verificado su semántica;
- comisión y moneda de comisión, si los datos devueltos permiten identificarla de forma fiable;
- origen `binance_p2p`, fecha de importación y marca de sincronización.

No se debe confundir cantidad de cripto con importe fiat ni derivar la tasa de un importe redondeado si Binance ya devuelve el precio unitario. Debe conservarse la precisión original para cálculos y mostrarse con el formato de la app.

## Mapeo al modelo existente

- BUY (el usuario compra cripto pagando fiat) → operación `Compra`.
- SELL (el usuario vende cripto y recibe fiat) → operación `Venta`.
- `asset` → `crypto`.
- `fiat` / `fiatUnit` → `fiat`.
- `amount` → cantidad de cripto, sujeto a verificar si la comisión reportada ya está descontada.
- `totalPrice` → total fiat.
- `unitPrice` / `price` → `exchange_rate`.
- `orderNumber` → referencia externa y `order_id`.
- `createTime` → hora de creación; no etiquetarla como hora de finalización.
- `orderStatus` → importar como operación contabilizada únicamente cuando el estado sea inequívocamente completado (p.ej., código 4 o texto COMPLETED según la respuesta observada).

Antes de activar el mapeo se debe reconciliar la semántica de las comisiones con las fórmulas existentes de JJXCAPITAL. Si Binance entrega neto y bruto como campos distintos, utilizar los campos que correspondan sin descontar la comisión dos veces.

## Flujo seguro

1. Desde Perfil/Integraciones, el usuario inicia una conexión de Binance P2P y acepta explícitamente que JJXCAPITAL consulte su historial.
2. El navegador envía las credenciales al backend por HTTPS. No se envía Secret Key a Firestore a través del SDK cliente, no se guarda en `localStorage`, y nunca se devuelve una clave guardada al navegador.
3. El servidor valida el ID token de Firebase, asocia las credenciales cifradas al UID autenticado y hace una llamada de prueba de solo lectura.
4. La clave Binance se crea con permisos mínimos para lectura de datos y sin permisos de trading ni retiros. Aplicar restricción por IP si la arquitectura de despliegue y el plan disponible permiten usar IP saliente fija.
5. La sincronización se ejecuta al pulsar “Sincronizar ahora” y, tras pruebas, mediante un programador del servidor a intervalo prudente. La API de historial consultada por el servidor no ofrece por sí misma un webhook personal de finalización en la documentación revisada; por ello, no prometer sincronización instantánea. La frecuencia final depende de los límites de Binance y del soporte de cron del despliegue.
6. Consultar BUY y SELL con paginación, ventana temporal con solapamiento y manejo de diferencias de reloj. Respetar el límite de intervalo documentado para la versión de endpoint confirmada.
7. Procesar solo órdenes completadas. Usar el número de orden como clave idempotente en una operación atómica, de modo que los sondeos repetidos jamás creen duplicados.
8. Comprobar órdenes ya registradas manualmente con el mismo `order_id`. No sobrescribir silenciosamente operaciones manuales; ofrecer vínculo/omisión o revisión de conflicto.
9. Registrar último intento, última sincronización correcta, conteos importados/omitidos y errores sanitizados. Nunca loguear API Secret, firmas, tokens ni datos sensibles de contraparte.
10. Mostrar el resultado: sincronizado, conexión caducada/incorrecta, permiso insuficiente o límite temporal. La desconexión invalida o elimina las credenciales cifradas y detiene las sincronizaciones futuras.

## Controles de seguridad que bloquean el lanzamiento

- `.env`/secret files ignorados en Git y escaneo de secretos del repo e historial antes de producción.
- Corrección/validación de revocación de tokens y autorización por UID.
- Restricciones de lectura por usuario en Firestore; claves cifradas y accesibles solo a funciones de servidor.
- Rate limiting por usuario, presupuesto de llamadas y backoff para límites de Binance.
- Pruebas de firma HMAC, expiración/timestamp, respuesta parcial, paginación, estados no completados, duplicate orderNumber, importación repetida y conflictos con órdenes manuales.
- Reconciliación de BUY/SELL y comisiones contra varias órdenes de prueba reales ya completadas, sin realizar operaciones nuevas para probar el conector.
- No promover a producción hasta comprobar Preview, build, pruebas y permisos de lectura.

## Fuera de alcance

- Crear, cancelar, aceptar o modificar órdenes P2P.
- Publicar anuncios.
- Marcar pagos como realizados o liberar cripto.
- Permiso de trading, transferencias o retiros.
- Usar cookies de sesión, scraping de la web o endpoints privados no confirmados.

## Criterios de aceptación

1. Una orden completada de prueba aparece una sola vez y con el sentido correcto.
2. La tasa, el importe fiat y la cantidad cripto coinciden con el historial de Binance dentro de su precisión.
3. Una orden pendiente, cancelada o en apelación no se contabiliza como operación completada.
4. Una segunda sincronización no duplica la operación.
5. Otro usuario no puede ver los registros, ni consultar o usar las credenciales de la cuenta.
6. El navegador, Firestore accesible al cliente y logs no contienen Secret Key.
7. La desconexión deja de realizar llamadas.
8. Toda importación puede rastrearse hasta el número de orden de Binance.
