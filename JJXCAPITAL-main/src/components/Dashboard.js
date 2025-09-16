import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/dashboard/${user.uid}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-yellow-400 text-xl">Cargando dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-4">No hay datos disponibles</div>
        <div className="text-sm text-gray-500">Realiza tu primera operación para ver estadísticas</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2">📊 Dashboard</h2>
        <p className="text-gray-300">Resumen de tus operaciones y ganancias</p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">💼</div>
          <div className="text-2xl font-bold text-white">{stats.total_operations}</div>
          <div className="text-gray-400 text-sm">Operaciones Totales</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">💰</div>
          <div className={`text-2xl font-bold ${stats.total_profit_usdt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${stats.total_profit_usdt.toFixed(2)}
          </div>
          <div className="text-gray-400 text-sm">Ganancia USDT</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">🇪🇺</div>
          <div className={`text-2xl font-bold ${stats.total_profit_eur >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            €{stats.total_profit_eur.toFixed(2)}
          </div>
          <div className="text-gray-400 text-sm">Ganancia EUR</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">📈</div>
          <div className={`text-2xl font-bold ${stats.success_rate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
            {stats.success_rate.toFixed(1)}%
          </div>
          <div className="text-gray-400 text-sm">Tasa de Éxito</div>
        </div>
      </div>

      {/* Resumen adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-4">💵 Ganancias por Moneda</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">USDT:</span>
              <span className={`font-semibold ${stats.total_profit_usdt >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${stats.total_profit_usdt.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">EUR:</span>
              <span className={`font-semibold ${stats.total_profit_eur >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                €{stats.total_profit_eur.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">USD:</span>
              <span className={`font-semibold ${stats.total_profit_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${stats.total_profit_usd.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-4">📅 Rendimiento Mensual</h3>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 ${stats.monthly_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${stats.monthly_profit.toFixed(2)}
            </div>
            <div className="text-gray-400 text-sm">Últimos 30 días</div>
            {stats.monthly_profit > 0 && (
              <div className="mt-3 text-green-300 text-sm">
                📈 Tendencia positiva
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mejores y peores operaciones */}
      {(stats.best_operation || stats.worst_operation) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.best_operation && (
            <div className="bg-green-900 rounded-lg p-6">
              <h3 className="text-xl font-bold text-green-100 mb-4">🏆 Mejor Operación</h3>
              <div className="space-y-2 text-green-200">
                <p><strong>Exchange:</strong> {stats.best_operation.exchange}</p>
                <p><strong>Tipo:</strong> {stats.best_operation.operation_type}</p>
                <p><strong>Cripto:</strong> {stats.best_operation.crypto}</p>
                <p><strong>Ganancia:</strong> ${stats.best_operation.fiat_amount.toFixed(4)}</p>
                <p className="text-xs text-green-300">
                  {new Date(stats.best_operation.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {stats.worst_operation && (
            <div className="bg-red-900 rounded-lg p-6">
              <h3 className="text-xl font-bold text-red-100 mb-4">⚠️ Operación Menos Rentable</h3>
              <div className="space-y-2 text-red-200">
                <p><strong>Exchange:</strong> {stats.worst_operation.exchange}</p>
                <p><strong>Tipo:</strong> {stats.worst_operation.operation_type}</p>
                <p><strong>Cripto:</strong> {stats.worst_operation.crypto}</p>
                <p><strong>Resultado:</strong> ${stats.worst_operation.fiat_amount.toFixed(4)}</p>
                <p className="text-xs text-red-300">
                  {new Date(stats.worst_operation.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mensaje motivacional */}
      <div className="bg-gradient-to-r from-yellow-900 to-yellow-800 rounded-lg p-6 text-center">
        <div className="text-2xl mb-2">⚡</div>
        <h3 className="text-xl font-bold text-yellow-100 mb-2">JJXCAPITAL ⚡</h3>
        <p className="text-yellow-200">
          {stats.total_operations === 0 
            ? "¡Comienza tu primera operación y construye tu portfolio!"
            : stats.success_rate >= 70 
              ? "¡Excelente rendimiento! Sigue así."
              : "Continúa mejorando tus estrategias de trading."
          }
        </p>
      </div>
    </div>
  );
};

export default Dashboard;