# Configuración aislada de Firebase para Vercel Preview

## Objetivo

Los despliegues Preview deben utilizar un proyecto Firebase distinto de `jjxcapital-2`, que es el proyecto de Producción. No se deben copiar al Preview las credenciales de Producción.

El código aplica estas barreras:

- El navegador de Preview solo lee las variables `REACT_APP_FIREBASE_PREVIEW_*`.
- El backend de Preview solo lee `FIREBASE_PREVIEW_PROJECT_ID`, `FIREBASE_PREVIEW_CLIENT_EMAIL` y `FIREBASE_PREVIEW_PRIVATE_KEY` (o `FIREBASE_PREVIEW_SERVICE_ACCOUNT_JSON`).
- Si falta la configuración o se intenta usar `jjxcapital-2`, las rutas de backend fallan de forma cerrada.
- Si falta la configuración pública, la web muestra una pantalla de preparación y no permite iniciar sesión.
- Las rutas de pagos BEP20 están deshabilitadas en Preview. El perfil no muestra la cartera ni el contrato de Producción.
- Binance y Bybit utilizan claves de cifrado distintas en Preview.

## 1. Crear el proyecto Firebase de pruebas

En Firebase Console, crea un proyecto nuevo dedicado exclusivamente a pruebas, por ejemplo `jjxcapital-preview` (si el ID está disponible). No añadas usuarios ni datos reales.

En ese proyecto:

1. Registra una aplicación web y guarda su configuración.
2. Activa Authentication con Email/Password y Google.
3. Crea la base de datos Cloud Firestore.
4. Añade el dominio de Preview a Authentication → Settings → Authorized domains:
   `app-1-git-feat-preview-quota-model-jeremis-projects-53da5f18.vercel.app`.
5. Crea una cuenta de servicio dedicada al proyecto Preview con el permiso mínimo necesario para acceder a Firestore. No reutilices la cuenta de servicio de Producción.
6. Aplica las reglas de `firestore.rules` a esta base de datos de pruebas.

## 2. Variables públicas de Vercel

Añade estas variables en el proyecto `app-1` con destino **Preview**. No deben añadirse al destino Production.

| Variable | Valor |
|---|---|
| `REACT_APP_FIREBASE_PREVIEW_API_KEY` | API key de la app web Firebase de pruebas |
| `REACT_APP_FIREBASE_PREVIEW_AUTH_DOMAIN` | Auth domain de Firebase de pruebas |
| `REACT_APP_FIREBASE_PREVIEW_PROJECT_ID` | ID exacto del proyecto de pruebas |
| `REACT_APP_FIREBASE_PREVIEW_STORAGE_BUCKET` | Storage bucket de Firebase de pruebas |
| `REACT_APP_FIREBASE_PREVIEW_MESSAGING_SENDER_ID` | Messaging sender ID de Firebase de pruebas |
| `REACT_APP_FIREBASE_PREVIEW_APP_ID` | App ID de la aplicación web de pruebas |
| `REACT_APP_FIREBASE_PREVIEW_MEASUREMENT_ID` | Measurement ID, si Firebase lo proporciona |

La variable `REACT_APP_VERCEL_ENV=preview` ya está configurada en Vercel para el destino Preview y fuerza la selección de este bloque de configuración.

## 3. Variables privadas de Vercel

Añade estas variables con destino **Preview**. Usa credenciales de la cuenta de servicio creada en el paso 1.

| Variable | Valor |
|---|---|
| `FIREBASE_PREVIEW_PROJECT_ID` | ID exacto del proyecto de pruebas |
| `FIREBASE_PREVIEW_CLIENT_EMAIL` | Correo de la cuenta de servicio de pruebas |
| `FIREBASE_PREVIEW_PRIVATE_KEY` | Clave privada de esa misma cuenta de servicio |

Como alternativa, se puede utilizar `FIREBASE_PREVIEW_SERVICE_ACCOUNT_JSON` con el JSON completo de esa cuenta. No configures ambas modalidades a menos que sea necesario.

## 4. Claves de cifrado de integraciones

Vercel Preview dispone de variables separadas para cifrar credenciales P2P:

- `BINANCE_P2P_PREVIEW_ENCRYPTION_KEY`.
- `BYBIT_P2P_PREVIEW_ENCRYPTION_KEY`.

Cada una debe ser una cadena hexadecimal aleatoria de 64 caracteres, generada de forma independiente. Nunca reutilices las claves de Producción. Los valores deben almacenarse como secretos en Vercel.

Los programadores automáticos de Producción no deben apuntar a esta rama Preview.

## 5. Desplegar las reglas

Desde un entorno con Firebase CLI autenticado, ejecuta explícitamente el despliegue al ID del proyecto de pruebas:

```bash
firebase deploy --only firestore:rules --project <FIREBASE_PREVIEW_PROJECT_ID>
```

Comprueba en la consola de Firebase que el proyecto seleccionado sea el de pruebas antes de desplegar.

## 6. Verificación antes de usar el Preview

No conectar cuentas Binance o Bybit ni registrar operaciones hasta comprobar:

- El hostname del proyecto Firebase mostrado en Authentication/Firestore corresponde al proyecto de pruebas.
- Un usuario creado desde Preview no aparece en Authentication de Producción.
- Una sesión y una operación de prueba aparecen únicamente en Firestore de Preview.
- Las integraciones Binance y Bybit se escriben únicamente en la base Preview y utilizan claves de cifrado Preview.
- Los pagos BEP20 muestran el aviso de desactivación y las APIs devuelven un error de Preview, sin exponer la dirección de Producción.
- El programador de Producción sigue apuntando exclusivamente a Producción.

## Nota de seguridad

No introduzcas en Preview la cuenta de servicio, las claves de cifrado, el wallet receptor ni las credenciales de exchanges que utilizas en Producción. Hasta completar estos pasos, Preview permanece bloqueado intencionadamente.
