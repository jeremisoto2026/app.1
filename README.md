# JJXCAPITAL

Aplicación web para registrar operaciones manuales de compra y venta de criptomonedas, calcular el beneficio realizado con el coste de compra conocido y consultar el historial.

## Funciones disponibles

- Registro manual de compras y ventas con cantidades, tasa de cambio y comisiones.
- Resumen de beneficio realizado por moneda de cotización.
- Método FIFO para emparejar ventas con compras registradas.
- Simuladores P2P y de arbitraje. Son estimaciones manuales: no envían órdenes.
- Historial filtrable y exportación CSV ordenada cronológicamente.
- Navegación adaptable a escritorio y móvil.
- Acceso mediante correo/contraseña o Google.

## Funciones retiradas o no habilitadas

- La interfaz ya no ofrece conexión de una cuenta de Binance mediante API.
- No hay pasarela de pago ni contratación de suscripciones habilitada.
- Las notificaciones push no están habilitadas en esta versión.
- Se retiró el seguimiento de analítica de terceros que venía en la plantilla; no se inicializa PostHog desde la página.

**Nota sobre el backend:** esta rama solo modifica `app.1`. Si existe un servicio de Binance API desplegado por separado (por ejemplo, en Railway), estos cambios del frontend no lo apagan ni eliminan las credenciales que estén guardadas allí. Para deshabilitar también ese servicio se necesita un cambio y un despliegue independiente. Si alguna API key ya se conectó y quieres dejar de usarla, revócala desde la gestión de API de Binance.

## Reglas de cálculo

- En una compra, el importe fiat es el coste y la comisión indicada se resta de la cantidad de cripto recibida.
- En una venta, la comisión indicada se resta del importe recibido en la moneda de cotización.
- El beneficio se calcula por par de criptomoneda/moneda de cotización mediante FIFO, solo sobre cantidades cuyo coste de adquisición consta en el historial.
- Las ganancias se muestran con el código de moneda correspondiente (por ejemplo, `USD`, `USDT`, `EUR` o `VES`). No se suman monedas diferentes como si fueran equivalentes.
- Las ventas que exceden la cripto comprada registrada no se cuentan como ventas totalmente cerradas para la tasa de éxito.
- Las operaciones antiguas de Firestore no se migran ni reescriben automáticamente. Si a un registro histórico le faltan fechas, cantidades, coste o comisiones, los datos originales deben revisarse por separado.

## Desarrollo y validación

Requisitos: Node.js y npm.

```bash
npm install --legacy-peer-deps
npm test -- --watchAll=false --runInBand
npm run build
```

La compilación solo genera la carpeta `build`; no publica automáticamente la aplicación.

## Configuración y seguridad

La autenticación y los datos se gestionan con Firebase; revisa que las reglas de Firestore permitan a cada usuario leer y escribir solo sus propios documentos y operaciones. La configuración cliente de Firebase es pública por diseño, pero las claves privadas y secretos nunca deben incluirse en código frontend ni en el repositorio.
