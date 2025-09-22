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
import { FaSignInAlt, FaUserPlus, FaRocket, FaShield, FaChartLine, FaSync, FaDownload, FaGoogle, FaExchangeAlt } from 'react-icons/fa';
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
    
    // Auto-rotate slides
    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 6);
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

  const slides = [
    {
      title: "CriptoExcel",
      subtitle: "Registra, Ordena y Exporta tus movimientos cripto",
      description: "La plataforma definitiva para gestión de arbitrajes P2P",
      icon: "📊",
      gradient: "from-purple-600 to-blue-600"
    },
    {
      title: "¿Qué es CriptoExcel?",
      subtitle: "Plataforma web profesional",
      description: "Registra tus movimientos de arbitraje en un solo paso. Calcula comisiones, ajusta saldos y organiza automáticamente los datos.",
      icon: "⚡",
      gradient: "from-blue-600 to-cyan-600"
    },
    {
      title: "Para el Arbitrador",
      subtitle: "Solución completa al 90%",
      description: "Ya tienes muchos temas en cuenta al arbitrar; nosotros te resolvemos la gestión y organización de tus operaciones.",
      icon: "🎯",
      gradient: "from-cyan-600 to-green-600"
    },
    {
      title: "Para el Contador",
      subtitle: "Simplificación total",
      description: "No necesita estudiar Excel complejos. Formatos estandarizados para todos tus clientes de forma automática.",
      icon: "👔",
      gradient: "from-green-600 to-purple-600"
    },
    {
      title: "Para el Banco",
      subtitle: "Transparencia y comprensión",
      description: "Evita cierre de cuentas por falta de comprensión. Tus operaciones quedan documentadas profesionalmente.",
      icon: "🏦",
      gradient: "from-purple-600 to-pink-600"
    },
    {
      title: "Comienza Ahora",
      subtitle: "Todo en un solo lugar",
      description: "Simulador avanzado, vinculación con Binance, exportación profesional y más.",
      icon: "🚀",
      gradient: "from-pink-600 to-purple-600"
    }
  ];

  const features = [
    {
      icon: <FaGoogle className="text-3xl" />,
      title: "Inicio Rápido con Google",
      description: "Acceso instantáneo con tu cuenta de Google en segundos",
      color: "bg-red-500/20"
    },
    {
      icon: <FaSync className="text-3xl" />,
      title: "Simulador Avanzado",
      description: "El simulador más completo del mercado, 100% gratis sin limitaciones",
      color: "bg-blue-500/20"
    },
    {
      icon: <FaExchangeAlt className="text-3xl" />, // Cambiado de FaBinance a FaExchangeAlt
      title: "Vinculación Exchange",
      description: "Registro automático de tus operaciones P2P en tiempo real",
      color: "bg-yellow-500/20"
    },
    {
      icon: <FaDownload className="text-3xl" />,
      title: "Exportación Profesional",
      description: "Descarga en Excel + PDF con comprobantes adjuntos",
      color: "bg-green-500/20"
    }
  ];

  // Render para usuarios no autenticados
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        {/* Navigation Dots */}
        <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-20 flex flex-col gap-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                currentSlide === index 
                  ? 'bg-white scale-125' 
                  : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Column - Slides */}
            <div className="relative h-96 lg:h-[500px]">
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-1000 transform ${
                    currentSlide === index
                      ? 'opacity-100 translate-x-0'
                      : index < currentSlide
                      ? 'opacity-0 -translate-x-10'
                      : 'opacity-0 translate-x-10'
                  }`}
                >
                  <div className={`bg-gradient-to-br ${slide.gradient} rounded-3xl p-8 h-full flex flex-col justify-center relative overflow-hidden`}>
                    <div className="absolute top-4 right-4 text-6xl opacity-20">{slide.icon}</div>
                    <div className="relative z-10">
                      <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                        {slide.title}
                      </h1>
                      <h2 className="text-xl lg:text-2xl text-white/80 mb-6">
                        {slide.subtitle}
                      </h2>
                      <p className="text-white/70 text-lg leading-relaxed">
                        {slide.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column - Features & Auth */}
            <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              
              {/* Logo */}
              <div className="text-center lg:text-left mb-8">
                <div className="text-6xl mb-4 animate-bounce">⚡</div>
                <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  CriptoExcel
                </h1>
                <p className="text-xl text-gray-300">Plataforma profesional para traders P2P</p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className={`${feature.color} backdrop-blur-sm rounded-2xl p-4 border border-white/10 transform hover:scale-105 transition-all duration-300`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-white">{feature.icon}</div>
                      <h3 className="text-white font-semibold text-sm">{feature.title}</h3>
                    </div>
                    <p className="text-white/70 text-xs">{feature.description}</p>
                  </div>
                ))}
              </div>

              {/* Auth Buttons */}
              <div className="space-y-4">
                <button 
                  onClick={() => handleShowAuth('register')}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transform hover:scale-105 group relative overflow-hidden flex items-center justify-center gap-3"
                >
                  <FaRocket className="text-xl" />
                  Comenzar Gratis
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                <button 
                  onClick={() => handleShowAuth('login')}
                  className="w-full bg-gray-800/50 hover:bg-gray-700/50 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 border border-purple-500/30 hover:border-purple-500/50 backdrop-blur-sm flex items-center justify-center gap-3"
                >
                  <FaSignInAlt />
                  Iniciar Sesión
                </button>

                <div className="text-center">
                  <p className="text-gray-400 text-sm">
                    ¿Ya eres usuario? <span className="text-purple-400 cursor-pointer hover:underline" onClick={() => handleShowAuth('login')}>Accede aquí</span>
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">10K+</div>
                  <div className="text-xs text-gray-400">Traders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">$500M+</div>
                  <div className="text-xs text-gray-400">Volumen</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">99.9%</div>
                  <div className="text-xs text-gray-400">Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
                  opacity=".25" 
                  className="fill-current text-purple-900"></path>
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
                  opacity=".5" 
                  className="fill-current text-purple-800"></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" 
                  className="fill-current text-purple-700"></path>
          </svg>
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