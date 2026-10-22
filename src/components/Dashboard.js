// Dashboard.js
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { calculateDashboardMetrics } from "../utils/financialCalculations";
import {
  RocketLaunchIcon,
  CheckBadgeIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

const Dashboard = ({ onOpenProfile }) => {
  const { user } = useAuth();
  const [totalOperations, setTotalOperations] = useState(0);
  const [profitByCurrency, setProfitByCurrency] = useState({});
  const [successRate, setSuccessRate] = useState(0);
  const [closedSales, setClosedSales] = useState(0);
  const [monthlyProfitByCurrency, setMonthlyProfitByCurrency] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        setError("Inicia sesión para consultar el dashboard.");
        return;
      }

      try {
        const operationsRef = collection(db, "users", user.uid, "operations");
        // Fetch all records; the calculator safely ignores operations without trustworthy dates.
        const querySnapshot = await getDocs(operationsRef);

        const operations = [];
        querySnapshot.forEach((doc) => {
          operations.push({ id: doc.id, ...doc.data() });
        });

        const metrics = calculateDashboardMetrics(operations);
        setTotalOperations(metrics.totalOperations);
        setProfitByCurrency(metrics.profitByCurrency);
        setMonthlyProfitByCurrency(metrics.monthlyProfitByCurrency);
        setSuccessRate(metrics.successRate);
        setClosedSales(metrics.closedSales);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar el resumen:", err);
        setError("No se pudieron cargar las operaciones. Inténtalo de nuevo.");
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Formatear el resultado por moneda; las divisas distintas nunca se suman entre sí.
  const formatCurrencyValue = (amount, currency) => {
    const formatted = new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    // Mostrar siempre el código de moneda evita confundir USD con USDT.
    return formatted + " " + currency;
  };

  const renderCurrencyTotals = (totals) => {
    const entries = Object.entries(totals || {})
      .filter(([, amount]) => Number.isFinite(amount))
      .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB));

    if (!entries.length) {
      return <span className="text-sm text-gray-500">Sin ventas cerradas para calcular el beneficio</span>;
    }

    return (
      <div className="flex flex-col gap-1 text-lg md:text-xl font-bold">
        {entries.map(([currency, amount]) => (
          <span key={currency} className={amount > 0 ? "text-green-400" : amount < 0 ? "text-red-400" : "text-white"}>
            {formatCurrencyValue(amount, currency)}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <div className="flex justify-center mb-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              JJXCAPITAL<span className="text-yellow-400">⚡</span>
            </div>
          </div>
          <p className="text-gray-400 text-lg">Cargando resumen...</p>
          <p className="text-gray-600 text-sm mt-2">Preparando tus operaciones</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center p-4">
        <div className="text-center p-8 bg-gray-900/70 backdrop-blur-lg rounded-2xl border border-purple-500/30 max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              JJXCAPITAL<span className="text-yellow-400">⚡</span>
            </div>
          </div>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900/20 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 className="text-red-400 text-xl font-semibold mb-2">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-300 shadow-lg shadow-purple-500/20"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black text-white">
      {/* Header con navegación */}
      <header className="border-b border-purple-500/20 bg-black/30 backdrop-blur-xl sticky top-0 md:top-16 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg mr-3 shadow-lg shadow-purple-500/30">
              <RocketLaunchIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              JJXCAPITAL<span className="text-yellow-400">⚡</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={onOpenProfile}
              className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500/50 hover:border-purple-400 transition-all duration-300 group"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-purple-400 group-hover:bg-purple-950 transition-colors duration-300">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/10 transition-all duration-300"></div>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Encabezado con bienvenida */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Bienvenido, <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">{user?.displayName || user?.email?.split('@')[0] || 'Inversor'}</span>
          </h2>
          <p className="text-gray-400">Resumen de JJXCAPITAL⚡</p>
        </div>

        {/* Grid de Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Tarjeta: Total Operaciones */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-xl border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-10 blur transition-all duration-300"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Total Operaciones</h3>
              <div className="p-2 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <ChartBarIcon className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold mb-1">{totalOperations}</p>
            <div className="flex items-center text-sm text-gray-500">
              <span className="h-2 w-2 bg-blue-500 rounded-full mr-2"></span>
              Operaciones realizadas
            </div>
          </div>

          {/* Tarjeta: Ganancia USDT */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-xl border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-10 blur transition-all duration-300"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Beneficio realizado por moneda</h3>
              <div className="p-2 bg-green-500/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <CurrencyDollarIcon className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <div className="mb-1">{renderCurrencyTotals(profitByCurrency)}</div>
            <div className="flex items-center text-sm text-gray-500">
              <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
              Importes identificados por código de moneda (FIFO)
            </div>
          </div>

          {/* Tarjeta: Tasa de Éxito */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-xl border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-10 blur transition-all duration-300"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Tasa de Éxito</h3>
              <div className="p-2 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <CheckBadgeIcon className="h-5 w-5 text-purple-400" />
              </div>
            </div>
            <div className="flex items-end">
              <p className="text-2xl md:text-3xl font-bold mb-1">{successRate.toFixed(1)}%</p>
              <div className="ml-3 text-xs px-2 py-1 rounded-full bg-purple-900/50 text-purple-300">
                {closedSales === 0 ? "Sin datos" : "Ventas cerradas"}
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <span className="h-2 w-2 bg-purple-500 rounded-full mr-2"></span>
              {closedSales} ventas cerradas con coste de compra conocido
            </div>
          </div>

          {/* Tarjeta: Rendimiento Mensual */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-xl border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-10 blur transition-all duration-300"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Beneficio realizado · últimos 30 días</h3>
              <div className="p-2 bg-amber-500/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <ArrowTrendingUpIcon className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <div className="mb-1">{renderCurrencyTotals(monthlyProfitByCurrency)}</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-500">
                <span className="h-2 w-2 bg-amber-500 rounded-full mr-2"></span>
                Últimos 30 días
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                Moneda de cotización
              </span>
            </div>
          </div>
        </div>

        {/* Las compras de planes todavía no están habilitadas. */}
        <section className="bg-gray-900/70 rounded-2xl p-6 border border-purple-500/20 mb-8" aria-labelledby="subscriptions-title">
          <h2 id="subscriptions-title" className="text-xl font-bold text-white mb-2">Suscripciones</h2>
          <p className="text-gray-300">
            Los pagos y las suscripciones todavía no están habilitados en esta aplicación. No se realizará ningún cobro desde aquí.
          </p>
        </section>

        {/* Footer o información adicional */}
        <div className="text-center text-gray-500 text-sm pb-6">
          <div className="flex justify-center items-center mb-2">
            <div className="text-lg font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              JJXCAPITAL<span className="text-yellow-400">⚡</span>
            </div>
          </div>
          <p>© {new Date().getFullYear()} JJXCAPITAL⚡ • Gestión de operaciones P2P</p>
        </div>
      </main>

    </div>
  );
};

export default Dashboard;