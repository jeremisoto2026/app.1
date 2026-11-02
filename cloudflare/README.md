# JJXCAPITAL · sincronización Binance P2P cada minuto

Este Worker activa el endpoint interno de JJXCAPITAL cada minuto. No contiene claves de Binance ni consulta Binance directamente: solo inicia la sincronización ya implementada en Vercel.

## Despliegue

Desde esta carpeta:

1. Tener una cuenta Cloudflare con Workers habilitado.
2. Ejecutar `npx wrangler login` y autorizar la cuenta.
3. Ejecutar `npx wrangler secret put BINANCE_P2P_SCHEDULER_SECRET` e introducir el secreto compartido.
4. Ejecutar `npx wrangler deploy`.

El archivo `wrangler.toml` configura el cron `* * * * *` (cada minuto). No guardes el secreto en este repositorio ni en el archivo TOML.

La misma variable debe estar configurada como variable de entorno de producción en Vercel, en el proyecto `app-1`.

## Funcionamiento

- Cada ejecución procesa hasta ocho lotes, reutilizando el cursor y el bloqueo global de Firestore.
- Cada lote procesa como máximo una cuenta conectada, igual que el proceso actual.
- Si detecta otra ejecución activa, termina sin duplicar el trabajo.
- GitHub Actions conserva su ejecución cada cinco minutos como respaldo.
- El botón «Sincronizar ahora» continúa disponible.

## Seguridad

El endpoint acepta el secreto externo solo cuando coincide con `BINANCE_P2P_SCHEDULER_SECRET`, comparándolo en tiempo constante. La verificación OIDC restringida a GitHub Actions sigue activa para el programador de respaldo. El secreto no se incluye en el código ni en Git.
