import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  RocketLaunchIcon,
  CheckBadgeIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon
} from "@heroicons/react/24/outline";

const Dashboard = ({ onOpenProfile }) => {
  const { user } = useAuth();
  const [totalOperations, setTotalOperations] = useState(0);
  const [totalProfitUsdt, setTotalProfitUsdt] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [monthlyPerformance, setMonthlyPerformance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        setError("User not authenticated.");
        return;
      }

      try {
        const operationsRef = collection(db, "users", user.uid, "operations");
        const q = query(operationsRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        const operations = [];
        querySnapshot.forEach((doc) => {
          operations.push({ id: doc.id, ...doc.data() });
        });

        if (operations.length > 0) {
          setTotalOperations(operations.length);

          let totalCryptoBought = 0;
          let totalCryptoSold = 0;
          let monthlyCryptoBought = 0;
          let monthlyCryptoSold = 0;

          const last30Days = new Date();
          last30Days.setDate(last30Days.getDate() - 30);

          operations.forEach((op) => {
            const cryptoAmount = parseFloat(op.crypto_amount || 0);
            const opDate =
              op.timestamp && typeof op.timestamp.toDate === "function"
                ? op.timestamp.toDate()
                : new Date();

            if (op.operation_type === "Venta") {
              totalCryptoSold += cryptoAmount;
            } else if (op.operation_type === "Compra") {
              totalCryptoBought += cryptoAmount;
            }

            if (opDate >= last30Days) {
              if (op.operation_type === "Venta") {
                monthlyCryptoSold += cryptoAmount;
              } else if (op.operation_type === "Compra") {
                monthlyCryptoBought += cryptoAmount;
              }
            }
          });

          const totalProfitUsdtCalc = totalCryptoBought - totalCryptoSold;
          const monthlyPerformanceCalc =
            monthlyCryptoBought - monthlyCryptoSold;

          const successRateCalc = totalProfitUsdtCalc > 0 ? 100 : 0;

          setTotalProfitUsdt(totalProfitUsdtCalc);
          setSuccessRate(successRateCalc);
          setMonthlyPerformance(monthlyPerformanceCalc);
          setLoading(false);
        } else {
          setTotalOperations(0);
          setTotalProfitUsdt(0);
          setSuccessRate(0);
          setMonthlyPerformance(0);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Error al cargar los datos del dashboard.");
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Función para formatear números con separadores de miles
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Cargando dashboard...</p>
          <p className="text-gray-600 text-sm mt-2">Estamos preparando tus análisis</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black flex items-center justify-center p-4">
        <div className="text-center p-8 bg-gray-900 rounded-2xl border border-gray-800 max-w-md w-full shadow-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900/20 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 className="text-red-400 text-xl font-semibold mb-2">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors"
            >
              Reintentar
            </button>
            <button 
              onClick={() => setError(null)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black text-white">
      {/* Header con navegación */}
      <header className="border-b border-gray-800 bg-black/30 backdrop-blur-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-2 rounded-lg mr-3">
              <ArrowsRightLeftIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Crypto Trading Analytics
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex space-x-1 bg-gray-900 p-1 rounded-lg">
              <button 
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-cyan-700 text-white' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('overview')}
              >
                Resumen
              </button>
              <button 
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'performance' ? 'bg-cyan-700 text-white' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('performance')}
              >
                Rendimiento
              </button>
              <button 
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-cyan-700 text-white' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('reports')}
              >
                Reportes
              </button>
            </div>
            
            <button
              onClick={onOpenProfile}
              className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-500/50 hover:border-cyan-400 transition-all duration-300 group"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-950 transition-colors duration-300">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-all duration-300"></div>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Encabezado con bienvenida */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Hola, {user?.displayName || user?.email?.split('@')[0] || 'Trader'}
          </h2>
          <p className="text-gray-400">Aquí está tu resumen de rendimiento</p>
        </div>

        {/* Grid de Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Tarjeta: Total Operaciones */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-xl border border-gray-800 hover:border-cyan-500/30 transition-all duration-300 group">
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
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-xl border border-gray-800 hover:border-green-500/30 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Ganancia USDT</h3>
              <div className="p-2 bg-green-500/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <CurrencyDollarIcon className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold mb-1">
              ${formatNumber(totalProfitUsdt)}
            </p>
            <div className="flex items-center text-sm text-gray-500">
              <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
              Balance total en USDT
            </div>
          </div>

          {/* Tarjeta: Tasa de Éxito */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-xl border border-gray-800 hover:border-purple-500/30 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Tasa de Éxito</h3>
              <div className="p-2 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <CheckBadgeIcon className="h-5 w-5 text-purple-400" />
              </div>
            </div>
            <div className="flex items-end">
              <p className="text-2xl md:text-3xl font-bold mb-1">{successRate}%</p>
              <div className="ml-3 text-xs px-2 py-1 rounded-full bg-purple-900/50 text-purple-300">
                {successRate >= 50 ? "Alto" : "Bajo"}
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <span className="h-2 w-2 bg-purple-500 rounded-full mr-2"></span>
              Operaciones exitosas
            </div>
          </div>

          {/* Tarjeta: Rendimiento Mensual */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-xl border border-gray-800 hover:border-amber-500/30 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Rendimiento Mensual</h3>
              <div className="p-2 bg-amber-500/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <ArrowTrendingUpIcon className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold mb-1">
              ${formatNumber(monthlyPerformance)}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-500">
                <span className="h-2 w-2 bg-amber-500 rounded-full mr-2"></span>
                Últimos 30 días
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  monthlyPerformance >= 0
                    ? "bg-green-900/30 text-green-400"
                    : "bg-red-900/30 text-red-400"
                }`}
              >
                {monthlyPerformance >= 0 ? "↗ Positivo" : "↘ Negativo"}
              </span>
            </div>
          </div>
        </div>

        {/* Sección de gráficos y análisis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Rendimiento mensual</h2>
              <button className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center">
                <CalendarDaysIcon className="h-4 w-4 mr-1" />
                Seleccionar período
              </button>
            </div>
            
            {/* Gráfico simulado */}
            <div className="h-64 relative">
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-700"></div>
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-700"></div>
              
              {/* Línea de gráfico */}
              <div className="absolute bottom-8 left-10 right-10">
                <svg viewBox="0 0 500 150" className="w-full h-40">
                  <path 
                    d="M0,100 C100,50 150,120 250,80 C350,40 400,110 500,70" 
                    stroke={monthlyPerformance >= 0 ? "url(#greenGradient)" : "url(#redGradient)"} 
                    strokeWidth="3" 
                    fill="none" 
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4ADE80" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                    <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F87171" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              
              {/* Puntos de datos */}
              <div className="absolute left-10 bottom-8 w-3 h-3 rounded-full bg-cyan-500"></div>
              <div className="absolute left-1/3 bottom-12 w-3 h-3 rounded-full bg-cyan-500"></div>
              <div className="absolute left-2/3 bottom-14 w-3 h-3 rounded-full bg-cyan-500"></div>
              <div className="absolute right-10 bottom-16 w-3 h-3 rounded-full bg-cyan-500"></div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-6">Distribución de operaciones</h2>
            
            {/* Gráfico de donut simulado */}
            <div className="relative h-48 flex items-center justify-center mb-4">
              <div className="absolute w-36 h-36 rounded-full border-8 border-cyan-500/30"></div>
              <div className="absolute w-36 h-36 rounded-full border-8 border-cyan-500 border-t-8 border-t-cyan-500" style={{transform: 'rotate(calc(0.7 * 360deg))'}}></div>
              <div className="absolute w-36 h-36 rounded-full border-8 border-blue-500 border-r-8 border-r-blue-500" style={{transform: 'rotate(calc(0.5 * 360deg))'}}></div>
              
              <div className="text-center">
                <div className="text-2xl font-bold">{successRate}%</div>
                <div className="text-sm text-gray-400">Éxito</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-cyan-500 mr-2"></div>
                  <span className="text-sm">Operaciones exitosas</span>
                </div>
                <span className="text-sm font-medium">70%</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-sm">Operaciones neutras</span>
                </div>
                <span className="text-sm font-medium">20%</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gray-600 mr-2"></div>
                  <span className="text-sm">Operaciones en pérdida</span>
                </div>
                <span className="text-sm font-medium">10%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Planes Premium */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-800 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Planes Premium</h2>
              <p className="text-gray-400">Mejora tu experiencia de trading con nuestros planes</p>
            </div>
            <RocketLaunchIcon className="h-8 w-8 text-cyan-500" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card: Plan Premium Mensual */}
            <div
              onClick={onOpenProfile}
              className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-cyan-500 hover:shadow-2xl transition-all duration-500 cursor-pointer relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/10 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-cyan-500/10 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-cyan-300 transition-colors">
                      Plan Premium
                    </h3>
                    <p className="text-sm text-gray-400">Ideal para traders activos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      $13 <span className="text-sm text-gray-400">/mes</span>
                    </p>
                  </div>
                </div>

                <div className="mb-6 text-sm text-gray-300">
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                      Operaciones ilimitadas
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                      Exportaciones ilimitadas
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                      Soporte prioritario
                    </li>
                  </ul>
                </div>
                
                <button className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-300 text-center group-hover:shadow-lg group-hover:shadow-cyan-500/20">
                  Seleccionar plan
                </button>
              </div>
            </div>

            {/* Card: Plan Premium Anual */}
            <div
              onClick={onOpenProfile}
              className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-cyan-500/30 hover:border-cyan-500 hover:shadow-2xl transition-all duration-500 cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-cyan-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">
                MÁS POPULAR
              </div>
              
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-cyan-500/10 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-cyan-500/10 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-cyan-300 transition-colors">
                      Plan Premium Anual
                    </h3>
                    <p className="text-sm text-gray-400">Para traders serios</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      $125 <span className="text-sm text-gray-400">/año</span>
                    </p>
                    <p className="text-xs text-green-400 font-semibold">Ahorra ~20%</p>
                  </div>
                </div>

                <div className="mb-6 text-sm text-gray-300">
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                      Operaciones ilimitadas
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                      Exportaciones ilimitadas
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                      Soporte prioritario
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                      Alertas personalizadas
                    </li>
                  </ul>
                </div>
                
                <button className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition-all duration-300 text-center group-hover:shadow-lg group-hover:shadow-cyan-500/30">
                  Seleccionar plan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer o información adicional */}
        <div className="text-center text-gray-500 text-sm pb-6">
          <p>© {new Date().getFullYear()} Crypto Trading Analytics • Todos los derechos reservados</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;