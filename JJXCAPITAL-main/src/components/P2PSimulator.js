import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const P2PSimulator = () => {
  const [formData, setFormData] = useState({
    crypto: 'USDT',
    fiat: 'EUR',
    exchange: 'Binance',
    operation_type: 'Venta',
    amount: '',
    exchange_rate: '',
    fee: '0'
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
      const response = await axios.post(`${API}/simulate/p2p`, {
        crypto: formData.crypto,
        fiat: formData.fiat,
        exchange: formData.exchange,
        operation_type: formData.operation_type,
        amount: parseFloat(formData.amount),
        exchange_rate: parseFloat(formData.exchange_rate),
        fee: parseFloat(formData.fee)
      });
      
      setResult(response.data);
    } catch (error) {
      console.error('Error simulating P2P:', error);
      alert('Error al simular la operación P2P');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">
          💱 Simulador P2P
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Moneda Cripto:
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

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Moneda Fiat:
            </label>
            <select
              name="fiat"
              value={formData.fiat}
              onChange={handleChange}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="VES">VES</option>
              <option value="MXN">MXN</option>
              <option value="COP">COP</option>
              <option value="ARS">ARS</option>
              <option value="BRL">BRL</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Plataforma:
            </label>
            <select
              name="exchange"
              value={formData.exchange}
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
              Tipo de operación:
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="operation_type"
                  value="Venta"
                  checked={formData.operation_type === 'Venta'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-white">Venta</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="operation_type"
                  value="Compra"
                  checked={formData.operation_type === 'Compra'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-white">Compra</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Monto {formData.operation_type === 'Venta' ? formData.crypto : formData.fiat}:
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

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Tasa de cambio:
            </label>
            <input
              type="number"
              name="exchange_rate"
              value={formData.exchange_rate}
              onChange={handleChange}
              step="0.0001"
              required
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Comisión:
            </label>
            <input
              type="number"
              name="fee"
              value={formData.fee}
              onChange={handleChange}
              step="0.0001"
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? 'Calculando...' : 'Calcular'}
          </button>
        </form>
      </div>

      {result && (
        <div className="bg-green-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-green-100 mb-4">
            📊 Resultado de la Simulación
          </h3>
          <div className="space-y-2 text-green-100">
            <p><strong>Operación:</strong> {result.operation_type}</p>
            <p><strong>Envías:</strong> {result.amount_sent.toFixed(4)} {formData.operation_type === 'Venta' ? formData.crypto : formData.fiat}</p>
            <p><strong>Recibes (bruto):</strong> {result.amount_received.toFixed(4)} {formData.operation_type === 'Venta' ? formData.fiat : formData.crypto}</p>
            <p><strong>Comisión:</strong> {result.fee.toFixed(4)}</p>
            <p className="text-lg font-bold border-t border-green-600 pt-2">
              <strong>Recibes (neto):</strong> {result.net_amount.toFixed(4)} {formData.operation_type === 'Venta' ? formData.fiat : formData.crypto}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default P2PSimulator;