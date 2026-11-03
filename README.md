# JJXCAPITAL

JJXCAPITAL es una aplicación web para **registrar, organizar y analizar operaciones P2P y arbitrajes de criptomonedas**. Permite combinar operaciones manuales con el historial importado desde Binance P2P y Bybit P2P mediante conexiones API de solo lectura.

La aplicación no custodia fondos, no ejecuta compras ni ventas y no envía órdenes a los exchanges. El usuario sigue operando directamente desde sus plataformas.

## Funcionalidades

### Órdenes y conexiones P2P

- Registro manual de compras y ventas.
- Conexión de Binance P2P y Bybit P2P mediante API.
- Importación de órdenes P2P completadas; las conexiones se utilizan para consultar el historial, no para operar.
- Sincronización automática de las conexiones mediante los procesos programados del proyecto.
- Detección de órdenes ya importadas para evitar duplicados.
- Vinculación de operaciones importadas con el arbitraje correspondiente cuando la información permite identificar una única sesión.
- Desconexión de las integraciones desde el perfil.

Las credenciales API se procesan en el servidor y se almacenan cifradas. El usuario debe crear claves en el exchange con los permisos mínimos de consulta necesarios. Nunca debe habilitar permisos de retirada ni de trading para esta aplicación.

### Arbitrajes y análisis

- Creación de arbitrajes/sesiones por par de monedas y estrategia.
- Un solo arbitraje activo por par de monedas; una sesión cerrada puede conservarse en el historial.
- Registro y asociación de órdenes manuales o importadas a las sesiones.
- Resumen de resultados y beneficio realizado.
- Cálculo FIFO para relacionar las ventas con las compras registradas.
- Simuladores P2P como herramientas de estimación; no ejecutan operaciones.
- Historial con filtros y herramientas de consulta.

### Perfil y suscripción

El modelo de uso gratuito contempla estos límites:

| Recurso | Límite gratuito |
|---|---:|
| Órdenes registradas (manuales + Binance + Bybit) | 300 |
| Arbitrajes/sesiones creados | 150 |
| Exportaciones del historial | 50 |

Las órdenes importadas desde Binance y Bybit también consumen el límite de 300 órdenes. El límite de 150 corresponde a arbitrajes creados, no a movimientos u órdenes.

**JJXCAPITAL Pro** ofrece uso ilimitado durante 30 días por 15 USDT. En la versión actual, el método de pago implementado es USDT en BNB Smart Chain (BEP20), con verificación en blockchain antes de activar la suscripción. Los pagos están deshabilitados en los despliegues Preview para impedir que las pruebas utilicen la cartera de Producción.

## Criterios de cálculo

- Las compras y ventas se analizan por par de criptomoneda/moneda de cotización.
- El beneficio realizado se calcula mediante FIFO, utilizando el coste de adquisición disponible en el historial.
- Las comisiones deben interpretarse en la moneda en la que realmente se cobran. Una comisión bancaria o del método de pago (por ejemplo, una comisión cobrada por Revolut al enviar una transferencia) es un coste externo de la operación P2P y no debe confundirse con una comisión cobrada por Binance o Bybit.
- Las monedas distintas no se suman como si tuvieran el mismo valor. Los resultados se muestran con su código de moneda (por ejemplo, EUR, USD, VES, USDT o USDC).
- Si una venta supera la cantidad de cripto cuyo coste de compra está registrado, la parte sin coste conocido no debe presentarse como beneficio realizado plenamente calculado.
- Los datos históricos incompletos deben revisarse; la aplicación no reescribe automáticamente operaciones antiguas para inventar datos que no existan.

Los resultados son herramientas de seguimiento y organización, no asesoramiento financiero ni garantía de rentabilidad.

## Arquitectura y seguridad

- **Frontend:** React con Create React App y CRACO.
- **Backend:** funciones serverless en Vercel.
- **Autenticación y datos:** Firebase Authentication y Cloud Firestore.
- **Integraciones:** APIs de consulta de Binance P2P y Bybit P2P.
- **Sincronización:** Cloudflare Worker programado y GitHub Actions como mecanismo de respaldo.
- **Pagos:** verificación de transferencias USDT en BNB Smart Chain (BEP20).

Las operaciones y los datos privados se aíslan por UID de Firebase. Las reglas de Firestore del repositorio son restrictivas y deniegan por defecto las rutas no contempladas. La configuración de reglas versionada no se aplica automáticamente a Firebase: cualquier despliegue de reglas debe dirigirse expresamente al proyecto correcto y probarse con cuentas separadas.

### Entornos Preview y Producción

Preview debe utilizar un proyecto Firebase independiente de Producción (jjxcapital-2), variables de entorno separadas y claves de cifrado independientes para Binance y Bybit. No se permite que Preview herede silenciosamente las variables genéricas de Producción. Si falta la configuración Firebase de pruebas o apunta al proyecto de Producción, el entorno Preview queda bloqueado.

La guía para preparar este entorno se encuentra en docs/PREVIEW_FIREBASE_SETUP.md. No se deben copiar al Preview credenciales, claves de cifrado, cuentas de servicio ni datos reales de Producción.

**Regla de publicación:** los cambios se desarrollan y validan en ramas y despliegues Preview. No se fusionan a main ni se publican en Producción hasta completar las comprobaciones correspondientes y revisar el cambio.

## Desarrollo local

Requisitos: Node.js y npm.

Instalación:

```bash
npm install --legacy-peer-deps
```

Pruebas:

```bash
npm test -- --watchAll=false --runInBand
```

Compilación:

```bash
npm run build
```

La compilación genera la carpeta build; no publica automáticamente la aplicación.

## Estado técnico y trabajo pendiente

- El proyecto todavía utiliza Create React App/CRACO. La migración a una herramienta de compilación mantenida (por ejemplo, Vite) debe planificarse y ejecutarse en una fase independiente, con pruebas de regresión.
- Debe mantenerse alineada la versión de Node.js entre CI y Vercel.
- Debe incorporarse y mantenerse un lockfile reproducible antes de considerar cerrada la configuración de dependencias.
- La preparación del lanzamiento requiere completar la configuración y las pruebas funcionales de Firebase Preview, validar el aislamiento entre cuentas, probar la sincronización con varias cuentas y revisar el flujo de pagos.
- Antes de abrir el servicio al público deben completarse la documentación legal y de privacidad aplicable al mercado objetivo, el procedimiento de soporte y la revisión jurídica del modelo de servicio.

## Documentación relacionada

- Configuración aislada de Firebase para Preview: docs/PREVIEW_FIREBASE_SETUP.md
- Reglas de Firestore: firestore.rules
- Configuración Firebase: firebase.json
