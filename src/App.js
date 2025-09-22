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
import { FaSignInAlt, FaUserPlus, FaRocket, FaChartLine, FaSync, FaDownload, FaGoogle, FaExchangeAlt, FaLock, FaAward, FaCheck, FaCrown, FaStar, FaGem, FaShield } from 'react-icons/fa';
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
      icon: <FaShield className="text-4xl" />,
      title: "Compensación Profesional",
      description: "Evita cierre de cuentas por falta de comprensión. Tus operaciones quedan documentadas profesionalmente con estándares bancarios.",
      benefits: ["Documentación certificada", "Compliance automático", "Reportes auditables", "Backup en la nube"],
      gradient: "from-purple-600 to-blue-600",
      stats: ["100%", "Compatible", "Bancos"]
    },
    {
      icon: <FaGoogle className="text-4xl" />,
      title: "Inicio Rápido con Google",
      description: "Acceso instantáneo con autenticación enterprise. Máxima seguridad sin complicaciones.",
      benefits: ["Acceso inmediato", "2FA integrado", "Sincronización cloud", "Recuperación fácil"],
      gradient: "from-blue-600 to-cyan-600",
      stats: ["<3s", "Login", "Instantáneo"]
    },
    {
      icon: <FaChartLine className="text-4xl" />,
      title: "Simulador Avanzado",
      description: "Tecnología institucional para análisis predictivo. Toma decisiones basadas en datos en tiempo real.",
      benefits: ["AI integrada", "Múltiples escenarios", "Optimización automática", "Alertas inteligentes"],
      gradient: "from-cyan-600 to-purple-600",
      stats: ["99.9%", "Precisión", "Garantizada"]
    },
    {
      icon: <FaExchangeAlt className="text-4xl" />,
      title: "Vinculación Exchange",
      description: "Conexión enterprise con los principales exchanges. API seguras y monitorización 24/7.",
      benefits: ["Multi-exchange", "API seguras", "Monitorización", "Backup automático"],
      gradient: "from-purple-600 to-pink-600",
      stats: ["10+", "Exchanges", "Soportados"]
    }
  ];

  const trustIndicators = [
    { icon: "🏆", label: "Plataforma Certificada", value: "Nivel Enterprise" },
    { icon: "🔒", label: "Seguridad Bancaria", value: "AES-256 + 2FA" },
    { icon: "⚡", label: "Velocidad de Ejecución", value: "< 10ms Latencia" },
    { icon: "🌎", label: "Cobertura Global", value: "150+ Países" }
  ];

  const eliteStats = [
    { value: "25,000+", label: "Traders Elite", sublabel: "Comunidad certificada" },
    { value: "$5.2B+", label: "Volumen Mensual", sublabel: "Transacciones procesadas" },
    { value: "99.99%", label: "Uptime Garantizado", sublabel: "Disponibilidad enterprise" },
    { value: "24/7", label: "Soporte Priority", sublabel: "Asistencia inmediata" }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black relative overflow-hidden">
        {/* Premium Header with Auth Buttons */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-2xl border-b border-purple-500/30 py-4' : 'bg-transparent py-6'}`}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    JJXCAPITAL
                  </h1>
                  <p className="text-xs text-gray-400">ELITE TRADING PLATFORM</p>
                </div>
              </div>

              {/* Auth Buttons - Top Right */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleShowAuth('login')}
                  className="group px-8 py-3 bg-transparent hover:bg-purple-600/10 text-purple-400 font-semibold rounded-2xl transition-all duration-300 border-2 border-purple-500/30 hover:border-purple-400/60 backdrop-blur-sm flex items-center gap-3"
                >
                  <FaSignInAlt className="text-lg" />
                  <span>INICIAR SESIÓN</span>
                </button>

                <button 
                  onClick={() => handleShowAuth('register')}
                  className="group relative bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transform hover:scale-105 flex items-center gap-3"
                >
                  <FaUserPlus className="text-lg" />
                  <span>REGISTRATE GRATIS</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Enhanced Background Effects */}
        <div className="absolute inset-0">
          {/* Animated Gradients */}
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/20 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-96 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
          
          {/* Floating Orbs */}
          <div className="absolute top-20 left-10 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
          <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl animate-pulse delay-4000"></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.02]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.1)_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
          </div>

          {/* Animated Particles */}
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 15}s`,
                animationDuration: `${25 + Math.random() * 20}s`
              }}
            />
          ))}
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center pt-32 pb-20 px-4">
          <div className="max-w-7xl mx-auto w-full">
            
            {/* Hero Section - Ultra Premium */}
            <div className="text-center mb-24">
              {/* Main Logo */}
              <div className="inline-flex items-center justify-center w-40 h-40 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 rounded-3xl mb-8 shadow-2xl shadow-purple-500/40 animate-pulse-glow">
                <span className="text-7xl">⚡</span>
              </div>
              
              {/* Main Title */}
              <h1 className="text-8xl lg:text-9xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6 tracking-tighter leading-none">
                JJXCAPITAL
                <span className="text-4xl lg:text-5xl block mt-6 text-gray-300 font-light">
                  PLATAFORMA <span className="text-purple-400 font-bold">ELITE</span> PARA TRADING <span className="text-blue-400 font-bold">INSTITUCIONAL</span>
                </span>
              </h1>
              
              {/* Subtitle */}
              <p className="text-2xl lg:text-3xl text-gray-300 font-light mb-12 max-w-5xl mx-auto leading-relaxed">
                La solución <span className="text-cyan-400 font-semibold">definitiva</span> para traders profesionales que exigen 
                <span className="text-purple-400 font-semibold"> máxima seguridad</span>, 
                <span className="text-blue-400 font-semibold"> velocidad institucional</span> y 
                <span className="text-cyan-400 font-semibold"> herramientas enterprise</span>
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-8 mb-16">
                {trustIndicators.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 bg-black/40 px-8 py-4 rounded-2xl border border-purple-500/30 backdrop-blur-sm transform hover:scale-105 transition-all duration-300 group">
                    <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                    <div className="text-left">
                      <div className="text-purple-400 text-xl font-bold">{item.label}</div>
                      <div className="text-gray-400 text-sm">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Elite Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
              {eliteStats.map((stat, index) => (
                <div key={index} className="text-center bg-gradient-to-br from-gray-900/50 to-black/50 rounded-3xl p-8 border border-purple-500/20 backdrop-blur-sm transform hover:scale-105 transition-all duration-500 group">
                  <div className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-xl font-bold text-white mb-1">{stat.label}</div>
                  <div className="text-sm text-gray-400">{stat.sublabel}</div>
                </div>
              ))}
            </div>

            {/* Premium Features Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mb-24">
              {premiumFeatures.map((feature, index) => (
                <div 
                  key={index}
                  className="group relative bg-gradient-to-br from-gray-900/80 to-black/80 rounded-3xl p-10 border-2 border-purple-500/20 hover:border-purple-400/40 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 backdrop-blur-sm"
                >
                  {/* Animated Gradient Border */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
                  
                  {/* Stats Badge */}
                  <div className="absolute -top-4 -right-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl px-4 py-2 text-white font-bold text-sm shadow-2xl">
                    {feature.stats[0]} {feature.stats[1]}
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start gap-6 mb-6">
                      <div className="p-4 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-3xl font-black text-white mb-3">{feature.title}</h3>
                        <p className="text-gray-300 text-lg leading-relaxed mb-4">{feature.description}</p>
                      </div>
                    </div>
                    
                    {/* Benefits */}
                    <div className="grid grid-cols-2 gap-3">
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <span key={benefitIndex} className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-xl text-sm text-purple-300 border border-purple-400/20">
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
              {/* Background Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-blue-600/5 to-cyan-600/5 rounded-3xl blur-xl"></div>
              
              <div className="relative bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10 rounded-3xl p-16 border-2 border-purple-500/30 backdrop-blur-sm mb-10">
                <h2 className="text-5xl font-black text-white mb-6">
                  <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    COMENZA HOY TU VIAJE ELITE
                  </span>
                </h2>
                <p className="text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                  Únete a la plataforma preferida por traders institucionales. Tecnología enterprise a tu alcance.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <button 
                    onClick={() => handleShowAuth('register')}
                    className="group relative bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-xl py-6 px-16 rounded-2xl transition-all duration-300 shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 transform hover:scale-105"
                  >
                    <div className="flex items-center justify-center gap-4">
                      <FaRocket className="text-2xl animate-bounce" />
                      <span>ACCESO ELITE GRATUITO</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                  </button>
                </div>
              </div>

              {/* Security Badges */}
              <div className="flex flex-wrap justify-center items-center gap-8 text-lg text-gray-400 mt-12">
                <div className="flex items-center gap-3 bg-black/40 px-6 py-4 rounded-2xl border border-purple-500/20">
                  <FaLock className="text-purple-400 text-2xl" />
                  <span>Encriptación AES-256 Bancaria</span>
                </div>
                <div className="flex items-center gap-3 bg-black/40 px-6 py-4 rounded-2xl border border-blue-500/20">
                  <FaAward className="text-blue-400 text-2xl" />
                  <span>Certificación Enterprise SSL</span>
                </div>
                <div className="flex items-center gap-3 bg-black/40 px-6 py-4 rounded-2xl border border-cyan-500/20">
                  <FaGem className="text-cyan-400 text-2xl" />
                  <span>Soporte Priority 24/7</span>
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