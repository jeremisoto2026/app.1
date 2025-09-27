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

// Componente de gráfica premium mejorada
const PremiumChart = ({ data, positive }) => {
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationProgress(1);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Datos simulados más realistas
  const chartData = positive
    ? [65, 78, 90, 82, 95, 110, 105, 120, 135, 125, 140, 130]
    : [100, 85, 78, 92, 75, 68, 82, 70, 65, 80, 72, 60];

  const maxValue = Math.max(...chartData);
  const minValue = Math.min(...chartData);

  return (
    <div className="relative h-72 w-full">
      {/* Eje Y */}
      <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
        <span>${maxValue}</span>
        <span>${Math.round((maxValue + minValue) / 2)}</span>
        <span>${minValue}</span>
      </div>

      {/* Línea de gráfico principal */}
      <div className="absolute left-12 right-6 top-0 bottom-6">
        <svg viewBox="0 0 400 200" className="w-full h-full">
          {/* Línea de fondo */}
          <path
            d={`M0,${200 - ((chartData[0] - minValue) / (maxValue - minValue)) * 180} ${chartData.map((value, index) => 
              `L${(index / (chartData.length - 1)) * 360},${200 - ((value - minValue) / (maxValue - minValue)) * 180}`
            ).join(' ')}`}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
            fill="none"
          />
          
          {/* Línea animada */}
          <path
            d={`M0,${200 - ((chartData[0] - minValue) / (maxValue - minValue)) * 180} ${chartData.map((value, index) => 
              `L${(index / (chartData.length - 1)) * 360},${200 - ((value - minValue) / (maxValue - minValue)) * 180}`
            ).join(' ')}`}
            stroke={positive ? "url(#premiumSuccess)" : "url(#premiumDanger)"}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="1000"
            strokeDashoffset={1000 - (1000 * animationProgress)}
            style={{ transition: 'stroke-dashoffset 2s ease-in-out' }}
          />
          
          {/* Área gradiente */}
          <defs>
            <linearGradient id="premiumSuccess" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="premiumDanger" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>

        {/* Puntos de datos animados */}
        {chartData.map((value, index) => (
          <div
            key={index}
            className="absolute w-4 h-4 rounded-full border-4 border-white shadow-lg transform -translate-x-2 -translate-y-2"
            style={{
              left: `${(index / (chartData.length - 1)) * 100}%`,
              top: `${100 - ((value - minValue) / (maxValue - minValue)) * 90}%`,
              opacity: animationProgress,
              transition: `all 0.5s ${index * 0.1}s`,
              background: positive ? '#8B5CF6' : '#EF4444',
              borderColor: positive ? 'rgba(139, 92, 246, 0.8)' : 'rgba(239, 68, 68, 0.8)'
            }}
          />
        ))}
      </div>

      {/* Eje X */}
      <div className="absolute left-12 right-6 bottom-0 flex justify-between text-xs text-gray-500">
        {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((month, index) => (
          <span key={index}>{month}</span>
        ))}
      </div>
    </div>
  );
};

