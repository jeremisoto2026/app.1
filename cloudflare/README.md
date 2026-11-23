# JJXCAPITAL · sincronización P2P aislada por entorno

El Worker llama únicamente a los endpoints internos de JJXCAPITAL en Vercel. No contiene claves de Binance o Bybit ni consulta directamente a los exchanges.

## Producción: Worker existente

El Worker activo conserva su nombre y programación:

- Nombre: `jjxcapital-binance-p2p-sync`
- Configuración: `wrangler.toml`
- Endpoint: `https://app-1-nu-five.vercel.app/api/integrations/binance-p2p/sync`
- Cron: `* * * * *`

Sus secretos actuales siguen siendo los de Vercel **Production**:

| Secreto en Cloudflare | Variable en Vercel Production |
| --- | --- |
| `BINANCE_P2P_SCHEDULER_SECRET` | `BINANCE_P2P_SCHEDULER_SECRET` |
| `BYBIT_P2P_SCHEDULER_SECRET` | `BYBIT_P2P_SCHEDULER_SECRET` |

**No despliegues ni cambies este Worker como parte de la validación de Preview.**

## Preview: Worker independiente

La configuración `wrangler.preview.toml` define un Worker separado:

- Nombre: `jjxcapital-p2p-sync-preview`
- Endpoint: alias estable de la rama `feat/preview-quota-model`
- Cron: `*/5 * * * *` (cada cinco minutos)
- Datos: Firebase Preview `jjxcapital-preview`

Crea en Vercel, con tipo **Secret**, objetivo **Preview** y rama `feat/preview-quota-model`, las dos variables siguientes. No las asignes a Production:

| Variable secreta Vercel Preview | Uso |
| --- | --- |
| `BINANCE_P2P_PREVIEW_SCHEDULER_SECRET` | Autorizar el Worker Preview para Binance |
| `BYBIT_P2P_PREVIEW_SCHEDULER_SECRET` | Autorizar el Worker Preview para Bybit |

Genera dos valores aleatorios independientes de al menos 32 caracteres. En el Worker Preview se guardan los mismos valores bajo los nombres `BINANCE_P2P_SCHEDULER_SECRET` y `BYBIT_P2P_SCHEDULER_SECRET`. Aunque los nombres del Worker coincidan con Production, sus valores deben ser distintos.

## Acceso al Preview protegido por Vercel SSO

El proyecto `app-1` tiene SSO activado para los despliegues Preview. El Worker necesita un bypass de automatización para llamar al alias de la rama:

1. En Vercel abre **Project Settings → Deployment Protection → Automation Bypass** y genera un secreto de automatización.
2. Guárdalo exclusivamente en el Worker Cloudflare Preview como `VERCEL_AUTOMATION_BYPASS_SECRET`.
3. El Worker lo envía mediante el encabezado `x-vercel-protection-bypass`. No lo publiques ni lo añadas a Git, a `wrangler.toml` ni a variables del frontend.

El Worker se niega a llamar a Preview cuando falta el bypass. También valida el host y la ruta exactos; no acepta destinos arbitrarios.

## Configurar y desplegar solo el Worker Preview

Desde la carpeta `cloudflare`:

1. Ejecuta `npx wrangler login` y autoriza la cuenta Cloudflare.
2. Configura los tres secretos con `npx wrangler secret put BINANCE_P2P_SCHEDULER_SECRET --config wrangler.preview.toml`, `npx wrangler secret put BYBIT_P2P_SCHEDULER_SECRET --config wrangler.preview.toml` y `npx wrangler secret put VERCEL_AUTOMATION_BYPASS_SECRET --config wrangler.preview.toml`.
3. Ejecuta `npx wrangler deploy --config wrangler.preview.toml`.

**Comprueba que cada comando incluya `--config wrangler.preview.toml`.** Sin esa opción, Wrangler usa la configuración del Worker existente.

No despliegues Preview hasta que las dos claves de programador estén guardadas en Vercel Preview y los tres secretos estén guardados en el Worker separado. Esta preparación en GitHub no despliega ningún Worker.

## Funcionamiento y seguridad

- Binance y Bybit se procesan independientemente, con secretos, bloqueos y cursores propios.
- Se procesan hasta ocho lotes por proveedor en cada ejecución.
- Cada endpoint procesa como máximo una cuenta conectada por lote.
- Bybit usa la misma ruta con `?provider=bybit`.
- Un fallo en un proveedor no impide intentar el otro.
- GitHub Actions conserva el programador de respaldo de Producción cada cinco minutos.
- El botón «Sincronizar ahora» continúa disponible.
- Las claves API de los exchanges permanecen cifradas en Firestore y solo se descifran en el backend.
- El backend selecciona explícitamente secretos Production o Preview según `VERCEL_ENV`; Preview nunca utiliza un secreto de Production como alternativa.
- Los endpoints validan los secretos con comparación en tiempo constante; GitHub Actions mantiene la verificación OIDC.

<!-- Cloudflare Preview build trigger: documentation-only change; no Worker configuration changed. -->
