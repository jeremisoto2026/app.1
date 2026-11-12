# Decisiones de producto y preparación del lanzamiento

Documento interno de referencia para mantener alineados el comportamiento de JJXCAPITAL, la interfaz, el backend y la documentación pública. Actualizarlo cuando una decisión se implemente o cambie.

## 1. Alcance del producto

- JJXCAPITAL es software para registrar, organizar y analizar operaciones P2P y arbitrajes.
- No custodia fondos de usuarios, no ejecuta compras/ventas y no envía órdenes a Binance ni a Bybit.
- Las APIs de Binance Global y Bybit Global se utilizan para consultar e importar órdenes P2P completadas.
- El mercado objetivo inicial es Latinoamérica. Esto no elimina la necesidad de revisar las obligaciones legales aplicables al titular del servicio y a cada mercado antes de comercializarlo.
- La comunicación del producto debe evitar promesas de rentabilidad y no presentarlo como exchange, intermediario o ejecutor de operaciones.

## 2. Reglas de uso gratuito

| Recurso | Límite | Qué cuenta |
|---|---:|---|
| Órdenes | 300 | Cada orden registrada manualmente o importada desde Binance/Bybit. |
| Arbitrajes | 150 | Cada sesión/arbitraje creado por el usuario. No son órdenes ni movimientos. |
| Exportaciones | 50 | Cada exportación del historial. |

Las órdenes importadas cuentan dentro del mismo límite de 300 que las órdenes manuales. Al alcanzar el límite, las importaciones deben pausarse conservando el cursor/página pendiente para que puedan reanudarse con Pro. La migración de contadores debe respetar el uso histórico y no reiniciar cuotas.

## 3. Integraciones y credenciales

- Binance P2P y Bybit P2P son integraciones de solo lectura.
- Las credenciales se validan y cifran en el servidor. La interfaz no debe exponer claves secretas.
- La aplicación nunca debe solicitar permisos de retirada o trading.
- Requisito de seguridad pendiente: impedir que una misma API key se registre en cuentas diferentes de JJXCAPITAL. La comprobación debe hacerse en backend, de forma atómica, sin almacenar la clave en texto plano y sin permitir que el cliente manipule el identificador de unicidad.
- La desconexión y la sustitución de una API deben liberar o actualizar correctamente la reserva de unicidad, sin dejar bloqueos huérfanos.

## 4. Comisiones y resultados

- No se debe asumir que todo coste relacionado con una operación P2P es una comisión del exchange.
- Bybit P2P no parece cobrar comisión propia por la operación P2P según la validación del producto; sin embargo, el banco o el método de pago elegido por el usuario (por ejemplo, Revolut) puede cobrar una comisión de transferencia.
- Las comisiones del exchange y los costes externos del método de pago deben poder distinguirse y registrarse por separado, con su importe y moneda.
- No se debe descontar un coste de una moneda incorrecta ni presentarse como beneficio neto definitivo un resultado que omita costes no verificados.
- La lógica FIFO debe contrastarse con operaciones reales de compra y venta de ambas plataformas antes de publicitar cálculos como beneficio neto preciso.

## 5. Suscripción y pagos

- JJXCAPITAL Pro: 15 USDT por 30 días, con límites de órdenes, arbitrajes y exportaciones ilimitados.
- El método implementado actualmente es USDT en BNB Smart Chain (BEP20). La activación depende de la verificación del pago en blockchain.
- Mejora acordada: sustituir la asignación de importes únicos por una validación basada en el TxID de la transferencia, evitando el límite de importes únicos disponibles. Debe comprobarse la red, el contrato/token, la dirección receptora, el importe, las confirmaciones y que el TxID no haya sido utilizado previamente.
- Los pagos con tarjeta o pasarelas externas se posponen para una fase futura, cuando exista presupuesto para el proveedor.
- La dirección receptora debe proceder de configuración explícita del servidor. Preview no debe mostrar ni utilizar la cartera o el contrato de Producción.
- Antes de comercializar deben definirse procedimientos de conciliación de pagos, transferencias tardías, pagos no reconocidos, reclamaciones y reembolsos, junto con la documentación legal que corresponda.

## 6. Entornos y despliegues

