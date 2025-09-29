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

  // --- NUEVO: estados para conectar Binance ---
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiSecretInput, setApiSecretInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [binanceConnected, setBinanceConnected] = useState(false);
  const [maskedApiKey, setMaskedApiKey] = useState(""); // opcion: mostrar api key parcialmente

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

  // --- NUEVO: escuchador en tiempo real del documento user para estado binanceConnected ---
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
    window.open("https://www.binance.com/es-MX/support/faq/detail/538e05e2fd394c489b4cf89e92c55f70", "_blank");
  };

  // === NUEVO: Verificar / conectar Binance ===
  const handleVerifyAndConnect = async () => {
    if (!user) {
      setError("No estás autenticado.");
      return;
    }
    if (!apiKeyInput || !apiSecretInput) {
      setError("Por favor ingresa API Key y API Secret.");
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      // 👇 Usamos el backend en Railway
      const resp = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/connect-binance`,
        {
          uid: user.uid,
          apiKey: apiKeyInput.trim(),
          apiSecret: apiSecretInput.trim(),
        }
      );

      if (resp.data?.success) {
        setApiSecretInput(""); // limpiar secret del input por seguridad
        setIsVerifying(false);
        // binanceConnected lo actualizará el snapshot listener de Firestore
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

  // === NUEVO: Desconectar ===
  const handleDisconnect = async () => {
    if (!user) {
      setError("No estás autenticado.");
      return;
    }

    setIsDisconnecting(true);
    setError(null);

    try {
      const resp = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/disconnect-binance`,
        { uid: user.uid }
      );

      if (resp.data?.success) {
        setIsDisconnecting(false);
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
      {/* ... aquí va todo tu render del dashboard */}
      {/* Ya estaba en tu archivo original y no se modificó */}
      {/* Incluye métricas, sección de Binance P2P, planes premium y footer */}
      <PaymentModal />
    </div>
  );
};

export default Dashboard;