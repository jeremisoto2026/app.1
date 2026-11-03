# JJXCAPITAL · sincronización Binance + Bybit P2P cada minuto

El Worker existente `jjxcapital-binance-p2p-sync` activa los endpoints internos de JJXCAPITAL cada minuto. No contiene claves de los exchanges ni consulta directamente a Binance o Bybit: solo inicia la sincronización ya implementada en Vercel.

## Actualizar el Worker existente

No crees un segundo Worker ni cambies el nombre actual. Actualiza el Worker `jjxcapital-binance-p2p-sync` con el contenido de `binance-p2p-sync-worker.js` de este repositorio.

En **Settings → Variables and Secrets**, deben existir estos dos secretos:

| Secreto de Cloudflare | Uso |
| --- | --- |
| `BINANCE_P2P_SCHEDULER_SECRET` | Autenticar la sincronización de Binance |
| `BYBIT_P2P_SCHEDULER_SECRET` | Autenticar la sincronización de Bybit |

Cada secreto debe tener al menos 32 caracteres aleatorios y coincidir exactamente con la variable sensible correspondiente del entorno **Production** del proyecto `app-1` en Vercel. Son secretos independientes: no reutilices el secreto de Binance para Bybit. No los guardes en Git ni en `wrangler.toml`.

En **Settings → Triggers → Cron Triggers**, conserva `* * * * *`. Después de actualizar el código y los secretos, guarda y despliega el Worker.

## Despliegue desde la terminal (alternativa)

Desde esta carpeta:

1. Ejecuta `npx wrangler login` y autoriza tu cuenta Cloudflare.
2. Configura el secreto de Binance: `npx wrangler secret put BINANCE_P2P_SCHEDULER_SECRET`.
3. Configura el secreto de Bybit: `npx wrangler secret put BYBIT_P2P_SCHEDULER_SECRET`.
4. Ejecuta `npx wrangler deploy`.

El archivo `wrangler.toml` conserva el nombre del Worker existente y configura el cron `* * * * *` (cada minuto).

## Funcionamiento

- Cada ejecución intenta sincronizar Binance y Bybit de forma independiente.
- Cada exchange dispone de su propio secreto, endpoint, bloqueo y cursor de Firestore.
- Se procesan hasta ocho lotes por exchange y ejecución; cada lote procesa como máximo una cuenta conectada.
- Binance continúa usando el endpoint original. Bybit usa el mismo endpoint con `?provider=bybit`.
- Si Bybit no tiene todavía configurado su secreto en Cloudflare, se omite únicamente Bybit; la sincronización de Binance continúa.
- Si un proveedor falla, el Worker igualmente intenta ejecutar el otro y registra el error.
- GitHub Actions conserva la ejecución cada cinco minutos como respaldo.
- El botón «Sincronizar ahora» continúa disponible.

## Límites del plan gratuito

El Worker se programa 1.440 veces al día. Cada ejecución puede realizar hasta ocho llamadas para Binance y ocho para Bybit (16 en total), por debajo del límite de 50 subsolicitudes por ejecución. Supervisa el uso real de tu plan Cloudflare.

## Seguridad

Los endpoints comprueban su secreto correspondiente con comparación en tiempo constante. El programador de respaldo de GitHub Actions mantiene la verificación OIDC. Las API Keys de los exchanges nunca se envían a Cloudflare: permanecen cifradas en Firestore y solo las descifra el backend de Vercel.
