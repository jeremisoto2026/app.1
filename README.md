# JJXCAPITAL

Aplicación web para registrar operaciones de compra y venta de criptomonedas, calcular resultados con el coste de compra conocido y exportar el historial.

## Funciones disponibles

- Registro manual de compras y ventas, con importe, tasa de cambio y comisión.
- Resumen de beneficio realizado calculado con coste de adquisición FIFO.
- Resultados agrupados por moneda de cotización; USD, USDT, EUR, VES y otras monedas no se mezclan entre sí.
- Simulador de conversión P2P y simulador de arbitraje con comisiones explícitas.
- Historial filtrable y exportación CSV.

## Funciones que no están habilitadas

- No se conecta una cuenta de Binance mediante API desde el frontend.
- No hay contratación de suscripciones ni pasarela de pago activa en la interfaz.
- El simulador calcula escenarios hipotéticos; no ejecuta órdenes ni garantiza ganancias.

## Reglas de cálculo

- En una compra, la comisión registrada se resta de la cantidad de cripto recibida; el importe fiat representa el coste.
- En una venta, la comisión se resta del importe recibido en moneda de cotización.
- El beneficio realizado utiliza el método FIFO por par de criptomoneda y moneda de cotización y solo se calcula sobre cantidades cuya adquisición consta en el historial.
- Si falta una fecha fiable o el coste de compra, esa operación no se inventa como beneficio. Las operaciones antiguas ya guardadas no se convierten ni se reescriben automáticamente.

## Desarrollo y validación

Requisitos: Node.js y npm.

```bash
npm install --legacy-peer-deps
npm test -- --watchAll=false --runInBand
npm run build
```

La compilación solo genera la carpeta `build`; este proyecto no despliega cambios por ejecutar los comandos anteriores.

## Configuración

La autenticación y los datos de usuario se gestionan con Firebase. El proyecto requiere sus variables/configuración de Firebase válidas y reglas de Firestore apropiadas. No publiques credenciales privadas ni claves secretas en el frontend.
