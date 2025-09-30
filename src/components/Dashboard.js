// Dashboard.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import {
  RocketLaunchIcon,
  CheckBadgeIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserIcon,
  CalendarDaysIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

// Añadir la variable API_BASE después de los imports
const API_BASE = process.env.REACT_APP_BACKEND_URL;

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

  // --- Estados optimizados para Binance ---
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [binanceConnected, setBinanceConnected] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState("");

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

  // --- Listener optimizado para estado Binance ---
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userDocRef, (snap) => {
      if (!snap.exists()) {
        setBinanceConnected(false);
        setMaskedApiKey("");
        return;
      }
      const data = snap.data();
      if (data?.binanceConnected) {
        setBinanceConnected(true);
        // Enmascarar API Key para mostrar
        if (data?.binanceApiKey) {
          const k = data.binanceApiKey;
          const visible = k.slice(0, 4);
          const last = k.slice(-4);
          setMaskedApiKey(`${visible}••••••••${last}`);
        } else {
          setMaskedApiKey("");
        }
      } else {
        setBinanceConnected(false);
        setMaskedApiKey("");
      }
    }, (err) => {
      console.error("Error escuchando usuario:", err);
    });

    return () => unsub();
  }, [user]);

  // === FUNCIONES OPTIMIZADAS PARA BINANCE ===

  // Conectar Binance
  const connectBinance = async () => {
    if (!user) {
      setError("No estás autenticado.");
      return;
    }
    if (!apiKey || !apiSecret) {
      setError("Por favor ingresa API Key y API Secret.");
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      const resp = await axios.post(`${API_BASE}/api/connect-binance`, {
        uid: user.uid,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      });

      if (resp.data?.success) {
        // Éxito: limpiar inputs y actualizar estado
        setApiKey("");
        setApiSecret("");
        setIsVerifying(false);
        // El estado binanceConnected se actualizará automáticamente via el listener de Firestore
      } else {
        setIsVerifying(false);
        setError(resp.data?.error || "Error conectando con Binance");
      }
    } catch (err) {
      console.error("Error connect-binance:", err.response?.data || err.message);
      setIsVerifying(false);
      setError(err.response?.data?.error || err.message || "Error en la conexión");
    }
  };

  // === NUEVA FUNCIÓN DESCONECTAR CORREGIDA ===
  const disconnectBinance = async () => {
    if (!user) {
      setError("No estás autenticado.");
      return;
    }

    setIsDisconnecting(true);
    setError(null);

    try {
      const resp = await axios.post(`${API_BASE}/api/disconnect-binance`, { uid: user.uid });

      if (resp.data?.success) {
        // ✅ Actualizar UI inmediatamente
        setBinanceConnected(false);
        setMaskedApiKey("");
        setApiKey("");
        setApiSecret("");
        setIsDisconnecting(false);

        // Mensaje temporal de confirmación
        setError("Desconectado correctamente.");
        setTimeout(() => setError(null), 2000);
      } else {
        setIsDisconnecting(false);
        setError(resp.data?.error || "No se pudo desconectar");
      }
    } catch (err) {
      console.error("Error disconnect-binance:", err.response?.data || err.message);
      setIsDisconnecting(false);
      setError(err.response?.data?.error || err.message || "Error al desconectar");
    }
  };

  // Función para formatear números con separadores de miles
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Función para manejar la selección de plan
  const handleSelectPlan = (planType) => {
    setSelectedPlan(planType);
    setShowPaymentModal(true);
  };

  // Función para abrir enlace de creación de API
  const handleCreateAPI = () => {
    window.open("https://www.binance.com/es/my/settings/api-management", "_blank");
  };

  // Componente del Modal de Pagos
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
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
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

  if (error && !error.includes("Desconectado correctamente")) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black text-white">
      {/* Header con navegación */}
      <header className="border-b border-purple-500/20 bg-black/30 backdrop-blur-xl sticky top-0 z-10">
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
            <div className="hidden md:flex space-x-1 bg-gray-900/50 p-1 rounded-lg border border-purple-500/10">
              <button 
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-gradient-to-r from-purple-700 to-blue-700 text-white shadow-md shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('overview')}
              >
                Dashboard
              </button>
              <button 
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'p2p' ? 'bg-gradient-to-r from-purple-700 to-blue-700 text-white shadow-md shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('p2p')}
              >
                P2P
              </button>
              <button 
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'arbitrage' ? 'bg-gradient-to-r from-purple-700 to-blue-700 text-white shadow-md shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('arbitrage')}
              >
                Arbitraje
              </button>
              <button 
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'operations' ? 'bg-gradient-to-r from-purple-700 to-blue-700 text-white shadow-md shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('operations')}
              >
                Operaciones
              </button>
              <button 
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-gradient-to-r from-purple-700 to-blue-700 text-white shadow-md shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('history')}
              >
                Historial
              </button>
            </div>
            
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
          <p className="text-gray-400">Tu dashboard premium de JJXCAPITAL⚡</p>
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
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-xl border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-10 blur transition-all duration-300"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Tasa de Éxito</h3>
              <div className="p-2 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <CheckBadgeIcon className="h-5 w-5 text-purple-400" />
              </div>
            </div>
            <div className="flex items-end">
              <p className="text-2xl md:text-3xl font-bold mb-1">{successRate}%</p>
              <div className="ml-3 text-xs px-2 py-1 rounded-full bg-purple-900/50 text-purple-300">
                {successRate >= 50 ? "Excelente" : "En progreso"}
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <span className="h-2 w-2 bg-purple-500 rounded-full mr-2"></span>
              Operaciones exitosas
            </div>
          </div>

          {/* Tarjeta: Rendimiento Mensual */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 shadow-xl border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-10 blur transition-all duration-300"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Rendimiento 30 días</h3>
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
                {monthlyPerformance >= 0 ? "Positivo" : "Negativo"}
              </span>
            </div>
          </div>
        </div>

        {/* =========================
            Sección: Conexión Binance P2P OPTIMIZADA
            ========================= */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-purple-500/20 mb-8 relative overflow-hidden">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-5 blur"></div>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Conectar Binance P2P
              </h2>
              <p className="text-gray-400">Registra automáticamente tus órdenes</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
          </div>

          {/* Mensaje informativo */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-blue-200/80 text-sm">
                  Para llevar a cabo este proceso, requerimos tus claves API. Asegúrate siempre de ingresar la clave API correspondiente a los impuestos o la de solo lectura.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulario de conexión - RENDERIZADO CONDICIONAL */}
            <div className="space-y-6">
              {!binanceConnected ? (
                // ESTADO: NO CONECTADO - Mostrar inputs
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        type="text"
                        placeholder="Ej: AbCdEFG..."
                        className="w-full bg-gray-800/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Secret
                    </label>
                    <div className="relative">
                      <input
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        type="password"
                        placeholder="Tu API Secret"
                        className="w-full bg-gray-800/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={connectBinance}
                      disabled={isVerifying}
                      className={`flex-1 ${isVerifying ? 'opacity-60 cursor-not-allowed' : ''} bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-purple-500/20`}
                    >
                      <div className="flex items-center justify-center">
                        <CheckBadgeIcon className="h-5 w-5 mr-2" />
                        {isVerifying ? 'Verificando...' : 'Conectar'}
                      </div>
                    </button>

                    <button 
                      onClick={handleCreateAPI}
                      className="px-6 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-xl transition-all duration-300 border border-gray-600"
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-sm">Crear API</span>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                // ESTADO: CONECTADO - Mostrar estado y botón desconectar
                <>
                  <div className="text-center p-6 bg-green-900/20 border border-green-500/30 rounded-xl">
                    <div className="inline-flex items-center gap-3 text-green-300 mb-4">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div className="text-left">
                        <div className="font-semibold text-lg">✅ Binance Conectado</div>
                        {maskedApiKey && <div className="text-sm text-green-200">API: {maskedApiKey}</div>}
                      </div>
                    </div>
                    
                    <button
                      onClick={disconnectBinance}
                      disabled={isDisconnecting}
                      className={`w-full ${isDisconnecting ? 'opacity-60 cursor-not-allowed' : ''} bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl transition-all duration-300 border border-red-500`}
                    >
                      {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                    </button>
                  </div>
                </>
              )}

              {/* Mensajes de error */}
              {error && (
                <div className={`mt-3 p-3 rounded-xl ${
                  error.includes("Desconectado correctamente") 
                    ? "bg-green-900/20 border border-green-500/30" 
                    : "bg-red-900/20 border border-red-500/30"
                }`}>
                  <div className={`text-sm ${
                    error.includes("Desconectado correctamente") 
                      ? "text-green-400" 
                      : "text-red-400"
                  }`}>
                    {error}
                  </div>
                </div>
              )}
            </div>

            {/* Panel de información */}
            <div className="bg-gray-800/30 rounded-xl p-5 border border-blue-500/20">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg mr-3">
                  <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-blue-300 font-semibold">Consejos de seguridad</h3>
              </div>
              
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Crea una API Key con permisos mínimos necesarios</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Idealmente el backend maneja las claves y firma las peticiones</span>
                </li>
                <li className="flex items-start">
                  <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Usa siempre la clave API de solo lectura para impuestos</span>
                </li>
              </ul>

              <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center text-xs text-gray-400">
                  <CalendarDaysIcon className="h-4 w-4 mr-2" />
                  <span>Se toman las operaciones de los últimos 10 días</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer de la sección */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <div className="flex items-center text-sm text-gray-400 mb-2 sm:mb-0">
                <span className="text-yellow-400 mr-1">⚡</span>
                Próximamente agregaremos más exchanges
              </div>
              <div className="flex items-center">
                <div className="text-sm font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                  JJXCAPITAL
                </div>
                <div className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                  ✅
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Planes Premium */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-purple-500/20 mb-8 relative overflow-hidden">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-5 blur"></div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Planes Premium JJXCAPITAL⚡</h2>
              <p className="text-gray-400">Potencia tu estrategia de trading con nuestros planes exclusivos</p>
            </div>
            <RocketLaunchIcon className="h-8 w-8 text-purple-500" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card: Plan Premium Mensual */}
            <div className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-purple-500/30 hover:border-purple-500 hover:shadow-2xl transition-all duration-500 cursor-pointer relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-purple-500/10 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-purple-500/10 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-purple-300 transition-colors">
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
                
                <button 
                  onClick={() => handleSelectPlan('monthly')}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-300 text-center group-hover:shadow-lg group-hover:shadow-purple-500/20"
                >
                  Seleccionar plan
                </button>
              </div>
            </div>

            {/* Card: Plan Premium Anual */}
            <div className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-purple-500/50 hover:border-purple-500 hover:shadow-2xl transition-all duration-500 cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">
                MÁS POPULAR
              </div>
              
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-purple-500/10 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-purple-500/10 rounded-full group-hover:scale-110 transition-transform duration-700"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-purple-300 transition-colors">
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
                
                <button 
                  onClick={() => handleSelectPlan('annual')}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium rounded-lg transition-all duration-300 text-center group-hover:shadow-lg group-hover:shadow-purple-500/30"
                >
                  Seleccionar plan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer o información adicional */}
        <div className="text-center text-gray-500 text-sm pb-6">
          <div className="flex justify-center items-center mb-2">
            <div className="text-lg font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              JJXCAPITAL<span className="text-yellow-400">⚡</span>
            </div>
          </div>
          <p>© {new Date().getFullYear()} JJXCAPITAL⚡ • Plataforma premium de trading</p>
        </div>
      </main>

      {/* Modal de Pagos */}
      <PaymentModal />
    </div>
  );
};

export default Dashboard;