// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardStats } from '../services/database';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Formatea un número (es-ES) SIN símbolo de moneda, p.ej. "1.234,56"
const formatCurrency = (amount) => {
  const n = safeNumber(amount);
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  try {
    let date;
    if (timestamp?.toDate) date = timestamp.toDate();
    else if (timestamp?.seconds) date = new Date(timestamp.seconds * 1000);
    else if (timestamp instanceof Date) date = timestamp;
    else date = new Date(timestamp);
    if (isNaN(date)) return 'N/A';
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
};

const Dashboard = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // fallback: calcula estadísticas leyendo las operaciones del usuario
  const computeStatsFromOperations = async (uid) => {
    try {
      const qSnap = await getDocs(collection(db, 'users', uid, 'operations'));
      const docs = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const totalOperations = docs.length;
      let totalProfitUSDT = 0;
      let monthlyProfit = 0;
      let successful = 0;
      const now = new Date();
      const days30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let best = null;
      let worst = null;

      docs.forEach(op => {
        // aquí asumimos que op.profit (o op.profit_usdt) contiene la ganancia en fiat/usdt
        const profit = safeNumber(op.profit ?? op.profit_usdt ?? 0);
        totalProfitUSDT += profit;

        // monthly window
        let opDate = null;
        if (op.timestamp?.toDate) opDate = op.timestamp.toDate();
        else if (op.timestamp?.seconds) opDate = new Date(op.timestamp.seconds * 1000);
        else if (op.timestamp instanceof Date) opDate = op.timestamp;

        if (opDate && opDate >= days30ago) monthlyProfit += profit;

        if (profit > 0) successful++;

        if (best == null || profit > (best.profit ?? 0)) best = { ...op, profit };
        if (worst == null || profit < (worst.profit ?? 0)) worst = { ...op, profit };
      });

      const successRate = totalOperations > 0 ? (successful / totalOperations) * 100 : 0;

      return {
        total_operations: totalOperations,
        total_profit_usdt: totalProfitUSDT,
        monthly_profit: monthlyProfit,
        success_rate: successRate,
        best_operation: best,
        worst_operation: worst
      };
    } catch (err) {
      console.error('Error computing stats from operations:', err);
      return null;
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // intento principal (si implementaste getDashboardStats en services/database)
        let dashboardStats = null;
        try {
          dashboardStats = await getDashboardStats(user.uid);
        } catch (e) {
          console.warn('getDashboardStats falló o no existe, usaré fallback.', e);
          dashboardStats = null;
        }

        // Si getDashboardStats devolvió datos válidos (al menos total_operations o total_profit_usdt)
        const hasMainFields = dashboardStats && (
          typeof dashboardStats.total_operations === 'number' ||
          typeof dashboardStats.total_profit_usdt === 'number' ||
          typeof dashboardStats.monthly_profit === 'number'
        );

        if (hasMainFields) {
          // normalizamos algunos campos y evitamos undefined
          dashboardStats.total_operations = dashboardStats.total_operations ?? 0;
          dashboardStats.total_profit_usdt = dashboardStats.total_profit_usdt ?? 0;
          dashboardStats.monthly_profit = dashboardStats.monthly_profit ?? 0;
          dashboardStats.success_rate = dashboardStats.success_rate ?? 0;
          setStats(dashboardStats);
        } else {
          // fallback: calcula directamente desde Firestore
          const fallback = await computeStatsFromOperations(user.uid);
          if (fallback) {
            setStats(fallback);
          } else {
            setStats({
              total_operations: 0,
              total_profit_usdt: 0,
              monthly_profit: 0,
              success_rate: 0,
              best_operation: null,
              worst_operation: null
            });
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Error al cargar las estadísticas. Revisa la consola.');
        setStats({
          total_operations: 0,
          total_profit_usdt: 0,
          monthly_profit: 0,
          success_rate: 0,
          best_operation: null,
          worst_operation: null
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, refreshTrigger]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-red-400 text-xl mb-2">Error</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-400 text-6xl mb-4">📊</div>
          <h2 className="text-yellow-400 text-xl mb-2">Sin datos</h2>
          <p className="text-gray-300">No hay estadísticas disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">Dashboard ⚡</h1>
          <p className="text-gray-300">
            Bienvenido de vuelta, {user?.displayName || user?.email || 'Usuario'}
          </p>
        </div>

        {/* Stats Grid: ahora 3 columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-400 text-sm font-medium">
                Total Operaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.total_operations ?? 0}
              </div>
              <p className="text-gray-400 text-xs mt-1">Operaciones realizadas</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-400 text-sm font-medium">
                Ganancia USDT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {/* mostramos solo el número formateado, sin símbolo */}
                {formatCurrency(stats.total_profit_usdt ?? 0)}
              </div>
              <p className="text-gray-400 text-xs mt-1">Total en USDT</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-purple-400 text-sm font-medium">
                Tasa de Éxito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {(safeNumber(stats.success_rate)).toFixed(1)}%
              </div>
              <p className="text-gray-400 text-xs mt-1">Operaciones exitosas</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Performance */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">📈 Rendimiento Mensual</CardTitle>
              <CardDescription className="text-gray-400">Últimos 30 días</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-2">
                {formatCurrency(stats.monthly_profit ?? 0)}
              </div>
              <Badge className={(safeNumber(stats.monthly_profit) > 0) ? 'bg-green-600' : 'bg-red-600'}>
                {safeNumber(stats.monthly_profit) > 0 ? '📈 Positivo' : '📉 Negativo'}
              </Badge>
            </CardContent>
          </Card>

          {/* Best/Worst Operations */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">🎯 Mejores Operaciones</CardTitle>
              <CardDescription className="text-gray-400">Mejor y peor rendimiento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.best_operation ? (
                <div className="border border-green-600 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-green-400 text-sm font-medium">Mejor Operación</span>
                    <Badge className="bg-green-600">
                      {formatCurrency(stats.best_operation.fiat_amount ?? 0)}
                    </Badge>
                  </div>
                  <p className="text-gray-300 text-xs">
                    {stats.best_operation.crypto}/{stats.best_operation.fiat} • {formatDate(stats.best_operation.timestamp)}
                  </p>
                </div>
              ) : (
                <div className="text-gray-400 text-xs">No hay mejor operación registrada.</div>
              )}

              {stats.worst_operation ? (
                <div className="border border-red-600 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-red-400 text-sm font-medium">Peor Operación</span>
                    <Badge variant="destructive">
                      {formatCurrency(stats.worst_operation.fiat_amount ?? 0)}
                    </Badge>
                  </div>
                  <p className="text-gray-300 text-xs">
                    {stats.worst_operation.crypto}/{stats.worst_operation.fiat} • {formatDate(stats.worst_operation.timestamp)}
                  </p>
                </div>
              ) : (
                <div className="text-gray-400 text-xs">No hay peor operación registrada.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - sin referencias a 'navigation' para evitar errores */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">⚡ Acciones Rápidas</CardTitle>
            <CardDescription className="text-gray-400">Herramientas más utilizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                <div className="text-2xl mb-2">🤝</div>
                <div className="text-white text-sm font-medium">P2P Simulator</div>
              </button>
              <button className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                <div className="text-2xl mb-2">⚡</div>
                <div className="text-white text-sm font-medium">Arbitraje</div>
              </button>
              <button className="p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-white text-sm font-medium">Nueva Operación</div>
              </button>
              <button className="p-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors">
                <div className="text-2xl mb-2">📜</div>
                <div className="text-white text-sm font-medium">Historial</div>
              </button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Dashboard;