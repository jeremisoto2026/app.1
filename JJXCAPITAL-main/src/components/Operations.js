import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Operations = ({ onOperationSaved }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    exchange: 'Binance',
    operation_type: 'Venta',
    crypto: 'USDT',
    fiat: 'EUR',
    crypto_amount: '',
    exchange_rate: '',
    fee: '0'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    
    try {
      await axios.post(`${API}/operations`, {
        user_id: user.uid,
        exchange: formData.exchange,
        operation_type: formData.operation_type,
        crypto: formData.crypto,
        fiat: formData.fiat,
        crypto_amount: parseFloat(formData.crypto_amount),
        exchange_rate: parseFloat(formData.exchange_rate),
        fee: parseFloat(formData.fee)
      });
      
      setSuccess(true);
      
      // Reset form
      setFormData({
        exchange: 'Binance',
        operation_type: 'Venta',
        crypto: 'USDT',
        fiat: 'EUR',
        crypto_amount: '',
        exchange_rate: '',
        fee: '0'
      });

      // Notify parent component
      if (onOperationSaved) {
        onOperationSaved();
      }

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error saving operation:', error);
      alert('Error al guardar la operación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">
          ➕ Registrar Operación
        </h2>

        {success && (
          <div className="bg-green-600 text-white p-3 rounded-lg mb-4 text-center">
            ✅ Operación registrada exitosamente
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Exchange:
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
              Tipo de Operación:
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Monto Cripto:
            </label>
            <input
              type="number"
              name="crypto_amount"
              value={formData.crypto_amount}
              onChange={handleChange}
              step="0.0001"
              required
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              placeholder="Cantidad de criptomoneda"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Tasa de Cambio:
            </label>
            <input
              type="number"
              name="exchange_rate"
              value={formData.exchange_rate}
              onChange={handleChange}
              step="0.0001"
              required
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              placeholder="Precio por unidad"
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
              placeholder="Comisión pagada"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Operación'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h4 className="text-yellow-400 font-semibold mb-2">💡 Consejos:</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Registra todas tus operaciones para un seguimiento preciso</li>
            <li>• Incluye todas las comisiones para cálculos exactos</li>
            <li>• Revisa el dashboard para analizar tu rendimiento</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Operations;