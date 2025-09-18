import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardStats } from '../services/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useNavigate } from 'react-router-dom';

const Dashboard = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const dashboardStats = await getDashboardStats(user.uid);
        setStats(dashboardStats);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError("Error al cargar las estadísticas. Revisa la conexión o vuelve a intentarlo.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, refreshTrigger]);

  const formatCurrency = (amount, currency = 'USD') => {
    if (amount === null || isNaN(amount)) {
      return `$0.00`;
    }
    if (currency === 'USD') {
      return `$${amount.toFixed(2)}`;
    }
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4"></div>
          <p className="text-gray-300">Cargando dashboard...</p>
        </div>
      );
    }
  
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-red-400 text-xl mb-2">Error</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      );
    }
  
    if (!stats) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black">
          <div className="text-yellow-400 text-6xl mb-4">📊</div>
          <h2 className="text-yellow-400 text-xl mb-2">Sin datos</h2>
          <p className="text-gray-300">No hay estadísticas disponibles. Comienza a registrar operaciones.</p>
        </div>
      );
    }
  
    return (
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">
            Dashboard ⚡
          </h1>
          <p className="text-gray-300">
            Bienvenido de vuelta, {user?.displayName || user?.email || 'Usuario'}
          </p>
        </div>
  
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-400 text-sm font-medium">
                Total Operaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_operations}</div>
              <p className="text-gray-400 text-xs mt-1">
                Operaciones realizadas
              </p>
            </CardContent>
          </Card>
  
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-400 text-sm font-medium">
                Ganancia Cripto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(stats.total_profit_usdt, 'USD')}</div>
              <p className="text-gray-400 text-xs mt-1">
                Total en USDT
              </p>
            </CardContent>
          </Card>
  
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-400 text-sm font-medium">
                Tasa de Éxito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.success_rate.toFixed(1)}%</div>
              <p className="text-gray-400 text-xs mt-1">
                Operaciones exitosas
              </p>
            </CardContent>
          </Card>
        </div>
  
        {/* Performance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Performance */}
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                📈 Rendimiento Mensual
              </CardTitle>
              <CardDescription className="text-gray-400">Últimos 30 días</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {formatCurrency(stats.monthly_profit, 'USD')}
              </div>
              <Badge 
                variant={stats.monthly_profit > 0 ? "default" : "destructive"}
                className={stats.monthly_profit > 0 ? "bg-green-600" : "bg-red-600"}
              >
                {stats.monthly_profit > 0 ? "📈 Positivo" : "📉 Negativo"}
              </Badge>
            </CardContent>
          </Card>
  
          {/* Best/Worst Operations */}
          <Card className="bg-gray-800 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                🎯 Mejores Operaciones
              </CardTitle>
              <CardDescription className="text-gray-400">Mejor y peor rendimiento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.best_operation && (
                <div className="border border-green-600 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-green-400 text-sm font-medium">Mejor Operación</span>
                    <Badge className="bg-green-600">{formatCurrency(stats.best_operation.fiat_amount || 0)}</Badge>
                  </div>
                  <p className="text-gray-300 text-xs">
                    {stats.best_operation.crypto}/{stats.best_operation.fiat} • {formatDate(stats.best_operation.timestamp)}
                  </p>
                </div>
              )}
  
              {stats.worst_operation && (
                <div className="border border-red-600 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-red-400 text-sm font-medium">Peor Operación</span>
                    <Badge variant="destructive">{formatCurrency(stats.worst_operation.fiat_amount || 0)}</Badge>
                  </div>
                  <p className="text-gray-300 text-xs">
                    {stats.worst_operation.crypto}/{stats.worst_operation.fiat} • {formatDate(stats.worst_operation.timestamp)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
  
        {/* Quick Actions */}
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              ⚡ Acciones Rápidas
            </CardTitle>
            <CardDescription className="text-gray-400">Herramientas más utilizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => navigate('/p2p')}
                className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex flex-col items-center"
              >
                <div className="text-2xl mb-2">🤝</div>
                <div className="text-sm font-medium">P2P Simulator</div>
              </button>
              <button 
                onClick={() => navigate('/arbitrage')}
                className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex flex-col items-center"
              >
                <div className="text-2xl mb-2">⚡</div>
                <div className="text-sm font-medium">Arbitraje</div>
              </button>
              <button 
                onClick={() => navigate('/operations')}
                className="p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex flex-col items-center"
              >
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-medium">Nueva Operación</div>
              </button>
              <button 
                onClick={() => navigate('/history')}
                className="p-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors flex flex-col items-center"
              >
                <div className="text-2xl mb-2">📜</div>
                <div className="text-sm font-medium">Historial</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4">
      {renderContent()}
    </div>
  );
};

export default Dashboard;
