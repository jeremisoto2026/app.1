// Dashboard.js
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
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
  CalendarDaysIcon,
  BoltIcon,
  XMarkIcon,
  ArrowPathIcon
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // ===== Estados para Binance Keys & Sync =====
  const [binanceApiKey, setBinanceApiKey] = useState("");
  const [binanceApiSecret, setBinanceApiSecret] = useState("");
  const [keysSaving, setKeysSaving] = useState(false);
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // ===== CONFIGURACIÓN BACKEND =====
  const BACKEND_URL = "https://backend-jjxcapital-orig.vercel.app";
  const ENDPOINTS = {
    SAVE_KEYS: `${BACKEND_URL}/controllers/saveBinanceKeys`,
    VERIFY_KEYS: `${BACKEND_URL}/controllers/verifyBinanceKeys`,
    SYNC_P2P: `${BACKEND_URL}/controllers/syncBinance`,
    CREATE_PAYMENT: `${BACKEND_URL}/api/create-payment`
  };

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

  // ===== Effect para verificar estado de conexión Binance =====
  useEffect(() => {
    const checkBinanceConnection = async () => {
      if (!user) return;
      try {
        // Verificar si hay claves guardadas en el backend
        const kdoc = await getDoc(doc(db, "binanceKeys", user.uid));
        if (kdoc.exists()) {
          const kd = kdoc.data();
          if (kd.apiKey && kd.apiSecret) {
            setIsConnected(true);
            setBinanceApiKey("✔");
            setBinanceApiSecret("✔");
          }
        }
      } catch (err) {
        console.error("Error checking Binance connection:", err);
      } finally {
        setKeysLoaded(true);
      }
    };
    checkBinanceConnection();
  }, [user]);

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

  // ===== CONEXIÓN Y VERIFICACIÓN CON BINANCE =====
  const handleConnectBinance = async () => {
    if (!user || !user.uid) {
      alert("Debes iniciar sesión primero.");
      return;
    }
    if (!binanceApiKey || !binanceApiSecret) {
      alert("Por favor completa API Key y API Secret.");
      return;
    }

    setKeysSaving(true);
    try {
      console.log("🔐 Verificando claves con backend...");

      // 1. Verificar claves con el backend
      const verifyResponse = await fetch(ENDPOINTS.VERIFY_KEYS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: binanceApiKey.trim(),
          apiSecret: binanceApiSecret.trim(),
        }),
      });

      const verifyData = await verifyResponse.json();
      console.log("✅ Respuesta verificación:", verifyData);

      if (!verifyResponse.ok || !verifyData.ok) {
        throw new Error(verifyData.error || "Error verificando las claves");
      }

      // 2. Guardar claves en el backend
      const saveResponse = await fetch(ENDPOINTS.SAVE_KEYS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          apiKey: binanceApiKey.trim(),
          apiSecret: binanceApiSecret.trim(),
        }),
      });

      const saveData = await saveResponse.json();
      console.log("💾 Respuesta guardado:", saveData);

      if (!saveResponse.ok) {
        throw new Error(saveData.error || "Error guardando las claves");
      }

      // 3. Actualizar estado local
      setIsConnected(true);
      setBinanceApiKey("✔");
      setBinanceApiSecret("✔");
      
      alert("✅ ¡Conexión exitosa! Claves guardadas de forma segura en el backend.");

      // 4. Sincronización automática inicial
      handleSyncBinanceP2P();

    } catch (error) {
      console.error("❌ Error conectando con Binance:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setKeysSaving(false);
    }
  };

  // ===== SINCRONIZACIÓN CON BINANCE P2P =====
  const handleSyncBinanceP2P = async () => {
    if (!user || !user.uid) {
      alert("Debes iniciar sesión primero.");
      return;
    }
    
    setSyncing(true);
    try {
      console.log("🔄 Iniciando sincronización con backend...");

      const response = await fetch(ENDPOINTS.SYNC_P2P, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": "JJXCapital-Frontend/1.0"
        },
        body: JSON.stringify({ 
          userId: user.uid,
          syncType: "p2p"
        }),
      });

      console.log("📡 Status respuesta:", response.status);
      
      let data;
      try {
        data = await response.json();
        console.log("📊 Datos respuesta:", data);
      } catch (e) {
        console.error("❌ Error parseando JSON:", e);
        throw new Error("Respuesta inválida del servidor");
      }

      if (response.ok) {
        const opsCount = data.operationsSaved || data.operations || 0;
        alert(`✅ Sincronización completada. ${opsCount} operaciones P2P sincronizadas.`);
        
        // Recargar datos del dashboard
        window.location.reload();
      } else {
        const errorMsg = data.error || data.details || data.message || "Error desconocido";
        console.error("❌ Error del backend:", data);
        alert(`❌ Error sincronizando: ${errorMsg}`);
      }
    } catch (error) {
      console.error("💥 Error de red:", error);
      alert("❌ Error de conexión con el backend. Verifica que esté funcionando.");
    } finally {
      setSyncing(false);
    }
  };

  // ===== DESCONEXIÓN DE BINANCE =====
  const handleDisconnectBinance = async () => {
    if (!user || !user.uid) return;

    if (confirm("¿Estás seguro de que quieres desconectar Binance? Las órdenes ya sincronizadas permanecerán.")) {
      try {
        // Eliminar claves de Firestore
        await setDoc(
          doc(db, "binanceKeys", user.uid),
          {
            apiKey: null,
            apiSecret: null,
            connectedAt: null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Limpiar estado local
        setIsConnected(false);
        setBinanceApiKey("");
        setBinanceApiSecret("");
        
        alert("✅ Binance desconectado correctamente.");
      } catch (err) {
        console.error("❌ Error desconectando:", err);
        alert("❌ Error al desconectar Binance.");
      }
    }
  };

  // ===== PAGO CON BINANCE PAY =====
  const handleBinancePayment = async () => {
    try {
      if (!user || !user.uid) {
        alert("Usuario no autenticado. Inicia sesión antes de pagar.");
        return;
      }
      if (!selectedPlan) {
        alert("Selecciona un plan primero.");
        return;
      }

      const amount = selectedPlan === "monthly" ? 13 : 125;

      console.log("💰 Enviando solicitud de pago a:", ENDPOINTS.CREATE_PAYMENT);

      const response = await fetch(ENDPOINTS.CREATE_PAYMENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          amount: amount,
          plan: selectedPlan,
        }),
      });

      console.log("📡 Status respuesta:", response.status);
      
      const data = await response.json();
      console.log("📦 Respuesta completa:", data);

      // Buscar URL de checkout en diferentes formatos de respuesta
      const checkoutUrl = data?.checkoutUrl || 
                         data?.data?.checkoutUrl || 
                         data?.payUrl || 
                         data?.data?.payUrl ||
                         data?.data?.url;

      if (checkoutUrl) {
        console.log("🔗 Redirigiendo a:", checkoutUrl);
        window.location.href = checkoutUrl;
      } else {
        console.warn("⚠️ No se encontró URL de checkout:", data);
        alert("No se pudo obtener la URL de pago. Revisa la consola para más detalles.");
      }
    } catch (error) {
      console.error("💥 Error en Binance Pay:", error);
      alert("Ocurrió un error al procesar el pago. Revisa la consola.");
    }
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
              <button
                onClick={handleBinancePayment}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-3 px-4 rounded-lg transition-colors font-medium"
              >
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black text-white">
      {/* Header con navegación */}
      <header className="border-b border-purple-500/20 bg-black/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg mr-3 shadow-lg shadow-purple-500/30">
              <BoltIcon className="h-6 w-6 text-white" />
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
                Resumen
              </button>
              <button 
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'performance' ? 'bg-gradient-to-r from-purple-700 to-blue-700 text-white shadow-md shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('performance')}
              >
                Rendimiento
              </button>
              <button 
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-gradient-to-r from-purple-700 to-blue-700 text-white shadow-md shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setActiveTab('reports')}
              >
                Reportes
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
          <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-purple-500/20 relative overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-10 blur transition-all duration-300"></div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Rendimiento mensual</h2>
              <button className="text-sm text-purple-400 hover:text-purple-300 flex items-center">
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
              <div className="absolute left-10 bottom-8 w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30"></div>
              <div className="absolute left-1/3 bottom-12 w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30"></div>
              <div className="absolute left-2/3 bottom-14 w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30"></div>
              <div className="absolute right-10 bottom-16 w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30"></div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-purple-500/20 relative overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-10 blur transition-all duration-300"></div>
            <h2 className="text-lg font-semibold mb-6">Distribución de operaciones</h2>
            
            {/* Gráfico de donut simulado */}
            <div className="relative h-48 flex items-center justify-center mb-4">
              <div className="absolute w-36 h-36 rounded-full border-8 border-purple-500/20"></div>
              <div className="absolute w-36 h-36 rounded-full border-8 border-purple-500 border-t-8 border-t-purple-500" style={{transform: 'rotate(calc(0.7 * 360deg))'}}></div>
              <div className="absolute w-36 h-36 rounded-full border-8 border-blue-500 border-r-8 border-r-blue-500" style={{transform: 'rotate(calc(0.5 * 360deg))'}}></div>
              
              <div className="text-center">
                <div className="text-2xl font-bold">{successRate}%</div>
                <div className="text-sm text-gray-400">Éxito</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
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

        {/* ======= SECCIÓN BINANCE P2P ACTUALIZADA ======= */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-yellow-500/30 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-yellow-400 flex items-center gap-2">
            <ArrowsRightLeftIcon className="h-6 w-6" /> Conectar Binance P2P
          </h2>

          {!keysLoaded ? (
            <p className="text-gray-400 text-sm">Cargando configuración Binance...</p>
          ) : isConnected ? (
            // ===== ESTADO: CONECTADO =====
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-900/20 rounded-lg">
                <CheckBadgeIcon className="h-6 w-6 text-green-400" />
                <div>
                  <p className="text-green-400 font-semibold">✅ Binance Conectado</p>
                  <p className="text-gray-400 text-sm">Sincronización a través del backend seguro</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleSyncBinanceP2P}
                  disabled={syncing}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium disabled:bg-gray-600"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                </button>

                <button
                  onClick={handleDisconnectBinance}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-red-600 hover:bg-red-700 rounded text-white font-medium"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Desconectar Binance
                </button>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                <p>💡 La sincronización se realiza de forma segura a través del backend</p>
                <p>🔒 Las API Keys se almacenan de forma segura en el backend</p>
              </div>
            </div>
          ) : (
            // ===== ESTADO: NO CONECTADO =====
            <div className="space-y-4">
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400 text-sm font-medium">🔒 Conexión Segura</p>
                <p className="text-gray-300 text-sm mt-1">
                  Tus claves de Binance se almacenan de forma segura en el backend, no en el navegador.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">API Key</label>
                  <input
                    value={binanceApiKey}
                    onChange={(e) => setBinanceApiKey(e.target.value)}
                    placeholder="Ej: AbCdEfG123..."
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">API Secret</label>
                  <input
                    type="password"
                    value={binanceApiSecret}
                    onChange={(e) => setBinanceApiSecret(e.target.value)}
                    placeholder="Tu clave secreta de Binance"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConnectBinance}
                  disabled={keysSaving}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-medium disabled:bg-gray-600"
                >
                  {keysSaving ? 'Conectando...' : '🔗 Conectar Binance'}
                </button>

                <button
                  onClick={() => window.open("https://www.binance.com/es-MX/support/faq/detail/538e05e2fd394c489b4cf89e92c55f70", "_blank")}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium"
                >
                  ¿Cómo crear API?
                </button>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                <p>📋 Crea una API Key en Binance con permisos de <strong>solo lectura</strong> para mayor seguridad.</p>
              </div>
            </div>
          )}
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
