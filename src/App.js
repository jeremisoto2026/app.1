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
import { FaSignInAlt, FaUserPlus, FaRocket, FaChartLine, FaSync, FaDownload, FaGoogle, FaExchangeAlt, FaLock, FaAward, FaCheck, FaCrown, FaStar } from 'react-icons/fa';
import './App.css';

const MainApp = () => {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
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
      icon: "🛡️",
      title: "Compensación Profesional",
      description: "Evita cierre de cuentas por falta de comprensión. Tus operaciones quedan documentadas profesionalmente.",
      benefits: ["Documentación bancaria", "Compliance automático", "Reportes certificados"],
      gradient: "from-purple-600 to-blue-600"
    },
    {
      icon: "⚡", 
      title: "Inicio Rápido con Google",
      description: "Acceso instantáneo con tu cuenta de Google en segundos. Sin contraseñas complicadas.",
      benefits: ["Acceso inmediato", "Autenticación segura", "Sincronización instantánea"],
      gradient: "from-blue-600 to-cyan-600"
    },
    {
      icon: "📊",
      title: "Simulador Avanzado",
      description: "El simulador más completo del mercado, 100% gratis sin limitaciones. Toma decisiones inteligentes.",
      benefits: ["Análisis en tiempo real", "Múltiples escenarios", "Optimización automática"],
      gradient: "from-cyan-600 to-purple-600"
    },
    {
      icon: "🔗",
      title: "Vinculación Exchange",
      description: "Conexión directa con los principales exchanges. Opera con total tranquilidad y seguridad.",
      benefits: ["Sincronización automática", "Multi-exchange", "Seguridad institucional"],
      gradient: "from-purple-600 to-pink-600"
    }
  ];

  const trustIndicators = [
    { icon: "🏆", label: "Plataforma Certificada", value: "Nivel Elite" },
    { icon: "🔒", label: "Seguridad Bancaria", value: "Encriptación AES-256" },
    { icon: "⚡", label: "Velocidad de Ejecución", value: "< 50ms" },
    { icon: "🌎", label: "Cobertura Global", value: "100+ Países" }
  ];

  const stats = [
    { value: "15,000+", label: "Traders Profesionales" },
    { value: "$3.5B+", label: "Volumen Mensual" },
    { value: "99.99%", label: "Uptime Garantizado" },
    { value: "24/7", label: "Soporte Premium" }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black relative overflow-hidden">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse delay-4000"></div>
          
          {/* Animated Grid */}
          <div className="absolute inset-0 opacity-[0.02]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
          </div>

          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-400/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${20 + Math.random() * 20}s`
              }}
            />
          ))}
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="max-w-7xl mx-auto w-full">
            
            {/* Hero Section - Ultra Premium */}
            <div className="text-center mb-20">
              {/* Animated Logo */}
              <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 rounded-3xl mb-8 shadow-2xl shadow-purple-500/30 animate-pulse-glow">
                <span className="text-6xl">⚡</span>
              </div>
              
              {/* Main Title */}
              <h1 className="text-8xl lg:text-9xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6 tracking-tighter leading-none">
                JJXCAPITAL
                <span className="text-white block text-6xl lg:text-7xl mt-4">⚡ ELITE PLATFORM</span>
              </h1>
              
              {/* Subtitle */}
              <p className="text-3xl lg:text-4xl text-gray-300 font-light mb-12 max-w-5xl mx-auto leading-tight">
                La plataforma <span className="text-purple-400 font-semibold">definitiva</span> para traders P2P profesionales 
                con tecnología <span className="text-blue-400 font-semibold">institucional</span> y ejecución 
                <span className="text-cyan-400 font-semibold"> ultra-rápida</span>
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-8 mb-16">
                {trustIndicators.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 bg-black/40 px-6 py-4 rounded-2xl border border-purple-500/30 backdrop-blur-sm transform hover:scale-105 transition-all duration-300">
                    <span className="text-3xl">{item.icon}</span>
                    <div className="text-left">
                      <div className="text-purple-400 text-lg font-bold">{item.label}</div>
                      <div className="text-gray-400 text-sm">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Features Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-20">
              {premiumFeatures.map((feature, index) => (
                <div 
                  key={index}
                  className="group relative bg-gradient-to-br from-gray-900/90 to-black/90 rounded-3xl p-8 border-2 border-purple-500/20 hover:border-purple-400/40 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 backdrop-blur-sm"
                >
                  {/* Animated Gradient Border */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start gap-6 mb-6">
                      <div className="p-4 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-2xl group-hover:scale-110 transition-transform duration-300 text-4xl">
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-3xl font-bold text-white mb-3">{feature.title}</h3>
                        <p className="text-gray-300 text-lg leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                    
                    {/* Benefits */}
                    <div className="flex flex-wrap gap-3">
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <span key={benefitIndex} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-full text-sm text-purple-300 border border-purple-400/30">
                          <FaCheck className="text-purple-400" />
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center bg-black/30 rounded-3xl p-6 border border-purple-500/20 backdrop-blur-sm transform hover:scale-105 transition-all duration-300">
                  <div className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-lg font-semibold text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Ultimate CTA Section */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-cyan-600/10 rounded-3xl p-12 border-2 border-purple-500/30 backdrop-blur-sm mb-10 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.3),transparent_50%)]"></div>
                </div>
                
                <h2 className="text-5xl font-black text-white mb-6 relative z-10">
                  Comienza Tu <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Revolución Financiera</span>
                </h2>
                <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed relative z-10">
                  Únete a la élite de traders que están transformando el mercado P2P con herramientas de nivel institucional
                </p>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center relative z-10">
                  <button 
                    onClick={() => handleShowAuth('register')}
                    className="group relative bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black text-xl py-6 px-12 rounded-2xl transition-all duration-300 shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transform hover:scale-105"
                  >
                    <div className="flex items-center justify-center gap-4">
                      <FaRocket className="text-2xl animate-bounce" />
                      <span>COMENZAR GRATIS - ACCESO ELITE</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                  </button>

                  <button 
                    onClick={() => handleShowAuth('login')}
                    className="group bg-transparent hover:bg-white/5 text-white font-semibold text-xl py-6 px-12 rounded-2xl transition-all duration-300 border-2 border-purple-500/30 hover:border-purple-500/60 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-center gap-4">
                      <FaCrown className="text-xl" />
                      <span>ACCESO TRADERS ELITE</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Ultimate Security Badges */}
              <div className="flex flex-wrap justify-center items-center gap-12 text-lg text-gray-400">
                <div className="flex items-center gap-3 bg-black/30 px-6 py-3 rounded-2xl border border-purple-500/20">
                  <FaLock className="text-purple-400 text-xl" />
                  <span>Encriptación Bancaria Nivel Militar</span>
                </div>
                <div className="flex items-center gap-3 bg-black/30 px-6 py-3 rounded-2xl border border-blue-500/20">
                  <FaAward className="text-blue-400 text-xl" />
                  <span>Certificación SSL Enterprise</span>
                </div>
                <div className="flex items-center gap-3 bg-black/30 px-6 py-3 rounded-2xl border border-cyan-500/20">
                  <FaStar className="text-cyan-400 text-xl" />
                  <span>Plataforma Nivel Institucional</span>
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