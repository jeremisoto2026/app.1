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

La autenticación y los datos se gestionan con Firebase. Esta rama incluye una configuración de reglas base en `firestore.rules` y `firebase.json`:

- Cada usuario autenticado solo puede leer su propio documento `users/{uid}` y la subcolección `users/{uid}/operations`.
- No se permite enumerar perfiles de usuarios.
- El alta del perfil exige el plan `free`; el cliente no puede cambiar por su cuenta el plan ni la fecha de creación de la cuenta.
- Cualquier ruta de Firestore no contemplada queda denegada.

**Importante:** añadir estos archivos al repositorio no cambia las reglas activas en Firebase. Antes de desplegarlas, compáralas con las reglas actuales de la consola y prueba al menos dos cuentas distintas: cada cuenta debe poder leer y escribir sus operaciones, pero no acceder al perfil ni a las operaciones de la otra. La publicación de reglas es independiente del despliegue de Vercel y puede bloquear funciones de otra aplicación si el mismo proyecto de Firebase se comparte con otros clientes.

Una vez revisadas y probadas con el proyecto correcto, se pueden desplegar explícitamente con `firebase deploy --only firestore:rules --project jjxcapital-2` usando Firebase CLI autenticado. **No se han desplegado desde esta PR.** No se deben guardar claves de cuentas de servicio, tokens ni secretos de Firebase en el frontend o en GitHub.

La configuración cliente del SDK de Firebase está diseñada para ser visible; la seguridad real depende de reglas restrictivas, autenticación y restricciones adecuadas de las API.

## Diseño y experiencia de usuario

- Portada responsive con una jerarquía visual más clara, llamadas a la acción concisas y una vista previa ilustrativa que no presenta cifras ficticias como si fueran datos reales.
- Identidad visual consistente para el espacio de trabajo: fondos oscuros sobrios, acentos violeta/azul, superficies con contraste y controles de formulario unificados.
- Resumen financiero orientado a datos reales, estados vacíos explícitos, flujos de trabajo recomendados y accesos rápidos al registro y al historial.
- Formularios de autenticación y edición adaptables a pantallas pequeñas, con foco de teclado visible y soporte para la preferencia de movimiento reducido.
- Desde el historial se pueden editar las cantidades, el par de monedas, la plataforma y las comisiones de una operación. La edición vuelve a calcular importes derivados y conserva la fecha original; cambiar importes puede alterar el beneficio FIFO de ventas posteriores. El historial también permite ordenar por fecha, limpiar filtros, consultar recuentos y navegar por páginas de diez operaciones; la paginación se ajusta al eliminar registros.
- Metadatos de navegador actualizados y tipografía basada en fuentes del sistema para evitar una solicitud de fuente externa innecesaria.

La interfaz no promete beneficios, no ejecuta órdenes de trading y no sustituye la verificación de los registros financieros. Antes de publicar se deben validar visualmente los principales flujos con una sesión real y probar los permisos de Firebase con cuentas separadas.
