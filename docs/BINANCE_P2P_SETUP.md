# Configurar la sincronización de Binance P2P en JJXCAPITAL

**Estado:** conectar y sincronizar solo después de que el entorno Preview tenga su clave de cifrado configurada. Este conector únicamente consulta el historial personal P2P: no crea órdenes, no libera pagos, no publica anuncios y no solicita permisos de retirada.

## 1. Configurar primero el secreto de cifrado en Vercel

El backend necesita una variable de entorno llamada \`BINANCE_P2P_ENCRYPTION_KEY\`. Debe contener exactamente 32 bytes aleatorios representados como 64 caracteres hexadecimales. Se usa AES-256-GCM para cifrar las credenciales individuales de cada usuario antes de guardarlas en Firestore.

En PowerShell, genera una clave localmente:

\`\`\`powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\`\`\`

Copia la salida directamente en un gestor de contraseñas y en Vercel:

1. Abre el proyecto correspondiente a \`app.1\`.
2. Ve a **Settings → Environment Variables**.
3. Crea \`BINANCE_P2P_ENCRYPTION_KEY\` con el valor generado.
4. Actívala primero solo para **Preview** y guarda.
5. Cuando Preview esté validado, configura el mismo valor para **Production** en el mismo proyecto.

No escribas el valor en GitHub, en el código React, en un archivo versionado, en mensajes ni en capturas. No uses el prefijo \`REACT_APP_\`. Si se pierde o cambia esta clave, las credenciales cifradas antiguas no podrán descifrarse; la cuenta tendrá que volver a conectarse con una nueva API key. No cambies la clave de cifrado después de guardar credenciales sin planificar una rotación.

Las funciones de servidor también requieren que estén configuradas las credenciales administrativas de Firebase indicadas en \`docs/PAYMENTS_SETUP.md\`. Esas credenciales también deben permanecer como secretos de servidor.

## 2. Crear la API key de Binance

Desde la cuenta de Binance, abre la gestión de API y crea una clave separada exclusivamente para JJXCAPITAL. Activa solo el permiso de lectura necesario para consultar el historial personal P2P. Desactiva:
- trading Spot/Margin/Futures;
- transferencias;
- retiradas.

No uses una API key que ya tenga permisos de trading o retirada. Aplica restricción de IP si la arquitectura de salida del despliegue permite una IP estática de servidor que puedas incluir en la lista de permitidas. No compartas la Secret Key en chats, capturas, tickets o GitHub.

La clave solo debe introducirse en **Perfil → Sincronización Binance P2P**, cuando desaparezca el aviso de que falta la clave de cifrado.

## 3. Qué hace la conexión

La aplicación realiza una llamada de prueba autenticada a:

\`GET https://api.binance.com/sapi/v1/c2c/orderMatch/listUserOrderHistory\`

Las solicitudes se firman con HMAC-SHA256 y se envían desde el backend. Si Binance rechaza la clave o el permiso de historial, JJXCAPITAL no guarda la conexión.

Las credenciales cifradas se guardan en:

\`users/{uid}/privateIntegrations/binanceP2P\`

Ese documento está fuera de las rutas que el cliente puede leer según las reglas versionadas de Firestore. El backend no devuelve las claves y la interfaz solo muestra los últimos cuatro caracteres de la API key.

## 4. Sincronizar y revisar los datos

1. Conecta la API key de solo lectura.
2. Pulsa **Sincronizar ahora**. La primera pasada revisa el historial de hasta los últimos 29 días y puede necesitar varias pasadas si hay muchas operaciones.
3. Compara el número de orden, el sentido BUY/SELL, el activo, el fiat, el importe, la tasa y la fecha frente al historial de Binance.
4. Pulsa sincronizar de nuevo para continuar cuando se indique que quedan páginas.
5. Repite la sincronización: no deben crearse duplicados.

Se importan únicamente órdenes que Binance devuelva con estado inequívoco de completada (\`COMPLETED\` o el código equivalente documentado). Las canceladas, pendientes y en apelación no se contabilizan como compras/ventas completadas.

La API de historial personal documentada devuelve la hora de creación (\`createTime\`), que se guarda como fecha de la operación. No debe confundirse con la hora de finalización si el endpoint no proporciona esta última.

La comisión original devuelta por Binance se conserva como metadato de fuente. Hasta que se confirme la moneda y semántica neta/bruta de cada comisión en respuestas reales, el importador no vuelve a descontarla del importe financiero. Antes de usar cifras importadas para analizar beneficios, compara cantidades y comisiones de órdenes completadas reales y valida la lógica FIFO.

## 5. Cuándo se sincroniza automáticamente

Mientras JJXCAPITAL está abierta, la aplicación consulta el estado de la conexión y puede ejecutar una sincronización cada cinco minutos con la sesión del usuario iniciada. También puedes iniciarla manualmente desde Perfil.

La sincronización en segundo plano cuando el navegador está cerrado no forma parte de esta primera etapa. Para ello habrá que configurar un programador de servidor adecuado al plan y límites de Vercel y confirmar que se puede recorrer la lista de cuentas conectadas de forma segura. No se debe afirmar que la sincronización es instantánea: depende del intervalo de consulta y de la disponibilidad/límites de Binance.

## 6. Desconectar

Pulsa **Desconectar** para borrar las credenciales cifradas del documento privado y detener los siguientes sondeos desde JJXCAPITAL. Para revocar completamente el acceso, elimina también la API key desde la gestión de API de Binance.

## Referencias

- https://github.com/binance/binance-cli/blob/master/examples/c2c.md
- https://github.com/binance/binance-skills-hub/blob/main/skills/binance/p2p/SKILL.md
- https://github.com/binance/binance-skills-hub/blob/main/skills/binance/p2p/references/authentication.md
