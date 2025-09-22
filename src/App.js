import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForms from './components/AuthForms';
import NavigationBar from './components/NavigationBar';
import Dashboard from './components/Dashboard';
import P2PSimulator from './components/P2PSimulator';
import ArbitrageSimulator from './components/ArbitrageSimulator';
import Operations from './components/Operations';
import History from './components/History';
import Profile from './components/Profile';
import { FaSignInAlt, FaUserPlus, FaRocket, FaShield, FaChartLine, FaSync, FaDownload, FaGoogle, FaExchangeAlt, FaLock, FaAward, FaGlobe, FaCheck, FaCrown, FaGem } from 'react-icons/fa';
import './App.css';

const MainApp = () => {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    
    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 4);
    }, 5000);
    
    return () => clearInterval(slideInterval);
  }, []);

  const handleShowAuth = (mode) => {
    setShowAuth(mode);
  };

  const handleCloseAuth = () => {
    setShowAuth(null);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleOperationSaved = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('dashboard');
  };

  const premiumFeatures = [
    {
      icon: <FaShield className="text-3xl text-yellow-400" />,
      title: "Compensación Profesional",
      description: "Evita cierre de cuentas por falta de comprensión. Tus operaciones quedan documentadas profesionalmente.",
      benefits: ["Documentación bancaria", "Compliance automático", "Reportes certificados"]
    },
    {
      icon: <FaGoogle className="text-3xl text-red-400" />,
      title: "Inicio Rápido con Google",
      description: "Acceso instantáneo con tu cuenta de Google en segundos. Sin contraseñas complicadas.",
      benefits: ["Acceso inmediato", "Autenticación segura", "Sincronización instantánea"]
    },
    {
      icon: <FaChartLine className="text-3xl text-green-400" />,
      title: "Simulador Avanzado",
      description: "El simulador más completo del mercado, 100% gratis sin limitaciones. Toma decisiones inteligentes.",
      benefits: ["Análisis en tiempo real", "Múltiples escenarios", "Optimización automática"]
    },
    {
      icon: <FaExchangeAlt className="text-3xl text-blue-400" />,
      title: "Vinculación Exchange",
      description: "Conexión directa con los principales exchanges. Opera con total tranquilidad y seguridad.",
      benefits: ["Sincronización automática", "Multi-exchange", "Seguridad institucional"]
    }
  ];

  const trustIndicators = [
    { icon: "🏆", label: "Plataforma Certificada", value: "Nivel Institucional" },
    { icon: "🔒", label: "Seguridad Bancaria", value: "Encriptación AES-256" },
    { icon: "⚡", label: "Velocidad de Ejecución", value: "< 100ms" },
    { icon: "🌎", label: "Cobertura Global", value: "50+ Países" }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-10% left-10% w-80 h-80 bg-yellow-400/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-60% right-10% w-96 h-96 bg-amber-600/3 rounded-full blur-3xl animate-pulse delay-2000"></div>
          <div className="absolute bottom-10% left-20% w-64 h-64 bg-yellow-600/4 rounded-full blur-3xl animate-pulse delay-4000"></div>
          
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(#e5e5e5 1px, transparent 1px), linear-gradient(90deg, #e5e5e5 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}
          ></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="max-w-6xl mx-auto w-full">
            
            {/* Hero Section */}
            <div className="text-center mb-16 animate-slide-in-up">
              <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-3xl mb-6 shadow-2xl shadow-yellow-500/30">
                <span className="text-5xl">⚡</span>
              </div>
              
              <h1 className="text-7xl lg:text-8xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 bg-clip-text text-transparent mb-4 tracking-tighter">
                JJXCAPITAL<span className="text-white">⚡</span>
              </h1>
              
              <p className="text-2xl lg:text-3xl text-gray-300 font-light mb-8 max-w-4xl mx-auto leading-tight">
                La plataforma <span className="text-yellow-400 font-semibold">definitiva</span> para traders P2P profesionales
              </p>

              <div className="flex flex-wrap justify-center gap-6 mb-12">
                {trustIndicators.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-2xl border border-yellow-500/20">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="text-left">
                      <div className="text-yellow-400 text-sm font-semibold">{item.label}</div>
                      <div className="text-gray-400 text-xs">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
              {premiumFeatures.map((feature, index) => (
                <div 
                  key={index}
                  className="group relative bg-gradient-to-br from-gray-900/80 to-black/80 rounded-3xl p-8 border-2 border-yellow-500/20 hover:border-yellow-400/40 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20"
                >
                  {/* Background Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-amber-600/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-start gap-6 mb-4">
                      <div className="p-4 bg-yellow-400/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
                        <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 mt-6">
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <span key={benefitIndex} className="flex items-center gap-2 px-3 py-2 bg-yellow-400/10 rounded-full text-sm text-yellow-300 border border-yellow-400/30">
                          <FaCheck className="text-xs" />
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Section */}
            <div className="text-center animate-slide-in-up">
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-600/10 rounded-3xl p-8 border-2 border-yellow-500/30 mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Comienza Tu Journey Profesional
                </h2>
                <p className="text-gray-300 text-lg mb-6">
                  Únete a miles de traders que ya están maximizando sus ganancias con herramientas institucionales
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => handleShowAuth('register')}
                    className="group relative bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black font-bold text-lg py-4 px-8 rounded-2xl transition-all duration-300 shadow-2xl shadow-yellow-500/30 hover:shadow-yellow-500/50 transform hover:scale-105"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <FaRocket className="text-xl" />
                      <span>CREAR CUENTA GRATIS</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                  </button>

                  <button 
                    onClick={() => handleShowAuth('login')}
                    className="group bg-transparent hover:bg-white/5 text-white font-semibold text-lg py-4 px-8 rounded-2xl transition-all duration-300 border-2 border-yellow-500/30 hover:border-yellow-500/60 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <FaSignInAlt />
                      <span>ACCESO TRADERS</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Security Badges */}
              <div className="flex justify-center items-center gap-8 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <FaLock className="text-yellow-400" />
                  <span>Encriptación Bancaria</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaAward className="text-yellow-400" />
                  <span>Certificación SSL</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaGem className="text-yellow-400" />
                  <span>Nivel Institucional</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Modal */}
        {showAuth && (
          <AuthForms 
            mode={showAuth} 
            onClose={handleCloseAuth}
            onSwitchMode={(newMode) => setShowAuth(newMode)}
          />
        )}
      </div>
    );
  }

  // Render para usuarios autenticados
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-x-hidden">
      <main className="pb-20">
        {activeTab === 'dashboard' && <Dashboard refreshTrigger={refreshTrigger} onOpenProfile={() => setActiveTab('profile')} />}
        {activeTab === 'p2p' && <P2PSimulator />}
        {activeTab === 'arbitrage' && <ArbitrageSimulator />}
        {activeTab === 'operations' && <Operations onOperationSaved={handleOperationSaved} />}
        {activeTab === 'history' && <History refreshTrigger={refreshTrigger} />}
        {activeTab === 'profile' && <Profile />}
      </main>

      <NavigationBar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />

      {showAuth && (
        <AuthForms 
          mode={showAuth} 
          onClose={handleCloseAuth}
          onSwitchMode={(newMode) => setShowAuth(newMode)}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;