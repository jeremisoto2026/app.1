# JJXCAPITAL

Aplicación web para registrar operaciones manuales de compra y venta de criptomonedas, calcular el beneficio realizado con el coste de compra conocido y consultar el historial.

## Funciones disponibles

- Registro manual de compras y ventas con cantidades, moneda de cotización, tasa de cambio y comisiones.
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

- En una compra, el importe en la moneda de cotización es el coste y la comisión indicada se resta de la cantidad de cripto recibida.
- En una venta, la comisión indicada se resta del importe recibido en la moneda de cotización.
- El beneficio se calcula por par de criptomoneda/moneda de cotización mediante FIFO, solo sobre cantidades cuyo coste de adquisición consta en el historial.
- Las ganancias se muestran con el código de moneda correspondiente (por ejemplo, `USD`, `USDT`, `USDC`, `EUR` o `VES`). No se suman monedas diferentes como si fueran equivalentes.
- La aplicación conserva el nombre técnico histórico `fiat` en los documentos, pero ese campo representa la moneda de cotización: puede ser una moneda tradicional (EUR, USD, VES) o una stablecoin (USDT, USDC).
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

## Diseño y experiencia de usuario

- Portada responsive con una jerarquía visual más clara, llamadas a la acción concisas y una vista previa ilustrativa que no presenta cifras ficticias como si fueran datos reales.
- Identidad visual consistente para el espacio de trabajo: fondos oscuros sobrios, acentos violeta/azul, superficies con contraste y controles de formulario unificados.
- Resumen financiero orientado a datos reales, estados vacíos explícitos, flujos de trabajo recomendados y accesos rápidos al registro y al historial.
- Formularios de autenticación y edición adaptables a pantallas pequeñas, con foco de teclado visible y soporte para la preferencia de movimiento reducido.
- Desde el historial se pueden editar las cantidades, el par de monedas, la plataforma y las comisiones de una operación. La edición vuelve a calcular importes derivados y conserva la fecha original; cambiar importes puede alterar el beneficio FIFO de ventas posteriores. El historial también permite ordenar por fecha, limpiar filtros, consultar recuentos y navegar por páginas de diez operaciones; la paginación se ajusta al eliminar registros.
- Metadatos de navegador actualizados y tipografía basada en fuentes del sistema para evitar una solicitud de fuente externa innecesaria.

La interfaz no promete beneficios, no ejecuta órdenes de trading y no sustituye la verificación de los registros financieros. Antes de publicar se deben validar visualmente los principales flujos con una sesión real y probar los permisos de Firebase con cuentas separadas.
