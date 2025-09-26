// Dashboard.js - VERSIÓN FINAL CON ENDPOINTS EXACTOS
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

// Iconos simplificados
const CheckBadgeIcon = ({ className }) => <span className={className}>✅</span>;
const ArrowsRightLeftIcon = ({ className }) => <span className={className}>🔄</span>;
const ArrowPathIcon = ({ className }) => <span className={className}>🔄</span>;
const UserIcon = ({ className }) => <span className={className}>👤</span>;
const ChartBarIcon = ({ className }) => <span className={className}>📊</span>;
const CurrencyDollarIcon = ({ className }) => <span className={className}>💵</span>;
const ArrowTrendingUpIcon = ({ className }) => <span className={className}>📈</span>;
const BoltIcon = ({ className }) => <span className={className}>⚡</span>;
const XMarkIcon = ({ className }) => <span className={className}>❌</span>;

const Dashboard = ({ onOpenProfile }) => {
  const { user } = useAuth();
  const [totalOperations, setTotalOperations] = useState(0);
  const [totalProfitUsdt, setTotalProfitUsdt] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [monthlyPerformance, setMonthlyPerformance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para Binance
  const [binanceApiKey, setBinanceApiKey] = useState("");
  const [binanceApiSecret, setBinanceApiSecret] = useState("");
  const [keysSaving, setKeysSaving] = useState(false);
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);

  // ENDPOINTS EXACTOS según tu configuración
  const BACKEND_URL = "https://backend-jjxcapital-orig.vercel.app";
  const ENDPOINTS = {
    VERIFY_KEYS: `${BACKEND_URL}/api/verify-binance-keys`,
    SAVE_KEYS: `${BACKEND_URL}/api/save-binance-keys`,
    SYNC_P2P: `${BACKEND_URL}/api/sync-binance-p2p`
  };

  // Cargar datos del dashboard
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        setError("Usuario no autenticado.");
        return;
      }

      try {
        const operationsRef = collection(db, "users", user.uid, "operations");
        const q = query(operationsRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        const operations = [];
        let totalBought = 0;
        let totalSold = 0;
        let monthlyBought = 0;
        let monthlySold = 0;
        
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        querySnapshot.forEach((doc) => {
          const op = { id: doc.id, ...doc.data() };
          operations.push(op);
          const amount = parseFloat(op.crypto_amount || 0);
          const opDate = op.timestamp?.toDate ? op.timestamp.toDate() : new Date();

          if (op.operation_type === "Compra") {
            totalBought += amount;
            if (opDate >= last30Days) monthlyBought += amount;
          } else if (op.operation_type === "Venta") {
            totalSold += amount;
            if (opDate >= last30Days) monthlySold += amount;
          }
        });

        setTotalOperations(operations.length);
        setTotalProfitUsdt(totalBought - totalSold);
        setMonthlyPerformance(monthlyBought - monthlySold);
        setSuccessRate(totalBought > totalSold ? 100 : 0);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("Error al cargar el dashboard.");
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Verificar conexión de Binance
  useEffect(() => {
    const checkConnection = async () => {
      if (!user) return;
      try {
        // Verificar en la colección binanceKeys (donde se guarda la máscara)
        const kdoc = await getDoc(doc(db, "binanceKeys", user.uid));
        if (kdoc.exists() && kdoc.data().apiKeyMasked) {
          setIsConnected(true);
          setBinanceApiKey(kdoc.data().apiKeyMasked); // Mostrar máscara
          setBinanceApiSecret("••••••••••••••••");
        }
      } catch (err) {
        console.error("Error al verificar conexión:", err);
      } finally {
        setKeysLoaded(true);
      }
    };
    checkConnection();
  }, [user]);

  // Conectar con Binance
  const handleConnectBinance = async () => {
    if (!user) {
      alert("Debes iniciar sesión primero.");
      return;
    }
    
    if (!binanceApiKey || !binanceApiSecret) {
      alert("Por favor, completa la API Key y API Secret.");
      return;
    }

    setKeysSaving(true);
    try {
      console.log("🔐 Verificando claves con Binance...");

      // 1. Verificar claves (según verifyBinanceKeys.js)
      const verifyResponse = await fetch(ENDPOINTS.VERIFY_KEYS, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
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

      // 2. Guardar claves (según saveBinanceKeys.js)
      console.log("💾 Guardando claves en el backend...");
      const saveResponse = await fetch(ENDPOINTS.SAVE_KEYS, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          userId: user.uid,
          apiKey: binanceApiKey.trim(),
          apiSecret: binanceApiSecret.trim(),
        }),
      });

      const saveData = await saveResponse.json();
      console.log("💾 Respuesta guardado:", saveData);

      if (!saveResponse.ok || !saveData.ok) {
        throw new Error(saveData.error || "Error guardando las claves");
      }

      // 3. Actualizar estado local
      setIsConnected(true);
      // Mostrar máscara como lo hace el backend
      setBinanceApiKey(`${binanceApiKey.trim().slice(0,6)}...${binanceApiKey.trim().slice(-6)}`);
      setBinanceApiSecret("••••••••••••••••");
      setShowKeyForm(false);
      
      alert("✅ ¡Conexión exitosa con Binance! Claves guardadas de forma segura.");
      
      // 4. Sincronizar automáticamente
      handleSyncBinanceP2P();

    } catch (error) {
      console.error("❌ Error conectando con Binance:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setKeysSaving(false);
    }
  };

  // Sincronizar P2P (según syncBinance.js)
  const handleSyncBinanceP2P = async () => {
    if (!user) {
      alert("Debes iniciar sesión primero.");
      return;
    }
    
    if (!isConnected) {
      alert("Primero debes conectar tu cuenta de Binance.");
      return;
    }
    
    setSyncing(true);
    try {
      console.log("🔄 Sincronizando operaciones P2P...");

      const response = await fetch(ENDPOINTS.SYNC_P2P, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          userId: user.uid 
        }),
      });

      const data = await response.json();
      console.log("📊 Respuesta sincronización:", data);

      if (response.ok && data.ok) {
        const opsCount = data.operationsSaved || 0;
        alert(`✅ Sincronización completada. ${opsCount} operaciones P2P sincronizadas.`);
        window.location.reload();
      } else {
        throw new Error(data.error || data.details || "Error sincronizando");
      }
    } catch (error) {
      console.error("❌ Error sincronizando:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Desconectar Binance
  const handleDisconnectBinance = async () => {
    if (!user) return;

    if (confirm("¿Estás seguro de que quieres desconectar Binance?")) {
      try {
        // Limpiar en el backend enviando valores null
        await fetch(ENDPOINTS.SAVE_KEYS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            apiKey: null,
            apiSecret: null,
          }),
        });

        // Limpiar estado local
        setIsConnected(false);
        setBinanceApiKey("");
        setBinanceApiSecret("");
        setShowKeyForm(false);
        
        alert("✅ Binance desconectado correctamente.");
      } catch (err) {
        console.error("❌ Error desconectando:", err);
        alert("❌ Error al desconectar Binance.");
      }
    }
  };

  // Mostrar/ocultar formulario
  const handleShowKeyForm = () => {
    setShowKeyForm(true);
    setBinanceApiKey(""); // Limpiar para nueva entrada
    setBinanceApiSecret("");
  };

  const handleCancelKeyForm = () => {
    setShowKeyForm(false);
    if (isConnected) {
      // Restaurar máscara
      const kdoc = getDoc(doc(db, "binanceKeys", user.uid));
      if (kdoc.exists()) {
        setBinanceApiKey(kdoc.data().apiKeyMasked);
      }
      setBinanceApiSecret("••••••••••••••••");
    } else {
      setBinanceApiKey("");
      setBinanceApiSecret("");
    }
  };

  // Formatear números
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Cargando dashboard premium...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center">
        <div className="text-center p-8 bg-gray-900/70 rounded-2xl border border-purple-500/30">
          <div className="text-red-400 text-xl font-semibold mb-2">Error</div>
          <p className="text-gray-300 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black text-white">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg mr-3">
              <BoltIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              JJXCAPITAL⚡
            </div>
          </div>
          
          <button
            onClick={onOpenProfile}
            className="w-10 h-10 rounded-full border-2 border-purple-500/50 overflow-hidden"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-purple-400" />
              </div>
            )}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Encabezado */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Bienvenido, <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {user?.displayName || user?.email?.split('@')[0] || 'Inversor'}
            </span>
          </h2>
          <p className="text-gray-400">Tu dashboard premium de JJXCAPITAL⚡</p>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Total Operaciones</h3>
              <ChartBarIcon className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-2xl md:text-3xl font-bold mb-1">{totalOperations}</p>
            <p className="text-sm text-gray-500">Operaciones realizadas</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Ganancia USDT</h3>
              <CurrencyDollarIcon className="h-5 w-5 text-green-400" />
            </div>
            <p className="text-2xl md:text-3xl font-bold mb-1">${formatNumber(totalProfitUsdt)}</p>
            <p className="text-sm text-gray-500">Balance total en USDT</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Tasa de Éxito</h3>
              <CheckBadgeIcon className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-2xl md:text-3xl font-bold mb-1">{successRate}%</p>
            <p className="text-sm text-gray-500">Operaciones exitosas</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 font-medium">Rendimiento Mensual</h3>
              <ArrowTrendingUpIcon className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-2xl md:text-3xl font-bold mb-1">${formatNumber(monthlyPerformance)}</p>
            <p className="text-sm text-gray-500">Últimos 30 días</p>
          </div>
        </div>

        {/* SECCIÓN BINANCE P2P - COMPLETAMENTE FUNCIONAL */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-yellow-500/30 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-yellow-400 flex items-center gap-2">
            <ArrowsRightLeftIcon className="h-6 w-6" /> Conectar Binance P2P
          </h2>

          {!keysLoaded ? (
            <p className="text-gray-400 text-sm">Cargando configuración Binance...</p>
          ) : isConnected && !showKeyForm ? (
            // ESTADO: CONECTADO
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

                <div className="flex gap-2">
                  <button
                    onClick={handleShowKeyForm}
                    className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded text-white font-medium"
                  >
                    Editar Claves
                  </button>
                  
                  <button
                    onClick={handleDisconnectBinance}
                    className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 rounded text-white font-medium"
                  >
                    Desconectar
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                <p>💡 La sincronización se realiza de forma segura a través del backend</p>
                <p>🔒 Las API Keys se almacenan de forma segura en el backend</p>
              </div>
            </div>
          ) : (
            // ESTADO: NO CONECTADO o EDITANDO
            <div className="space-y-4">
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400 text-sm font-medium">🔒 Conexión Segura</p>
                <p className="text-gray-300 text-sm mt-1">
                  Tus claves de Binance se almacenan de forma segura en el backend con encriptación AES-256-GCM.
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

                {isConnected && (
                  <button
                    onClick={handleCancelKeyForm}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium"
                  >
                    Cancelar
                  </button>
                )}

                <button
                  onClick={() => window.open("https://www.binance.com/es-MX/support/faq/detail/538e05e2fd394c489b4cf89e92c55f70", "_blank")}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium"
                >
                  ¿Cómo crear API?
                </button>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                <p>📋 Crea una API Key en Binance con permisos de <strong>solo lectura</strong> para mayor seguridad.</p>
                <p>🔐 Las claves se encriptan con AES-256-GCM en el backend</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm pb-6">
          <div className="flex justify-center items-center mb-2">
            <div className="text-lg font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              JJXCAPITAL⚡
            </div>
          </div>
          <p>© {new Date().getFullYear()} JJXCAPITAL⚡ • Plataforma premium de trading</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;