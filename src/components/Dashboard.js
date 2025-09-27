// Dashboard.js
import React, { useEffect, useState, useCallback } from "react";
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
  CalendarDaysIcon,
  XMarkIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ClockIcon,
  ChartPieIcon
} from "@heroicons/react/24/outline";

// Componente de gráfica mejorada
const AnimatedChart = ({ data, positive }) => {
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationProgress(1);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const points = positive 
    ? "M0,100 C150,40 200,80 300,60 C400,40 450,90 500,70"
    : "M0,100 C150,120 200,90 300,110 C400,130 450,80 500,100";

  return (
    <div className="relative h-64 w-full">
      <svg viewBox="0 0 500 150" className="w-full h-full">
        {/* Línea de fondo */}
        <path 
          d={points}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Línea animada */}
        <path 
          d={points}
          stroke={positive ? "url(#successGradient)" : "url(#dangerGradient)"}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="1000"
          strokeDashoffset={1000 - (1000 * animationProgress)}
          style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
        />
        
        {/* Área gradiente bajo la línea */}
        <defs>
          <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="dangerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Puntos animados */}
      <div className="absolute inset-0">
        {[0, 0.25, 0.5, 0.75, 1].map((point, index) => (
          <div
            key={index}
            className="absolute w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${point * 100}%`,
              top: '50%',
              opacity: animationProgress,
              transition: `opacity 0.5s ${index * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Componente de donut chart animado
const AnimatedDonutChart = ({ successRate }) => {
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationProgress(1);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const successStroke = (successRate / 100) * circumference * animationProgress;
  const neutralStroke = (20 / 100) * circumference * animationProgress;

  return (
    <div className="relative h-48 flex items-center justify-center">
      <svg width="150" height="150" className="transform -rotate-90">
        {/* Fondo del círculo */}
        <circle
          cx="75"
          cy="75"
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="12"
          fill="none"
        />
        
        {/* Segmento de éxito */}
        <circle
          cx="75"
          cy="75"
          r={radius}
          stroke="url(#donutSuccess)"
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - successStroke}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        
        {/* Segmento neutral */}
        <circle
          cx="75"
          cy="75"
          r={radius}
          stroke="url(#donutNeutral)"
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (successStroke + neutralStroke)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out 0.3s' }}
          transform="rotate(0 75 75)"
        />

        <defs>
          <linearGradient id="donutSuccess" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="donutNeutral" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="absolute text-center">
        <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          {Math.round(successRate * animationProgress)}%
        </div>
        <div className="text-sm text-gray-400 mt-1">Éxito</div>
      </div>
    </div>
  );
};

const Dashboard = ({ onOpenProfile }) => {
  const { user } = useAuth();
  const [totalOperations, setTotalOperations] = useState(0);
  const [totalProfitUsdt, setTotalProfitUsdt] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [monthlyPerformance, setMonthlyPerformance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

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
          const monthlyPerformanceCalc = monthlyCryptoBought - monthlyCryptoSold;
          const successRateCalc = totalProfitUsdtCalc > 0 ? 100 : 0;

          setTotalProfitUsdt(totalProfitUsdtCalc);
          setSuccessRate(successRateCalc);
          setMonthlyPerformance(monthlyPerformanceCalc);
        } else {
          setTotalOperations(0);
          setTotalProfitUsdt(0);
          setSuccessRate(0);
          setMonthlyPerformance(0);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Error al cargar los datos del dashboard.");
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatNumber = useCallback((num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }, []);

  const handleSelectPlan = (planType) => {
    setSelectedPlan(planType);
    setShowPaymentModal(true);
  };

  const MetricCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <div 
      className="relative group cursor-pointer transform hover:scale-105 transition-all duration-300"
      onMouseEnter={() => setHoveredCard(title)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
      <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5"></div>
        
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-300 font-medium text-sm uppercase tracking-wider">{title}</h3>
          <div className={`p-2 rounded-xl bg-gradient-to-r ${color} shadow-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        
        <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">{subtitle}</span>
          {trend && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              trend.positive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}>
              {trend.positive ? "↗" : "↘"} {trend.value}
            </span>
          )}
        </div>
        
        {/* Efecto de brillo al hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
      </div>
    </div>
  );

  const PaymentModal = () => {
    if (!showPaymentModal) return null;

    const planDetails = {
      monthly: {
        name: "Plan Premium Mensual",
        price: "$13",
        period: "/mes",
        features: ["Operaciones ilimitadas", "Exportaciones ilimitadas", "Soporte prioritario", "Análisis avanzado"]
      },
      annual: {
        name: "Plan Premium Anual",
        price: "$125", 
        period: "/año",
        features: ["Operaciones ilimitadas", "Exportaciones ilimitadas", "Soporte prioritario", "Alertas personalizadas", "Análisis avanzado", "Reportes executive"],
        savings: "Ahorra ~20%"
      }
    };

    const plan = planDetails[selectedPlan];

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 border-2 border-purple-500/30 max-w-md w-full relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-xl"></div>
          
          <button 
            onClick={() => setShowPaymentModal(false)}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-10"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          <div className="text-center mb-6 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl mb-4">
              <RocketLaunchIcon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{plan?.name}</h3>
            <div className="flex items-center justify-center gap-2">
              <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">{plan?.price}</span>
              <span className="text-gray-400 text-lg">{plan?.period}</span>
            </div>
            {plan?.savings && (
              <span className="inline-block mt-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                {plan.savings}
              </span>
            )}
          </div>

          <div className="mb-6 relative z-10">
            <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <CheckBadgeIcon className="h-4 w-4 text-green-400" />
              Características incluidas:
            </h4>
            <ul className="space-y-3">
              {plan?.features?.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-300">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full mr-3"></div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-3 relative z-10">
            <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 px-6 rounded-xl transition-all duration-300 font-semibold shadow-lg shadow-purple-500/25">
              💳 Pagar con Tarjeta
            </button>
            <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-4 px-6 rounded-xl transition-all duration-300 font-semibold">
              ⚡ Binance Pay
            </button>
            <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-4 px-6 rounded-xl transition-all duration-300 font-semibold">
              🔗 Otros Métodos
            </button>
          </div>

          <div className="text-center text-xs text-gray-500 mt-4 relative z-10">
            <p>🔒 Pago 100% seguro • Cancelación en cualquier momento</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <SparklesIcon className="h-8 w-8 text-purple-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="flex justify-center mb-3">
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              JJXCAPITAL<span className="text-yellow-400">⚡</span>
            </div>
          </div>
          <p className="text-gray-400 text-lg mb-2">Cargando dashboard premium...</p>
          <p className="text-gray-600 text-sm">Preparando tu análisis de inversión</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center p-4">
        <div className="text-center p-8 bg-gray-900/70 backdrop-blur-lg rounded-3xl border border-purple-500/30 max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              JJXCAPITAL<span className="text-yellow-400">⚡</span>
            </div>
          </div>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-red-400 text-xl font-semibold mb-2">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/20"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black text-white overflow-hidden">
      {/* Fondo animado */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-950/50 to-black"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
      </div>

      <header className="relative z-10 border-b border-purple-500/20 bg-black/30 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-2xl shadow-2xl shadow-purple-500/30">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                JJXCAPITAL<span className="text-yellow-400">⚡</span>
              </div>
              <div className="text-xs text-gray-400">Premium Trading Platform</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex gap-1 bg-gray-900/50 p-1 rounded-2xl border border-purple-500/10">
              {["overview", "performance", "reports"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeTab === tab 
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab === 'overview' ? 'Resumen' : tab === 'performance' ? 'Rendimiento' : 'Reportes'}
                </button>
              ))}
            </nav>
            
            <button
              onClick={onOpenProfile}
              className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-purple-500/30 hover:border-purple-400 transition-all duration-300 group"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 group-hover:from-white/5 group-hover:to-white/10 transition-all duration-300"></div>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-8">
        {/* Header con bienvenida */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl md:text-4xl font-bold">
              Bienvenido, <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                {user?.displayName || user?.email?.split('@')[0] || 'Inversor'}
              </span>
            </h2>
            <div className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-xs font-bold">
              PREMIUM
            </div>
          </div>
          <p className="text-gray-400 text-lg">Tu dashboard de trading avanzado</p>
        </div>

        {/* Grid de Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Operaciones"
            value={totalOperations}
            icon={ChartBarIcon}
            color="from-blue-500 to-cyan-500"
            subtitle="Operaciones realizadas"
          />
          
          <MetricCard
            title="Ganancia USDT"
            value={`$${formatNumber(totalProfitUsdt)}`}
            icon={CurrencyDollarIcon}
            color="from-green-500 to-emerald-500"
            subtitle="Balance total en USDT"
            trend={{ positive: totalProfitUsdt >= 0, value: `${totalProfitUsdt >= 0 ? '+' : ''}${formatNumber(totalProfitUsdt)}` }}
          />
          
          <MetricCard
            title="Tasa de Éxito"
            value={`${successRate}%`}
            icon={CheckBadgeIcon}
            color="from-purple-500 to-pink-500"
            subtitle="Operaciones exitosas"
          />
          
          <MetricCard
            title="Rendimiento Mensual"
            value={`$${formatNumber(monthlyPerformance)}`}
            icon={ArrowTrendingUpIcon}
            color="from-amber-500 to-orange-500"
            subtitle="Últimos 30 días"
            trend={{ positive: monthlyPerformance >= 0, value: `${monthlyPerformance >= 0 ? '+' : ''}${formatNumber(monthlyPerformance)}` }}
          />
        </div>

        {/* Sección de gráficos y análisis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="relative bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-3xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5"></div>
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Rendimiento Mensual
                  </h2>
                  <p className="text-gray-400 text-sm">Evolución de tus inversiones</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300">
                  <CalendarDaysIcon className="h-4 w-4" />
                  <span className="text-sm">Período</span>
                </button>
              </div>
              
              <AnimatedChart data={monthlyPerformance} positive={monthlyPerformance >= 0} />
            </div>
          </div>
          
          <div className="relative bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-3xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5"></div>
            
            <div className="mb-6 relative z-10">
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
                Distribución
              </h2>
              <p className="text-gray-400 text-sm">Análisis de operaciones</p>
            </div>
            
            <AnimatedDonutChart successRate={successRate} />
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                  <span className="text-sm">Operaciones exitosas</span>
                </div>
                <span className="text-sm font-bold">{successRate}%</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                  <span className="text-sm">Operaciones neutras</span>
                </div>
                <span className="text-sm font-bold">20%</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-500 to-gray-600"></div>
                  <span className="text-sm">Operaciones en pérdida</span>
                </div>
                <span className="text-sm font-bold">10%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Planes Premium */}
        <div className="relative bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-3xl p-8 border border-purple-500/20 mb-8 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                Planes Premium Exclusive
              </h2>
              <p className="text-gray-400">Potencia tu estrategia con herramientas avanzadas</p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl">
              <SparklesIcon className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-semibold">Recomendado</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            {/* Plan Mensual */}
            <div className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-500 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Premium Mensual</h3>
                    <p className="text-gray-400 text-sm">Ideal para traders activos</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">$13<span className="text-gray-400 text-lg">/mes</span></div>
                  </div>
                </div>

                <div className="mb-6 space-y-3">
                  {["Operaciones ilimitadas", "Exportaciones PDF/Excel", "Soporte prioritario 24/7", "Análisis técnico avanzado"].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm text-gray-300">
                      <CheckBadgeIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => handleSelectPlan('monthly')}
                  className="w-full py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 group-hover:shadow-lg"
                >
                  Seleccionar Plan
                </button>
              </div>
            </div>

            {/* Plan Anual - Destacado */}
            <div className="group relative bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-6 border-2 border-purple-500/50 hover:border-purple-500/80 transition-all duration-500 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-lg opacity-30"></div>
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full text-xs font-bold text-black">
                  MÁS POPULAR
                </div>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Premium Anual</h3>
                    <p className="text-gray-300 text-sm">Para traders profesionales</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">$125<span className="text-gray-300 text-lg">/año</span></div>
                    <div className="text-green-400 text-sm font-semibold">Ahorra ~20%</div>
                  </div>
                </div>

                <div className="mb-6 space-y-3">
                  {["Todo lo del plan mensual", "Alertas inteligentes", "Reportes executive", "API access", "Mentoría premium", "Webinars exclusivos"].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm text-gray-300">
                      <CheckBadgeIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => handleSelectPlan('annual')}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/25"
                >
                  💎 Comenzar Ahora
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm pb-6">
          <div className="flex justify-center items-center gap-3 mb-3">
            <div className="text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              JJXCAPITAL<span className="text-yellow-400">⚡</span>
            </div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheckIcon className="h-3 w-3 text-green-400" />
              Plataforma segura
            </div>
          </div>
          <p>© {new Date().getFullYear()} JJXCAPITAL⚡ • Sistema avanzado de trading</p>
        </div>
      </main>

      <PaymentModal />
    </div>
  );
};

export default Dashboard;