- Preview y Producción son dos destinos de despliegue de **la misma aplicación**, el mismo repositorio GitHub y el mismo proyecto de Vercel `app-1`. No se mantiene una segunda aplicación ni se duplica el frontend.
- Todo cambio se desarrolla primero en una rama y se valida en su despliegue Vercel Preview. Solo después de revisar y aprobar los resultados se integra en `main`, que alimenta Producción.
- La separación necesaria está en los datos y secretos: Preview utiliza un proyecto Firebase de pruebas, con Auth, Firestore y cuenta de servicio propios. Así se conserva el mismo código y estructura de aplicación, pero los registros de prueba no pueden modificar perfiles, operaciones ni sesiones reales.
- Preview utiliza claves de cifrado propias y variables con destino Preview. Nunca debe recurrir como alternativa a las credenciales de Producción.
- Los pagos BEP20 están deshabilitados en Preview y no se debe exponer la cartera receptora de Producción.
- No conectar API keys reales ni introducir datos reales en Preview. Para validar las integraciones se usan cuentas/credenciales de prueba con permisos de solo lectura.
- No usar bases de datos adicionales de Firestore en Public Preview como sustituto de un entorno de prueba soportado.
- La guía operativa está en PREVIEW_FIREBASE_SETUP.md.
- El dominio propio y el cambio de Vercel Hobby a Pro se posponen hasta que la plataforma esté completa y lista para el lanzamiento.

## 7. Capacidad y pruebas de beta

- Cloudflare Worker es el programador principal de sincronización; GitHub Actions permanece como respaldo.
- Antes del lanzamiento debe medirse la sincronización con varias cuentas y con escenarios de 50 y 100 usuarios: duración por cuenta, órdenes por lote, errores, reintentos, bloqueos y cola pendiente.
- La beta controlada debe incluir usuarios externos y verificar registro, recuperación de contraseña, conexión de ambas APIs, importaciones, deduplicación, arbitrajes, pagos y vencimiento de Pro.

## 8. Seguridad, privacidad y cuestiones legales pendientes

- Comprobar que las reglas desplegadas de Firestore coinciden con las versionadas.
- Probar aislamiento entre dos cuentas distintas, incluyendo operaciones, sesiones, integraciones y pagos.
- Revisar revocación de tokens/cuentas deshabilitadas y límites de frecuencia en operaciones sensibles.
- Diseñar un procedimiento correcto para solicitudes de eliminación de cuenta y datos; desconectar una API no equivale a borrar todos los datos de la cuenta.
- Preparar política de privacidad, términos, información del prestador, condiciones de contratación/pago, reembolsos y reclamaciones antes de comercializar.
- Obtener revisión jurídica del alcance real del servicio y de los países objetivo. El hecho de que la aplicación sea una herramienta de registro no sustituye esta revisión.

## 9. Deuda técnica

- Incorporar un lockfile reproducible y alinear Node.js entre CI y Vercel.
- Actualizar README y documentación cuando cambie el comportamiento real.
- Planificar la migración desde Create React App/CRACO a una herramienta mantenida, en una fase independiente y con pruebas de regresión.

## 10. Orden de trabajo recomendado

1. Completar el aislamiento de Preview y corregir/validar las cuotas gratuitas.
2. Configurar Firebase de pruebas y verificar que Preview no puede acceder a Producción.
3. Implementar la unicidad de API keys entre cuentas y probar conexión, sustitución y desconexión.
4. Separar las comisiones del exchange de los costes bancarios/métodos de pago y validar los cálculos FIFO con operaciones reales.
5. Migrar la verificación de pagos al TxID con controles contra reutilización y conciliación.
6. Fortalecer el aislamiento entre cuentas, revocación de tokens y límites de frecuencia.
7. Ejecutar pruebas de carga de sincronización y una beta controlada.
8. Alinear dependencias, Node.js, lockfile y planificar la migración de CRA.
9. Completar documentación legal, privacidad, soporte y revisión jurídica antes del lanzamiento.
10. Solo al final: dominio propio, plan Vercel adecuado y lanzamiento público.

Este orden no autoriza a saltarse las validaciones de seguridad ni a fusionar cambios a Producción antes de que las pruebas correspondientes estén completas.
