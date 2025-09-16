import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ArbitrageSimulator = () => {
  const [formData, setFormData] = useState({
    buy_exchange: 'Binance',
    sell_exchange: 'Bybit',
    crypto: 'USDT',
    buy_price: '',
    sell_price: '',
    amount: '',
    buy_fee: '0',
    sell_fee: '0'
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/simulate/arbitrage`, {
        buy_exchange: formData.buy_exchange,
        sell_exchange: formData.sell_exchange,
        crypto: formData.crypto,
        buy_price: parseFloat(formData.buy_price),
        sell_price: parseFloat(formData.sell_price),
        amount: parseFloat(formData.amount),
        buy_fee: parseFloat(formData.buy_fee),
        sell_fee: parseFloat(formData.sell_fee)
      });
      
      setResult(response.data);
    } catch (error) {
      console.error('Error simulating arbitrage:', error);
      alert('Error al simular el arbitraje');
    } finally {
      setLoading(false);
    }
  };

  const isProfit = result && result.profit > 0;

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">
          ⚡ Simulador de Arbitraje
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Criptomoneda:
            </label>
            <select
              name="crypto"
              value={formData.crypto}
              onChange={handleChange}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            >
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="BNB">BNB</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Exchange de Compra:
              </label>
              <select
                name="buy_exchange"
                value={formData.buy_exchange}
                onChange={handleChange}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              >
                <option value="Binance">Binance</option>
                <option value="Bybit">Bybit</option>
                <option value="OKX">OKX</option>
                <option value="KuCoin">KuCoin</option>
              </select>
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Exchange de Venta:
              </label>
              <select
                name="sell_exchange"
                value={formData.sell_exchange}
                onChange={handleChange}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              >
                <option value="Binance">Binance</option>
                <option value="Bybit">Bybit</option>
                <option value="OKX">OKX</option>
                <option value="KuCoin">KuCoin</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Precio de Compra:
              </label>
              <input
                type="number"
                name="buy_price"
                value={formData.buy_price}
                onChange={handleChange}
                step="0.0001"
                required
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Precio de Venta:
              </label>
              <input
                type="number"
                name="sell_price"
                value={formData.sell_price}
                onChange={handleChange}
                step="0.0001"
                required
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Cantidad a arbitrar:
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.0001"
              required
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Comisión Compra:
              </label>
              <input
                type="number"
                name="buy_fee"
                value={formData.buy_fee}
                onChange={handleChange}
                step="0.0001"
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Comisión Venta:
              </label>
              <input
                type="number"
                name="sell_fee"
                value={formData.sell_fee}
                onChange={handleChange}
                step="0.0001"
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? 'Calculando...' : 'Calcular Arbitraje'}
          </button>
        </form>
      </div>

      {result && (
        <div className={`rounded-lg p-6 ${isProfit ? 'bg-green-800' : 'bg-red-800'}`}>
          <h3 className={`text-xl font-bold mb-4 ${isProfit ? 'text-green-100' : 'text-red-100'}`}>
            📊 Resultado del Arbitraje
          </h3>
          <div className={`space-y-2 ${isProfit ? 'text-green-100' : 'text-red-100'}`}>
            <p><strong>Compra en:</strong> {result.buy_exchange} a {formData.buy_price}</p>
            <p><strong>Venta en:</strong> {result.sell_exchange} a {formData.sell_price}</p>
            <p><strong>Inversión total:</strong> ${result.investment.toFixed(4)}</p>
            <p><strong>Ingresos totales:</strong> ${result.revenue.toFixed(4)}</p>
            <p><strong>Comisiones totales:</strong> ${result.total_fees.toFixed(4)}</p>
            <p className={`text-lg font-bold border-t pt-2 ${isProfit ? 'border-green-600' : 'border-red-600'}`}>
              <strong>Ganancia/Pérdida:</strong> ${result.profit.toFixed(4)} ({result.profit_percentage.toFixed(2)}%)
            </p>
            {isProfit ? (
              <p className="text-green-200 text-sm">✅ Oportunidad rentable!</p>
            ) : (
              <p className="text-red-200 text-sm">❌ No es rentable en estas condiciones.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArbitrageSimulator;