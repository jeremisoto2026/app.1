import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useOperations } from "../../hooks/useOperations";
import { calculateDashboardStats, formatCurrency, formatPercentage, getOperationsByMonth } from "../../utils/calculations";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { operations, loading } = useOperations(user?.uid || '');
  const stats = calculateDashboardStats(operations);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-yellow-400 text-xl">Cargando dashboard...</div>
      </div>
    );
  }

  // Chart data
  const monthlyData = getOperationsByMonth(operations);
  const months = Object.keys(monthlyData).sort();
  const monthlyProfits = months.map(month => monthlyData[month]);

  const lineChartData = {
    labels: months.map(month => {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    }),
    datasets: [
      {
        label: 'Ganancia Mensual (€)',
        data: monthlyProfits,
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const operationTypeData = {
    labels: ['Ventas', 'Compras'],
    datasets: [
      {
        data: [
          operations.filter(op => op.type === 'Venta').length,
          operations.filter(op => op.type === 'Compra').length,
        ],
        backgroundColor: ['#10B981', '#EF4444'],
        borderColor: ['#059669', '#DC2626'],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: '#FFFFFF',
        },
      },
    },
    scales: {
      y: {
        ticks: {
          color: '#FFFFFF',
        },
        grid: {
          color: '#374151',
        },
      },
      x: {
        ticks: {
          color: '#FFFFFF',
        },
        grid: {
          color: '#374151',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: '#FFFFFF',
        },
      },
    },
  };

  return (
    <div className="max-w-6xl mx-auto p-4 pb-20">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-yellow-400 mb-2">📊 Dashboard</h1>
        <p className="text-gray-300">Resumen completo de tu actividad de trading</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 text-center border-l-4 border-blue-500">
          <div className="text-3xl mb-2">💼</div>
          <div className="text-2xl font-bold text-white">{stats.totalOperations}</div>
          <div className="text-gray-400 text-sm">Operaciones Totales</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 text-center border-l-4 border-green-500">
          <div className="text-3xl mb-2">💰</div>
          <div className={`text-2xl font-bold ${stats.totalEUR >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(stats.totalEUR)}
          </div>
          <div className="text-gray-400 text-sm">Ganancia EUR</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 text-center border-l-4 border-yellow-500">
          <div className="text-3xl mb-2">🪙</div>
          <div className={`text-2xl font-bold ${stats.totalUSDT >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.totalUSDT.toFixed(4)} USDT
          </div>
          <div className="text-gray-400 text-sm">Balance USDT</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 text-center border-l-4 border-purple-500">
          <div className="text-3xl mb-2">📈</div>
          <div className={`text-2xl font-bold ${stats.performance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercentage(stats.performance)}
          </div>
          <div className="text-gray-400 text-sm">Rendimiento</div>
        </div>
      </div>

      {/* Charts Section */}
      {operations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">📈 Evolución Mensual</h3>
            <Line data={lineChartData} options={chartOptions} />
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">📊 Tipo de Operaciones</h3>
            <div className="max-w-xs mx-auto">
              <Doughnut data={operationTypeData} options={doughnutOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-4">📊 Estadísticas</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Total Movimientos:</span>
              <span className="text-white font-semibold">{formatCurrency(stats.totalMovements)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Operaciones Rentables:</span>
              <span className="text-green-400 font-semibold">{stats.profitableOperations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Tasa de Éxito:</span>
              <span className="text-yellow-400 font-semibold">
                {stats.totalOperations > 0 
                  ? ((stats.profitableOperations / stats.totalOperations) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-4">📅 Rendimiento Mensual</h3>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 ${stats.monthlyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(stats.monthlyProfit)}
            </div>
            <div className="text-gray-400 text-sm">Últimos 30 días</div>
            {stats.monthlyProfit > 0 && (
              <div className="mt-3 text-green-300 text-sm">
                📈 Tendencia positiva
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-4">🎯 Acciones Rápidas</h3>
          <div className="space-y-3">
            <Link 
              to="/new" 
              className="block w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-center"
            >
              ➕ Nueva Operación
            </Link>
            <Link 
              to="/operations" 
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-center"
            >
              📝 Ver Historial
            </Link>
            <Link 
              to="/subscription" 
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-center"
            >
              💳 Gestionar Plan
            </Link>
          </div>
        </div>
      </div>

      {/* Welcome Message or Call to Action */}
      {operations.length === 0 ? (
        <div className="bg-gradient-to-r from-yellow-900 to-yellow-800 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">⚡</div>
          <h2 className="text-2xl font-bold text-yellow-100 mb-4">¡Bienvenido a JJXCAPITAL ⚡!</h2>
          <p className="text-yellow-200 mb-6">
            Comienza tu viaje en el trading de criptomonedas. Registra tu primera operación y 
            empieza a construir tu portfolio profesional.
          </p>
          <Link 
            to="/new" 
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3 rounded-lg transition-colors duration-200"
          >
            🚀 Empezar Ahora
          </Link>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-yellow-900 to-yellow-800 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">⚡</div>
          <h3 className="text-xl font-bold text-yellow-100 mb-2">JJXCAPITAL ⚡</h3>
          <p className="text-yellow-200">
            {stats.totalOperations === 1 
              ? "¡Excelente! Has registrado tu primera operación."
              : stats.performance >= 0 
                ? "¡Buen trabajo! Tu portfolio muestra crecimiento positivo."
                : "Mantén el enfoque. Cada operación es una oportunidad de aprendizaje."
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;