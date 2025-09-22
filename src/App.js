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
import { FaSignInAlt, FaUserPlus, FaRocket, FaChartLine, FaSync, FaDownload, FaGoogle, FaExchangeAlt, FaLock, FaAward, FaCheck, FaCrown, FaFileExcel, FaFilePdf, FaCalculator, FaMoneyBillWave, FaArrowRight } from 'react-icons/fa';
import './App.css';

const MainApp = () => {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
      icon: <FaMoneyBillWave className="text-5xl" />,
      title: "Registro Instantáneo P2P",
      description: "Registra tus operaciones de arbitraje en segundos. Cálculo automático de comisiones y ganancias.",
      benefits: ["1-click registration", "Auto-cálculo comisiones", "Saldos en tiempo real", "Historial automático"],
      gradient: "from-purple-600 to-blue-600",
      stats: ["<30s", "por operación", ""]
    },
    {
      icon: <FaCalculator className="text-5xl" />,
      title: "Simulador de Arbitraje",
      description: "Calcula ganancias potenciales antes de operar. Múltiples escenarios y optimización inteligente.",
      benefits: ["Análisis pre-operación", "Múltiples escenarios", "Optimización AI", "Alertas rentabilidad"],
      gradient: "from-blue-600 to-cyan-600",
      stats: ["99.9%", "precisión", ""]
    },
    {
      icon: <FaFileExcel className="text-5xl" />,
      title: "Reportes Profesionales",
      description: "Exporta a Excel y PDF con todos tus comprobantes. Perfecto para contadores y bancos.",
      benefits: ["Excel automático", "PDF profesional", "Comprobantes incluidos", "Formatos AFIP"],
      gradient: "from-cyan-600 to-purple-600",
      stats: ["2", "formatos", ""]
    },
    {
      icon: <FaChartLine className="text-5xl" />,
      title: "Dashboard Avanzado",
      description: "Métricas en tiempo real, gráficos interactivos y análisis de performance completo.",
      benefits: ["Métricas tiempo real", "Gráficos interactivos", "Análisis performance", "Trend analysis"],
      gradient: "from-purple-600 to-pink-600",
      stats: ["24/7", "monitoreo", ""]
    }
  ];

  const problemSolutions = [
    {
      target: "PARA EL ARBITRADOR",
      problem: "Ya tienes muchos temas en cuenta al arbitrar",
      solution: "Te resolvemos la gestión y organización al 90%",
      icon: "🎯",
      color: "from-purple-600 to-blue-600"
    },
    {
      target: "PARA EL CONTADOR", 
      problem: "No necesita estudiar Excel complejos",
      solution: "Formatos estandarizados automáticos para cada cliente",
      icon: "👔",
      color: "from-blue-600 to-cyan-600"
    },
    {
      target: "PARA EL BANCO",
      problem: "Comprende a su cliente y evita cerrarle la cuenta",
      solution: "Documentación profesional que evita malentendidos",
      icon: "🏦",
      color: "from-cyan-600 to-purple-600"
    }
  ];

  const eliteStats = [
    { value: "15,847", label: "Operaciones Registradas", sublabel: "Este mes" },
    { value: "$3.2B", label: "Volumen Procesado", sublabel: "En arbitraje P2P" },
    { value: "99.7%", label: "Precisión", sublabel: "En cálculos automáticos" },
    { value: "2,584", label: "Traders Activos", sublabel: "Usando la plataforma" }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black relative overflow-hidden">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-blue-900/40 to-transparent"></div>
          
          {/* Floating Orbs */}
          <div className="absolute top-20 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
          <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse delay-4000"></div>
          
          {/* Animated Grid */}
          <div className="absolute inset-0 opacity-[0.02]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.1)_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
          </div>

          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${20 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>

        {/* Premium Header */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-black/90 backdrop-blur-2xl border-b border-purple-500/30 py-3' : 'bg-transparent py-6'
        }`}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/40">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    JJXCAPITAL
                  </h1>
                  <p className="text-xs text-gray-400">ELITE TRADING PLATFORM</p>
                </div>
              </div>

              {/* Demo Button */}
              <button className="group px-6 py-2 bg-transparent hover:bg-purple-600/10 text-purple-400 font-semibold rounded-xl transition-all duration-300 border border-purple-500/30 hover:border-purple-400/60 backdrop-blur-sm flex items-center gap-2">
                <FaChartLine className="text-sm" />
                <span>VER DEMO</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center pt-24 pb-20 px-4">
          <div className="max-w-7xl mx-auto w-full">
            
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 rounded-3xl mb-8 shadow-2xl shadow-purple-500/40 animate-pulse-glow">
                <span className="text-6xl">⚡</span>
              </div>
              
              <h1 className="text-7xl lg:text-8xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4 tracking-tighter leading-none">
                JJXCAPITAL
              </h1>
              
              <h2 className="text-4xl lg:text-5xl text-white font-light mb-6 max-w-4xl mx-auto leading-tight">
                Plataforma <span className="text-purple-400 font-bold">Premium</span> para{' '}
                <span className="text-blue-400 font-bold">Registro de Arbitraje P2P</span>
              </h2>
              
              <p className="text-2xl lg:text-3xl text-gray-300 font-light mb-12 max-w-5xl mx-auto leading-relaxed">
                La solución <span className="text-cyan-400 font-semibold">definitiva</span> para traders profesionales. 
                Registra, calcula y exporta tus operaciones con <span className="text-purple-400 font-semibold">tecnología de élite</span>.
              </p>
            </div>

            {/* Auth Buttons Section - POSICIONADO ARRIBA DE LAS TARJETAS */}
            <div className="text-center mb-16">
              <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl p-8 border-2 border-purple-500/30 backdrop-blur-sm mb-8">
                <h3 className="text-3xl font-bold text-white mb-6">
                  Comienza Tu <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Journey Profesional</span>
                </h3>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-4">
                  <button 
                    onClick={() => handleShowAuth('register')}
                    className="group relative bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-lg py-5 px-12 rounded-2xl transition-all duration-300 shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 transform hover:scale-105 flex items-center gap-4"
                  >
                    <FaRocket className="text-xl animate-bounce" />
                    <span>REGISTRATE GRATIS</span>
                    <FaArrowRight className="text-lg group-hover:translate-x-1 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                  </button>

                  <button 
                    onClick={() => handleShowAuth('login')}
                    className="group bg-transparent hover:bg-white/10 text-white font-semibold text-lg py-5 px-12 rounded-2xl transition-all duration-300 border-2 border-purple-500/40 hover:border-purple-500/60 backdrop-blur-sm flex items-center gap-4"
                  >
                    <FaSignInAlt className="text-xl" />
                    <span>INICIAR SESIÓN</span>
                  </button>
                </div>
                
                <p className="text-gray-400 text-sm">
                  ✅ <span className="text-green-400">Comienza en 30 segundos</span> • Sin tarjetas de crédito • Acceso inmediato
                </p>
              </div>
            </div>

            {/* Problem Solutions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
              {problemSolutions.map((solution, index) => (
                <div key={index} className={`bg-gradient-to-br ${solution.color} rounded-3xl p-8 border-2 border-white/10 backdrop-blur-sm transform hover:scale-105 transition-all duration-500 group relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className="text-5xl mb-4">{solution.icon}</div>
                    <h3 className="text-2xl font-bold text-white mb-4">{solution.target}</h3>
                    <p className="text-gray-200 mb-3 text-lg">
                      {solution.problem}
                    </p>
                    <p className="text-white font-semibold text-lg bg-black/30 px-3 py-2 rounded-lg">
                      {solution.solution}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Premium Features Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-16">
              {premiumFeatures.map((feature, index) => (
                <div 
                  key={index}
                  className="group relative bg-gradient-to-br from-gray-900/80 to-black/80 rounded-3xl p-8 border-2 border-purple-500/20 hover:border-purple-400/40 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 backdrop-blur-sm"
                >
                  {/* Animated Gradient Border */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  
                  {/* Stats Badge */}
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl px-4 py-2 text-white font-bold text-sm shadow-2xl">
                    {feature.stats[0]} {feature.stats[1]}
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start gap-6 mb-6">
                      <div className="p-4 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-white mb-3">{feature.title}</h3>
                        <p className="text-gray-300 text-lg leading-relaxed mb-4">{feature.description}</p>
                      </div>
                    </div>
                    
                    {/* Benefits */}
                    <div className="grid grid-cols-2 gap-3">
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <span key={benefitIndex} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-xl text-sm text-purple-300 border border-purple-400/20">
                          <FaCheck className="text-purple-400 text-xs" />
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Elite Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {eliteStats.map((stat, index) => (
                <div key={index} className="text-center bg-gradient-to-br from-gray-900/50 to-black/50 rounded-3xl p-6 border border-purple-500/20 backdrop-blur-sm transform hover:scale-105 transition-all duration-500 group">
                  <div className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-lg font-bold text-white mb-1">{stat.label}</div>
                  <div className="text-sm text-gray-400">{stat.sublabel}</div>
                </div>
              ))}
            </div>

            {/* Final CTA */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10 rounded-3xl p-12 border-2 border-purple-500/30 backdrop-blur-sm">
                <h2 className="text-4xl font-black text-white mb-6">
                  ¿Listo para <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Optimizar tu Arbitraje P2P</span>?
                </h2>
                <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                  Únete a la plataforma preferida por traders profesionales. Tecnología enterprise a tu alcance.
                </p>
                
                <button 
                  onClick={() => handleShowAuth('register')}
                  className="group relative bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-lg py-5 px-16 rounded-2xl transition-all duration-300 shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 transform hover:scale-105 mx-auto"
                >
                  <div className="flex items-center justify-center gap-4">
                    <FaRocket className="text-xl" />
                    <span>COMENZAR GRATIS</span>
                  </div>
                </button>
              </div>

              {/* Security Badges */}
              <div className="flex flex-wrap justify-center items-center gap-6 text-base text-gray-400 mt-12">
                <div className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-2xl border border-purple-500/20">
                  <FaLock className="text-purple-400 text-xl" />
                  <span>Seguridad Bancaria</span>
                </div>
                <div className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-2xl border border-blue-500/20">
                  <FaAward className="text-blue-400 text-xl" />
                  <span>Certificación SSL</span>
                </div>
                <div className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-2xl border border-cyan-500/20">
                  <FaCrown className="text-cyan-400 text-xl" />
                  <span>Soporte 24/7</span>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black text-white overflow-x-hidden">
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