// Componente de donut chart premium
const PremiumDonutChart = ({ successRate }) => {
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationProgress(1);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const successStroke = (successRate / 100) * circumference * animationProgress;
  const neutralStroke = (25 / 100) * circumference * animationProgress;

  return (
    <div className="relative flex items-center justify-center py-8">
      <svg width="200" height="200" className="transform -rotate-90 drop-shadow-2xl">
        {/* Fondo del círculo */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="16"
          fill="none"
        />
        
        {/* Segmento de éxito */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          stroke="url(#donutPremium)"
          strokeWidth="16"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - successStroke}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
        
        {/* Segmento neutral */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          stroke="url(#donutNeutralPremium)"
          strokeWidth="16"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (successStroke + neutralStroke)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s ease-out 0.5s' }}
        />

        <defs>
          <linearGradient id="donutPremium" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="donutNeutralPremium" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="absolute text-center">
        <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">
          {Math.round(successRate * animationProgress)}%
        </div>
        <div className="text-gray-400 text-sm mt-2 font-medium">Tasa de Éxito</div>
        <div className="text-xs text-gray-500 mt-1">Global Performance</div>
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
  const [hoveredMetric, setHoveredMetric] = useState(null);

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

  const MetricCard = ({ title, value, icon: Icon, color, subtitle, trend, index }) => (
    <div 
      className="relative group cursor-pointer transform hover:scale-[1.02] transition-all duration-500"
      onMouseEnter={() => setHoveredMetric(index)}
      onMouseLeave={() => setHoveredMetric(null)}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Efecto de fondo luminoso */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} rounded-3xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500`}></div>
      
      {/* Tarjeta principal */}
      <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-800/80 backdrop-blur-2xl rounded-2xl p-6 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-500 overflow-hidden">
        
        {/* Efecto de borde luminoso */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="text-gray-300 font-semibold text-sm uppercase tracking-wider">{title}</h3>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-2xl transform group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        
        <p className="text-3xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent mb-2 leading-tight">
          {typeof value === 'number' ? (title.includes('USDT') ? `$${formatNumber(value)}` : value) : value}
        </p>
        
        <div className="flex items-center justify-between relative z-10">
          <span className="text-gray-400 text-sm font-medium">{subtitle}</span>
          {trend && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm ${
              trend.positive 
                ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}>
              {trend.positive ? "↗" : "↘"} {trend.value}
            </span>
          )}
        </div>
        
        {/* Efecto de partículas al hover */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </div>
    </div>
  );

  // Modal de Pagos (sin modificar)
  const PaymentModal = () => {
    if (!showPaymentModal) return null;

    const planDetails = {
      monthly: {
        name: "Plan Premium Mensual",
        price: "$13",
        period: "/mes",
        features: ["Operaciones ilimitadas", "Exportaciones ilimitadas", "Soporte prioritario"]
      },
      annual: {
        name: "Plan Premium Anual",
        price: "$125", 
        period: "/año",
        features: ["Operaciones ilimitadas", "Exportaciones ilimitadas", "Soporte prioritario", "Alertas personalizadas"],
        savings: "Ahorra ~20%"
      }
    };

    const plan = planDetails[selectedPlan];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border-2 border-purple-500/30 max-w-md w-full relative">
          {/* Botón de cerrar */}
          <button 
            onClick={() => setShowPaymentModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Header del modal */}
          <div className="text-center mb-6">
            <RocketLaunchIcon className="h-12 w-12 text-purple-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white">{plan?.name}</h3>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-3xl font-bold text-white">{plan?.price}</span>
              <span className="text-gray-400">{plan?.period}</span>
            </div>
            {plan?.savings && (
              <span className="text-green-400 text-sm font-semibold mt-1 block">
                {plan.savings}
              </span>
            )}
          </div>

          {/* Características del plan */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Características incluidas:</h4>
            <ul className="space-y-2">
              {plan?.features?.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-300">
                  <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Métodos de pago */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Métodos de pago</h4>
            <div className="grid grid-cols-1 gap-3">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                PayPal
              </button>
              <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-3 px-4 rounded-lg transition-colors font-medium">
                Binance Pay
              </button>
              <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3 px-4 rounded-lg transition-colors font-medium">
                Blockchain Pay
              </button>
            </div>
          </div>

          {/* Información adicional */}
          <div className="text-center text-xs text-gray-400">
            <p>Pago seguro • Cancelación en cualquier momento</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <SparklesIcon className="h-8 w-8 text-purple-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="flex justify-center mb-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              JJXCAPITAL<span className="text-yellow-400">⚡</span>
            </div>
          </div>
          <p className="text-gray-400 text-lg">Cargando dashboard premium...</p>
          <p className="text-gray-600 text-sm mt-2">Preparando tu análisis de inversión</p>
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
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-300 shadow-lg shadow-purple-500/20"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black text-white overflow-x-hidden">
      {/* Fondos animados premium */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/5 via-transparent to-transparent"></div>
      </div>

      {/* Header premium */}
      <header className="relative z-20 border-b border-purple-500/20 bg-black/40 backdrop-blur-2xl sticky top-0">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-2xl shadow-2xl shadow-purple-500/30">
                  <SparklesIcon className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black"></div>
              </div>
              <div>
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  JJXCAPITAL<span className="text-yellow-400">⚡</span>
                </div>
                <div className="text-xs text-gray-400 font-medium">TRADING PLATFORM</div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <nav className="hidden lg:flex gap-1 bg-black/30 p-2 rounded-2xl border border-purple-500/10 backdrop-blur-sm">
                {[
                  { id: 'overview', label: 'Resumen', icon: ChartBarIcon },
                  { id: 'performance', label: 'Rendimiento', icon: ArrowTrendingUpIcon },
                  { id: 'reports', label: 'Reportes', icon: ChartPieIcon }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      activeTab === tab.id 
                        ? 'bg-gradient-to-r from-purple-600/30 to-blue-600/30 text-white shadow-lg shadow-purple-500/20 border border-purple-500/30' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
              
              <button
                onClick={onOpenProfile}
                className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-purple-500/40 hover:border-purple-400 transition-all duration-300 group"
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
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-8">
        {/* Header con bienvenida premium */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20 mb-6">
            <SparklesIcon className="h-5 w-5 text-purple-400" />
            <span className="text-sm font-semibold text-gray-300">DASHBOARD PREMIUM</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Bienvenido, <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {user?.displayName || user?.email?.split('@')[0] || 'Inversor'}
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Tu centro de control para trading inteligente. Monitorea, analiza y optimiza tus estrategias.
          </p>
        </div>

        {/* Grid de Métricas principales - Diseño premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <MetricCard
            title="Total Operaciones"
            value={totalOperations}
            icon={ChartBarIcon}
            color="from-blue-500 to-cyan-500"
            subtitle="Operaciones ejecutadas"
            index={0}
          />
          
          <MetricCard
            title="Ganancia Total"
            value={totalProfitUsdt}
            icon={CurrencyDollarIcon}
            color="from-green-500 to-emerald-500"
            subtitle="Balance en USDT"
            trend={{ positive: totalProfitUsdt >= 0, value: `${totalProfitUsdt >= 0 ? '+' : ''}$${formatNumber(Math.abs(totalProfitUsdt))}` }}
            index={1}
          />
          
          <MetricCard
            title="Tasa de Éxito"
            value={`${successRate}%`}
            icon={CheckBadgeIcon}
            color="from-purple-500 to-pink-500"
            subtitle="Eficiencia operacional"
            index={2}
          />
          
          <MetricCard
            title="Rendimiento 30D"
            value={monthlyPerformance}
            icon={ArrowTrendingUpIcon}
            color="from-amber-500 to-orange-500"
            subtitle="Último mes"
            trend={{ positive: monthlyPerformance >= 0, value: `${monthlyPerformance >= 0 ? '+' : ''}$${formatNumber(Math.abs(monthlyPerformance))}` }}
            index={3}
          />
        </div>

        {/* Sección de gráficos premium */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
          {/* Gráfico principal */}
          <div className="xl:col-span-2">
            <div className="relative bg-gradient-to-br from-gray-900/60 to-gray-800/40 backdrop-blur-2xl rounded-3xl p-8 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent mb-2">
                    Rendimiento Anual
                  </h2>
                  <p className="text-gray-400">Evolución de tu portfolio en los últimos 12 meses</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 border border-purple-500/20">
                  <CalendarDaysIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">2024</span>
                </button>
              </div>
              
              <PremiumChart data={monthlyPerformance} positive={monthlyPerformance >= 0} />
            </div>
          </div>
          
          {/* Gráfico de distribución */}
          <div className="relative bg-gradient-to-br from-gray-900/60 to-gray-800/40 backdrop-blur-2xl rounded-3xl p-8 border border-purple-500/30 hover:border-purple-500/50 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5"></div>
            
            <div className="mb-8 relative z-10">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent mb-2">
                Distribución
              </h2>
              <p className="text-gray-400">Análisis detallado de operaciones</p>
            </div>
            
            <PremiumDonutChart successRate={successRate} />
            
            <div className="space-y-4 relative z-10 mt-8">
              {[
                { label: "Operaciones exitosas", value: `${successRate}%`, color: "from-purple-500 to-pink-500" },
                { label: "Operaciones neutras", value: "25%", color: "from-cyan-500 to-blue-500" },
                { label: "Operaciones en pérdida", value: "5%", color: "from-gray-500 to-gray-600" }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${item.color}`}></div>
                    <span className="text-sm font-medium text-gray-300">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sección: Planes Premium - Diseño ultra premium */}
        <div className="relative bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-2xl rounded-3xl p-8 border border-purple-500/30 mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5"></div>
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          
          <div className="text-center mb-12 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full border border-purple-500/30 mb-4">
              <RocketLaunchIcon className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-semibold text-gray-300">PLANES PREMIUM</span>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
              Potencia tu Trading
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Accede a herramientas avanzadas y lleva tu estrategia al siguiente nivel
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            {/* Plan Mensual */}
            <div className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/40 rounded-2xl p-8 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-500 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Premium Mensual</h3>
                    <p className="text-gray-400">Ideal para traders activos</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">$13<span className="text-gray-400 text-lg">/mes</span></div>
                  </div>
                </div>

                <div className="mb-8 space-y-4">
                  {["Operaciones ilimitadas", "Exportaciones PDF/Excel", "Soporte prioritario 24/7", "Análisis técnico avanzado"].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 text-gray-300">
                      <CheckBadgeIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => handleSelectPlan('monthly')}
                  className="w-full py-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold rounded-xl transition-all duration-300 group-hover:shadow-lg border border-gray-600/50"
                >
                  Comenzar Prueba
                </button>
              </div>
            </div>

            {/* Plan Anual - Destacado */}
            <div className="group relative bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-8 border-2 border-purple-500/50 hover:border-purple-500/80 transition-all duration-500 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10"></div>
              <div className="absolute top-6 right-6">
                <div className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full text-sm font-bold text-black shadow-lg">
                  ⚡ MÁS POPULAR
                </div>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Premium Anual</h3>
                    <p className="text-gray-300">Para traders profesionales</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">$125<span className="text-gray-300 text-lg">/año</span></div>
                    <div className="text-green-400 text-sm font-bold mt-1">Ahorra ~20%</div>
                  </div>
                </div>

                <div className="mb-8 space-y-4">
                  {["Todo lo del plan mensual", "Alertas inteligentes", "Reportes executive", "API access", "Mentoría premium", "Webinars exclusivos"].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 text-gray-300">
                      <CheckBadgeIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => handleSelectPlan('annual')}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/25 border border-purple-500/50"
                >
                  💎 Comenzar Ahora
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer premium */}
        <div className="text-center py-8 border-t border-purple-500/20">
          <div className="flex justify-center items-center gap-4 mb-4">
            <div className="text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              JJXCAPITAL<span className="text-yellow-400">⚡</span>
            </div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <-600 rounded-full"></div>
            <div className="flexdiv className="flex items items-center gap-2 text-sm text-gray-400">
             -center gap-2 text-sm text-gray-400">
              <Sh <ShieldCheckIcon className="h-ieldCheckIcon className="h-4 w4 w--4 text-green-400" />
4 text-green-400" />
                           Plataforma seg Plataforma segura y encriptura y encriptada
ada
            </            </divdiv>
>
                   </div </div>
          <p className="text>
          <p className="text-gray-500 text-sm">-gray-500 text-sm">© {© {new Date().getFullYear()}new Date().getFullYear()} JJX JJXCAPITAL⚡ • Sistema premium de trading avanzado</p>
CAPITAL⚡ • Sistema premium de trading avanzado</p>
        </        </div>
      </main>

div>
      </      <PaymentModal />
    </divmain>

      <PaymentModal />
    </div>
 >
  );
};

 );
};

export default Dashboard;