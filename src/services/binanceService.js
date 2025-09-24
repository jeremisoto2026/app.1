import { createHmac } from 'crypto';

export class BinanceP2PService {
  static async getNewP2POrders(apiKey, secretKey, lastCheckTime = null) {
    try {
      const timestamp = Date.now();
      
      // Solo órdenes desde la última verificación
      const startTime = lastCheckTime || Date.now() - (5 * 60 * 1000); // Últimos 5 min si es primera vez
      
      const queryParams = new URLSearchParams({
        timestamp: timestamp.toString(),
        startTime: startTime.toString(),
        endTime: timestamp.toString()
      });

      const signature = createHmac('sha256', secretKey)
        .update(queryParams.toString())
        .digest('hex');

      queryParams.append('signature', signature);

      const response = await fetch(`/api/binance-proxy?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey
        }
      });

      if (!response.ok) {
        throw new Error('Error al conectar con Binance');
      }

      const data = await response.json();
      return {
        orders: data.data || [],
        lastCheckTime: timestamp,
        newOrdersCount: data.data ? data.data.length : 0
      };
    } catch (error) {
      console.error('Error en Binance Service:', error);
      throw error;
    }
  }

  // Verificar que las API Keys son válidas
  static async validateApiKeys(apiKey, secretKey) {
    try {
      const result = await this.getNewP2POrders(apiKey, secretKey);
      return { valid: true, userInfo: result };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}