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
import { FaSignInAlt, FaUserPlus, FaRocket, FaChartLine, FaSync, FaDownload, FaGoogle, FaExchangeAlt, FaLock, FaAward, FaCheck, FaCrown, FaFileExcel, FaFilePdf, FaCalculator, FaMoneyBillWave } from 'react-icons/fa';
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
      icon: <FaMoneyBillWave className="text-4xl" />,
      title: "Registro de Operaciones P2P",
      description: "Registra tus movimientos de arbitraje en un solo paso. Calcula comisiones, ajusta saldos y organiza automáticamente los datos.",
      benefits: ["Registro automático", "Cálculo de comisiones", "Ajuste de saldos", "Organización inteligente"],
      gradient: "from-purple-600 to-blue-600",
      stats: ["1", "Click", "Registro"]
    },
    {
      icon: <FaCalculator className="text-4xl" />,
      title: "Simulación de Arbitraje",
      description: "Calcula ganancias/pérdidas en tiempo real con nuestra tecnología avanzada de simulación P2P.",
      benefits: ["Cálculo en tiempo real", "Múltiples escenarios", "Optimización automática", "Análisis predictivo"],
      gradient: "from-blue-600 to-cyan-600",
      stats: ["99.9%", "Precisión", "Garantizada"]
    },
    {
      icon: <FaFileExcel className="text-4xl" />,
      title: "Exportación Profesional",
      description: "Cuando necesites certificar, descarga todo en Excel + PDF con tus comprobantes adjuntos.",
      benefits: ["Formato Excel", "PDF profesional", "Comprobantes adjuntos", "Backup automático"],
      gradient: "from-cyan-600 to-purple-600",
      stats: ["2", "Formatos", "Exportación"]
    },
    {
      icon: <FaChartLine className="text-4xl" />,
      title: "Gestión para Contadores",
      description: "No es necesario estudiar Excel complejos. Formatos estandarizados para cada cliente.",
      benefits: ["Formatos estandarizados", "Reportes automáticos", "Compliance integrado", "Auditoría facilitada"],
      gradient: "from-purple-600 to-pink-600",
      stats: ["100%", "Compatible", "Contadores"]
    }
  ];

  const problemSolutions = [
    {
      target: "El Arbitrador",
      problem: "Ya tiene muchos temas en cuenta a la hora de arbitrar",
      solution: "Nosotros le resolvemos la gestión y organización al 90%",
      icon: "🎯"
    },
    {
      target: "El Contador", 
      problem: "No necesita estudiar Excel complejos para verificar",
      solution: "Formatos estandarizados automáticos para cada cliente",
      icon: "👔"
    },
    {
      target: "El Banco",
      problem: "Comprende a su cliente y evita cerrarle la cuenta",
      solution: "Documentación profesional que evita malentendidos",
      icon: "🏦"
    }
  ];

  const trustIndicators = [
    { icon: "⚡", label: "Registro Instantáneo", value: "Operaciones P2P" },
    { icon: "📊", label: "Cálculo Automático", value: "Comisiones y Saldos" },
    { icon: "🔒", label: "Documentación Segura", value: "Para Bancos y AFIP" },
    { icon: "🚀", label: "Exportación Rápida", value: "Excel + PDF" }
  ];

  const eliteStats = [
    { value: "15,000+", label: "Operaciones Registradas", sublabel: "Mensualmente" },
    { value: "$3.5B+", label: "Volumen Arbitraje", sublabel: "Procesado" },
    { value: "99.9%", label: "Precisión Cálculos", sublabel: "Comisiones y Ganancia" },
    { value: "24/7", label: "Soporte Especializado", sublabel: "Para Traders P2P" }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black relative overflow-hidden">
        {/* Premium Header with Auth Buttons - MEJORADO */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-black/90 backdrop-blur-2xl border-b border-purple-500/30 py-3' : 'bg-gradient-to-r from-purple-900/80 to-blue-900/80 backdrop-blur-lg py-5'
        }`}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/40">
                  <span className="text-3xl">⚡</span>
                </div>
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    JJXCAPITAL
                  </h1>
                  <p className="text-sm text-gray-300 font-medium">PLATAFORMA P2P PROFESIONAL</p>
                </div>
              </div>

              {/* Auth Buttons - Top Right - MÁS VISIBLES */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleShowAuth('login')}
                  className="group px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all duration-300 border-2 border-white/30 hover:border-white/50 backdrop-blur-lg flex items-center gap-3 hover:scale-105 shadow-lg"
                >
                  <FaSignInAlt className="text-lg" />
                  <span className="font-semibold">INICIAR SESIÓN</span>
                </button>

                <button 
                  onClick={() => handleShowAuth('register')}
                  className="group relative bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-black py-3 px-8 rounded-2xl transition-all duration-300 shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 transform hover:scale-110 flex items-center gap-3 border-2 border-white/20"
                >
                  <FaUserPlus className="text-lg" />
                  <span className="font-bold">REGISTRATE GRATIS</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Enhanced Background Effects */}
        <div className="absolute inset-0">
          {/* Animated Gradients */}
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-blue-900/30 to-transparent"></div>
          
          {/* Floating Orbs */}
          <div className="absolute top-20 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
          <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse delay-4000"></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.1)_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center pt-28 pb-20 px-4">
          <div className="max-w-7xl mx-auto w-full">
            
            {/* Hero Section - ENFOCADO EN P2P */}
            <div className="text-center mb-20">
              {/* Main Logo */}
              <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 rounded-3xl mb-8 shadow-2xl shadow-purple-500/40 animate-pulse-glow">
                <span className="text-6xl">⚡</span>
              </div>
              
              {/* Main Title */}
              <h1 className="text-7xl lg:text-8xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4 tracking-tighter leading-none">
                JJXCAPITAL
              </h1>
              
              <h2 className="text-4xl lg:text-5xl text-white font-light mb-6 max-w-4xl mx-auto leading-tight">
                Plataforma <span className="text-purple-400 font-bold">Elite</span> para{' '}
                <span className="text-blue-400 font-bold">Registro de Arbitraje P2P</span>
              </h2>
              
              {/* Subtitle */}
              <p className="text-2xl lg:text-3xl text-gray-300 font-light mb-12 max-w-5xl mx-auto leading-relaxed">
                Registra, organiza y exporta tus operaciones de arbitraje P2P con{' '}
                <span className="text-cyan-400 font-semibold">tecnología profesional</span>. 
                Calcula comisiones, ajusta saldos y genera reportes automáticos.
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-6 mb-16">
                {trustIndicators.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 bg-black/40 px-6 py-4 rounded-2xl border border-purple-500/30 backdrop-blur-sm transform hover:scale-105 transition-all duration-300 group">
                    <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                    <div className="text-left">
                      <div className="text-purple-400 text-lg font-bold">{item.label}</div>
                      <div className="text-gray-400 text-sm">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Problem Solutions Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
              {problemSolutions.map((solution, index) => (
                <div key={index} className="bg-gradient-to-br from-gray-900/50 to-black/50 rounded-3xl p-8 border border-purple-500/20 backdrop-blur-sm transform hover:scale-105 transition-all duration-500 group">
                  <div className="text-4xl mb-4">{solution.icon}</div>
                  <h3 className="text-2xl font-bold text-white mb-4">{solution.target}</h3>
                  <p className="text-gray-400 mb-3">
                    <span className="text-red-400 font-semibold">Problema:</span> {solution.problem}
                  </p>
                  <p className="text-green-400 font-semibold">
                    <span className="text-purple-400">Solución:</span> {solution.solution}
                  </p>
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

            {/* Premium Features Grid - ENFOCADO EN REGISTRO P2P */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-20">
              {premiumFeatures.map((feature, index) => (
                <div 
                  key={index}
                  className="group relative bg-gradient-to-br from-gray-900/80 to-black/80 rounded-3xl p-8 border-2 border-purple-500/20 hover:border-purple-400/40 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 backdrop-blur-sm"
                >
                  {/* Animated Gradient Border */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  
                  {/* Stats Badge */}
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl px-3 py-1 text-white font-bold text-xs shadow-2xl">
                    {feature.stats[0]} {feature.stats[1]}
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start gap-6 mb-6">
                      <div className="p-3 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-white mb-3">{feature.title}</h3>
                        <p className="text-gray-300 text-lg leading-relaxed mb-4">{feature.description}</p>
                      </div>
                    </div>
                    
                    {/* Benefits */}
                    <div className="grid grid-cols-2 gap-2">
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <span key={benefitIndex} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-lg text-sm text-purple-300 border border-purple-400/20">
                          <FaCheck className="text-purple-400 text-xs" />
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ultimate CTA Section */}
            <div className="text-center relative">
              <div className="bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10 rounded-3xl p-12 border-2 border-purple-500/30 backdrop-blur-sm mb-10">
                <h2 className="text-4xl font-black text-white mb-6">
                  <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Comienza a Registrar Tus Operaciones P2P
                  </span>
                </h2>
                <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                  Únete a miles de traders que ya están optimizando su arbitraje P2P con nuestra plataforma profesional
                </p>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <button 
                    onClick={() => handleShowAuth('register')}
                    className="group relative bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-lg py-5 px-12 rounded-2xl transition-all duration-300 shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 transform hover:scale-105"
                  >
                    <div className="flex items-center justify-center gap-4">
                      <FaRocket className="text-xl animate-bounce" />
                      <span>REGISTRARME GRATIS</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                  </button>

                  <button 
                    onClick={() => handleShowAuth('login')}
                    className="group bg-transparent hover:bg-white/10 text-white font-semibold text-lg py-5 px-12 rounded-2xl transition-all duration-300 border-2 border-purple-500/40 hover:border-purple-500/60 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-center gap-4">
                      <FaChartLine className="text-xl" />
                      <span>VER DEMO</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Security Badges */}
              <div className="flex flex-wrap justify-center items-center gap-6 text-base text-gray-400">
                <div className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-2xl border border-purple-500/20">
                  <FaLock className="text-purple-400 text-xl" />
                  <span>Registro Seguro P2P</span>
                </div>
                <div className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-2xl border border-blue-500/20">
                  <FaAward className="text-blue-400 text-xl" />
                  <span>Compliance Automático</span>
                </div>
                <div className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-2xl border border-cyan-500/20">
                  <FaCrown className="text-cyan-400 text-xl" />
                  <span>Exportación Profesional</span>
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