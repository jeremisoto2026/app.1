import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const History = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    exchange: 'all',
    operation_type: 'all',
    crypto: 'all'
  });

  useEffect(() => {
    if (user) {
      fetchOperations();
    }
  }, [user, refreshTrigger]);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/operations/${user.uid}`);
      setOperations(response.data);
    } catch (error) {
      console.error('Error fetching operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilter({
      ...filter,
      [e.target.name]: e.target.value
    });
  };

  const filteredOperations = operations.filter(op => {
    return (
      (filter.exchange === 'all' || op.exchange === filter.exchange) &&
      (filter.operation_type === 'all' || op.operation_type === filter.operation_type) &&
      (filter.crypto === 'all' || op.crypto === filter.crypto)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-yellow-400 text-xl">Cargando historial...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2">📈 Historial</h2>
        <p className="text-gray-300">Todas tus operaciones registradas</p>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">🔍 Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Exchange:</label>
            <select
              name="exchange"
              value={filter.exchange}
              onChange={handleFilterChange}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="Binance">Binance</option>
              <option value="Bybit">Bybit</option>
              <option value="OKX">OKX</option>
              <option value="KuCoin">KuCoin</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Tipo:</label>
            <select
              name="operation_type"
              value={filter.operation_type}
              onChange={handleFilterChange}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="Venta">Venta</option>
              <option value="Compra">Compra</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Cripto:</label>
            <select
              name="crypto"
              value={filter.crypto}
              onChange={handleFilterChange}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
            >
              <option value="all">Todas</option>
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="BNB">BNB</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumen de filtros */}
      {filteredOperations.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center text-white">
            <span>Mostrando {filteredOperations.length} operaciones</span>
            <span className="text-yellow-400">
              Total: ${filteredOperations.reduce((sum, op) => sum + op.fiat_amount, 0).toFixed(4)}
            </span>
          </div>
        </div>
      )}

      {/* Tabla de operaciones */}
      {filteredOperations.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-gray-400 text-lg mb-2">No hay operaciones registradas</div>
          <div className="text-sm text-gray-500">
            {operations.length === 0 
              ? "Registra tu primera operación para ver el historial"
              : "Ajusta los filtros para ver más resultados"
            }
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {/* Vista móvil */}
          <div className="md:hidden">
            {filteredOperations.map((op) => (
              <div key={op.id} className="border-b border-gray-700 p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      op.operation_type === 'Venta' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                    }`}>
                      {op.operation_type}
                    </span>
                    <span className="ml-2 text-yellow-400 font-semibold">{op.exchange}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">{op.crypto}</div>
                    <div className="text-gray-400 text-sm">{op.fiat}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Cantidad:</div>
                    <div className="text-white">{op.crypto_amount}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Tasa:</div>
                    <div className="text-white">{op.exchange_rate}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Comisión:</div>
                    <div className="text-white">{op.fee}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Total Fiat:</div>
                    <div className={`font-semibold ${op.fiat_amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {op.fiat_amount.toFixed(4)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(op.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Vista desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="text-left p-4 text-white font-semibold">Order ID</th>
                  <th className="text-left p-4 text-white font-semibold">Exchange</th>
                  <th className="text-left p-4 text-white font-semibold">Tipo</th>
                  <th className="text-left p-4 text-white font-semibold">Cripto</th>
                  <th className="text-left p-4 text-white font-semibold">Cantidad</th>
                  <th className="text-left p-4 text-white font-semibold">Tasa</th>
                  <th className="text-left p-4 text-white font-semibold">Comisión</th>
                  <th className="text-left p-4 text-white font-semibold">Total Fiat</th>
                  <th className="text-left p-4 text-white font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filteredOperations.map((op) => (
                  <tr key={op.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="p-4 text-gray-300 text-sm font-mono">
                      {op.order_id.slice(-8)}
                    </td>
                    <td className="p-4 text-yellow-400 font-semibold">{op.exchange}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        op.operation_type === 'Venta' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                      }`}>
                        {op.operation_type}
                      </span>
                    </td>
                    <td className="p-4 text-white font-semibold">{op.crypto}</td>
                    <td className="p-4 text-white">{op.crypto_amount}</td>
                    <td className="p-4 text-white">{op.exchange_rate}</td>
                    <td className="p-4 text-white">{op.fee}</td>
                    <td className="p-4">
                      <span className={`font-semibold ${op.fiat_amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {op.fiat_amount.toFixed(4)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">
                      {new Date(op.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;