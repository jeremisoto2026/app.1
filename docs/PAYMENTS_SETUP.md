# Configuración segura de pagos de JJXCAPITAL

## Estado actual

La interfaz y las funciones de servidor están preparadas en la rama de trabajo. Los cobros reales permanecen sin habilitar hasta configurar credenciales en Vercel y validar los flujos con el proveedor. No subas claves privadas a GitHub ni antepongas REACT_APP_ a ninguna clave secreta.

## 1. Variables de entorno de Vercel

En Project → Settings → Environment Variables, configúralas primero para Preview y prueba la versión de prueba.

### Firebase / Firestore (servidor)

- FIREBASE_PROJECT_ID: jjxcapital-2
- FIREBASE_SERVICE_ACCOUNT_JSON: contenido JSON completo de una cuenta de servicio del proyecto Firebase, guardado como variable secreta del servidor. También se puede configurar mediante FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.
- FIREBASE_CLIENT_EMAIL: solo si se usa el formato de variables separadas.
- FIREBASE_PRIVATE_KEY: clave privada de la cuenta de servicio, solo si se usan variables separadas.

La cuenta de servicio debe tener permiso de escritura/lectura en Firestore (por ejemplo, el rol de IAM mínimo que permita operar con Cloud Firestore). Guarda estas credenciales únicamente en Vercel. No las incluyas en el código, repositorio, navegador ni mensajes.

### Blockchain: USDT por BEP20

- BLOCKCHAIN_RECEIVER_ADDRESS: 0x4c64b783f1babc0a2fe62f174873f415393c2269
- BSC_USDT_CONTRACT: opcional; el valor predeterminado del código es 0x55d398326f99059fF775485246999027B3197955.
- BSC_RPC_URL: opcional; predeterminado https://bsc-dataseed.bnbchain.org.

La red verificada es BNB Smart Chain Mainnet, BEP20, Chain ID 56. El código comprueba el contrato del token, destinatario, cantidad exacta y 12 confirmaciones. Cada orden incorpora una fracción identificadora inferior a 0,01 USDT al precio base de 15 USD para impedir que una transferencia visible pueda reclamarse con el mismo TxID por otra cuenta. El usuario debe enviar el importe exacto mostrado en la orden.

Antes de activar los pagos, confirma en tu propia wallet que la dirección de recepción está bajo tu control y que el token que deseas recibir coincide con el contrato configurado. No todas las redes que usan direcciones 0x son la misma red.

### Binance Pay Merchant

- BINANCE_PAY_CERTIFICATE_SN: API identity key que Binance Pay emite para autenticar las solicitudes API.
- BINANCE_PAY_SECRET_KEY: secret key asociada a esa API identity key.
- BINANCE_PAY_WEBHOOK_CERTIFICATE_SN: serial de la clave pública que firma los webhooks entrantes.
- BINANCE_PAY_WEBHOOK_PUBLIC_KEY: clave pública PEM de Binance Pay para verificar la firma de los webhooks entrantes.

El código usa el endpoint oficial documentado POST /binancepay/openapi/v3/order y el esquema goodsDetails de la orden V3. Binance describe el campo BinancePay-Certificate-SN como la API identity key; no necesitas una variable duplicada para el mismo dato. El ID numérico de Binance Pay 807678814 sirve como dato de recepción, pero no sustituye las credenciales de Merchant. Debes tener acceso a Binance Pay Merchant y a su API de órdenes. En el portal de Merchant puedes consultar el endpoint de certificados POST /binancepay/openapi/certificates; configura la clave pública y su serial correspondientes al webhook. El serial del webhook se guarda por separado del serial usado en las solicitudes API.

## 2. URL de webhook de Binance Pay

Después de desplegar la versión que debe recibir pagos, configura en Binance Pay Merchant → Developer → Webhooks esta ruta en HTTPS:

https://TU-DOMINIO/api/payments/binance/webhook

Sustituye TU-DOMINIO por el dominio estable que hayas verificado. No configures un enlace temporal de Preview como webhook definitivo. Selecciona notificaciones de órdenes y verifica los eventos desde el registro de notificaciones de Merchant.

La función comprueba la firma RSA, la hora de la notificación, la orden guardada, la moneda y el importe. Solo un PAY_SUCCESS firmado y coincidente puede marcar la orden como pagada y activar Pro. Los eventos duplicados no vuelven a cobrar ni a crear una segunda activación.

## 3. Flujos implementados

- POST /api/payments/binance/create-order: crea una orden Merchant de 15 USDT y devuelve el checkout oficial de Binance.
- POST /api/payments/binance/webhook: valida los webhooks firmados y activa/renueva la suscripción cuando el proveedor confirma el pago.
- POST /api/payments/blockchain/create-invoice: crea una orden individual BEP20 para la cuenta autenticada con un importe compatible con cuatro decimales.
- POST /api/payments/blockchain/verify: verifica el TxID contra BNB Smart Chain, exige el token/destinatario/importe de la orden y evita reutilizar la misma transacción.
- GET /api/payments/history: devuelve únicamente el historial de la cuenta autenticada.

Los endpoints exigen un ID token válido de Firebase. La suscripción se escribe desde servidor con credenciales privilegiadas; el cliente no puede activarse Pro cambiando el estado desde el navegador.

## 4. Puesta en marcha

1. Configura primero las variables de Preview y guarda los cambios.
2. Prueba la pantalla de Perfil y la creación de órdenes sin enviar fondos reales.
3. Para Binance Pay, usa las credenciales y el entorno de pruebas que permita tu cuenta de Merchant. Confirma que llega un webhook firmado al endpoint HTTPS.
4. Para BEP20, prueba con una transacción controlada cuando verifiques el contrato, la dirección y las confirmaciones.
5. Solo después de completar las pruebas, configura las variables de Production y el webhook en el dominio definitivo.

No compartas la clave privada de Firebase, el secret key de Binance Pay ni ningún token de autorización. Si una llamada responde que faltan credenciales, la orden no se ha pagado ni el plan se ha activado.
