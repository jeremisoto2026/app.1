# JJXCAPITAL · sincronización Binance P2P cada minuto

Este Worker activa el endpoint interno de JJXCAPITAL cada minuto. No contiene claves de Binance ni consulta Binance directamente: solo inicia la sincronización ya implementada en Vercel.

## Despliegue desde el panel de Cloudflare

1. Crea o inicia sesión en una cuenta gratuita de Cloudflare.
2. Abre **Workers & Pages** y crea un Worker.
3. Usa el nombre `jjxcapital-binance-p2p-sync` y pega el contenido de `binance-p2p-sync-worker.js` desde este repositorio.
4. En **Settings → Variables and Secrets**, añade el secreto `BINANCE_P2P_SCHEDULER_SECRET`.
5. En **Settings → Triggers → Cron Triggers**, configura `* * * * *`.
6. Guarda y despliega el Worker.

El mismo secreto debe configurarse como variable de entorno de producción en Vercel, proyecto `app-1`. No guardes el secreto en el repositorio ni en el archivo TOML.

## Despliegue desde la terminal (alternativa)

Desde esta carpeta:

1. Ejecuta `npx wrangler login` y autoriza tu cuenta Cloudflare.
2. Ejecuta `npx wrangler secret put BINANCE_P2P_SCHEDULER_SECRET` e introduce el secreto compartido.
3. Ejecuta `npx wrangler deploy`.

El archivo `wrangler.toml` configura el cron `* * * * *` (cada minuto).

## Funcionamiento

- Cada ejecución procesa hasta ocho lotes, reutilizando el cursor y el bloqueo global de Firestore.
- Cada lote procesa como máximo una cuenta conectada, igual que el proceso actual.
- Si detecta otra ejecución activa, termina sin duplicar el trabajo.
- GitHub Actions conserva su ejecución cada cinco minutos como respaldo.
- El botón «Sincronizar ahora» continúa disponible.

## Límites del plan gratuito

Cloudflare Workers Free incluye 100.000 solicitudes por día y 50 subsolicitudes por ejecución. Este Worker se programa 1.440 veces al día y realiza como máximo ocho llamadas al endpoint de JJXCAPITAL por ejecución, dentro de esos límites según el uso previsto. Cloudflare no factura las subsolicitudes salientes del Worker como solicitudes de entrada.

## Seguridad

El endpoint acepta el secreto externo solo cuando coincide con `BINANCE_P2P_SCHEDULER_SECRET`, comparándolo en tiempo constante. La verificación OIDC restringida a GitHub Actions sigue activa para el programador de respaldo. El secreto no se incluye en el código ni en Git.
