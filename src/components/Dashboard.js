// Dashboard.js - VERSIÓN ACTUALIZADA CON ENDPOINTS PROBABLES
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
  const [originalApiKey, setOriginalApiKey] = useState("");
  const [showKeyForm, setShowKeyForm] = useState(false);

  // ===== CONFIGURACIÓN BACKEND - ENDPOINTS PROBABLES =====
  const BACKEND_URL = "https://backend-jjxcapital-orig.vercel.app";
  
  // ⚠️ ESTOS ENDPOINTS SON UNA ESTIMACIÓN - AJUSTAR SEGÚN TUS ARCHIVOS
  const ENDPOINTS = {
    // Opción más probable basada en nombres de archivos
    VERIFY_KEYS: `${BACKEND_URL}/api/verifyBinanceKeys`,
    SAVE_KEYS: `${BACKEND_URL}/api/saveBinanceKeys`,
    SYNC_P2P: `${BACKEND_URL}/api/syncBinance`,
    CREATE_PAYMENT: `${BACKEND_URL}/api/create-payment`,
    GET_KEYS: `${BACKEND_URL}/api/getBinanceKeys` // Este puede que no exista
  };

  // ===== FUNCIÓN PARA PROBAR ENDPOINTS =====
  const testEndpoints = async () => {
    if (!user) return;
    
    console.log("🔍 Probando endpoints del backend...");
    const endpointsToTest = [
      { name: 'VERIFY_KEYS', url: ENDPOINTS.VERIFY_KEYS },
      { name: 'SAVE_KEYS', url: ENDPOINTS.SAVE_KEYS },
      { name: 'SYNC_P2P', url: ENDPOINTS.SYNC_P2P }
    ];

    for (const endpoint of endpointsToTest) {
      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true, userId: user.uid }),
        });
        console.log(`📡 ${endpoint.name}: ${response.status} - ${response.statusText}`);
      } catch (error) {
        console.error(`❌ ${endpoint.name}: ${error.message}`);
      }
    }
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
          // ... resto del cálculo de métricas
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Error al cargar los datos del dashboard.");
        setLoading(false);
      }
    };

    fetchData();
    testEndpoints(); // Probar endpoints al cargar
  }, [user]);

  // ===== Effect para verificar estado de conexión Binance =====
  useEffect(() => {
    const checkBinanceConnection = async () => {
      if (!user) return;
      try {
        // Intentar obtener claves del backend
        const response = await fetch(`${BACKEND_URL}/api/getBinanceKeys?userId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          if (data.apiKey) {
            setIsConnected(true);
            setOriginalApiKey(data.apiKey);
            setBinanceApiKey("••••••••" + data.apiKey.slice(-4));
            setBinanceApiSecret("••••••••••••••••");
          }
        }
      } catch (err) {
        console.error("Error checking Binance connection:", err);
        // Si no existe GET_KEYS, verificar en Firestore como fallback
        try {
          const kdoc = await getDoc(doc(db, "binanceKeys", user.uid));
          if (kdoc.exists() && kdoc.data().apiKey) {
            setIsConnected(true);
          }
        } catch (firestoreError) {
          console.error("Firestore fallback also failed:", firestoreError);
        }
      } finally {
        setKeysLoaded(true);
      }
    };
    checkBinanceConnection();
  }, [user]);

  // ===== FUNCIONES PRINCIPALES ACTUALIZADAS =====

  const handleConnectBinance = async () => {
    if (!user || !binanceApiKey || !binanceApiSecret) {
      alert("Completa todos los campos requeridos.");
      return;
    }

    setKeysSaving(true);
    try {
      // 1. Verificar claves
      const verifyResponse = await fetch(ENDPOINTS.VERIFY_KEYS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: binanceApiKey.trim(),
          apiSecret: binanceApiSecret.trim(),
        }),
      });

      const verifyData = await verifyResponse.json();
      
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || verifyData.message || "Error verificando claves");
      }

      // 2. Guardar claves
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
      
      if (!saveResponse.ok) {
        throw new Error(saveData.error || saveData.message || "Error guardando claves");
      }

      // 3. Actualizar estado
      setIsConnected(true);
      setOriginalApiKey(binanceApiKey.trim());
      setBinanceApiKey("••••••••" + binanceApiKey.trim().slice(-4));
      setBinanceApiSecret("••••••••••••••••");
      setShowKeyForm(false);
      
      alert("✅ ¡Conexión exitosa!");
      handleSyncBinanceP2P();

    } catch (error) {
      console.error("❌ Error:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setKeysSaving(false);
    }
  };

  const handleSyncBinanceP2P = async () => {
    if (!user || !isConnected) {
      alert("Conecta Binance primero.");
      return;
    }
    
    setSyncing(true);
    try {
      const response = await fetch(ENDPOINTS.SYNC_P2P, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const opsCount = data.operationsSaved || data.count || 0;
        alert(`✅ ${opsCount} operaciones sincronizadas.`);
        window.location.reload();
      } else {
        throw new Error(data.error || data.message || "Error sincronizando");
      }
    } catch (error) {
      console.error("❌ Error sincronizando:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // ... resto de funciones (handleDisconnectBinance, etc.)

  // ===== INTERFAZ ACTUALIZADA =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black text-white">
      {/* Header y contenido existente... */}

      <main className="container mx-auto px-4 py-6">
        {/* Sección Binance P2P */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-yellow-500/30 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-yellow-400 flex items-center gap-2">
            <ArrowsRightLeftIcon className="h-6 w-6" /> Conectar Binance P2P
          </h2>

          {!keysLoaded ? (
            <p className="text-gray-400 text-sm">Cargando...</p>
          ) : isConnected && !showKeyForm ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-900/20 rounded-lg">
                <CheckBadgeIcon className="h-6 w-6 text-green-400" />
                <div>
                  <p className="text-green-400 font-semibold">✅ Binance Conectado</p>
                  <p className="text-gray-400 text-sm">Sincronización segura via backend</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={handleSyncBinanceP2P} disabled={syncing} className="...">
                  <ArrowPathIcon className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                </button>
                
                <div className="flex gap-2">
                  <button onClick={() => setShowKeyForm(true)} className="...">
                    Editar Claves
                  </button>
                  <button onClick={handleDisconnectBinance} className="...">
                    Desconectar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">API Key</label>
                  <input
                    value={binanceApiKey}
                    onChange={(e) => setBinanceApiKey(e.target.value)}
                    placeholder="Tu API Key de Binance"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">API Secret</label>
                  <input
                    type="password"
                    value={binanceApiSecret}
                    onChange={(e) => setBinanceApiSecret(e.target.value)}
                    placeholder="Tu API Secret de Binance"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleConnectBinance} disabled={keysSaving} className="...">
                  {keysSaving ? 'Conectando...' : '🔗 Conectar Binance'}
                </button>
                {isConnected && (
                  <button onClick={() => setShowKeyForm(false)} className="...">
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Resto del contenido... */}
      </main>
    </div>
  );
};

export default Dashboard;