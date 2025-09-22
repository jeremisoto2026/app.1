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
import { FaSignInAlt, FaUserPlus } from 'react-icons/fa';
import './App.css';

const MainApp = () => {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animación de entrada
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

  // Mapeo de colores para las tarjetas de características
  const colorMap = {
    purple: {
      border: 'border-purple-500/20',
      borderHover: 'hover:border-purple-500/50',
      text: 'text-purple-400',
      gradientFrom: 'from-purple-600',
      gradientTo: 'to-purple-400'
    },
    blue: {
      border: 'border-blue-500/20',
      borderHover: 'hover:border-blue-500/50',
      text: 'text-blue-400',
      gradientFrom: 'from-blue-600',
      gradientTo: 'to-blue-400'
    },
    cyan: {
      border: 'border-cyan-500/20',
      borderHover: 'hover:border-cyan-500/50',
      text: 'text-cyan-400',
      gradientFrom: 'from-cyan-600',
      gradientTo: 'to-cyan-400'
    }
  };

  const delayClasses = ['delay-0', 'delay-100', 'delay-200'];

  const renderContent = () => {
    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center p-4 relative overflow-hidden">
          {/* Elementos decorativos de fondo animados */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-cyan-600/5 rounded-full blur-2xl animate-bounce-slow"></div>
          
          {/* Partículas de fondo */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-purple-500/30 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${15 + Math.random() * 10}s`
                }}
              ></div>
            ))}
          </div>
          
          <div className={`text-center max-w-5xl mx-auto z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Logo y título con animación */}
            <div className="mb-12 transform transition-all duration-1000 hover:scale-105">
              <div className="text-7xl mb-6 animate-pulse">⚡</div>
              <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-6 tracking-tight">
                JJXCAPITAL<span className="text-yellow-400 drop-shadow-glow">⚡</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
                La plataforma definitiva para <span className="text-purple-400 font-semibold">trading de cripto</span> con 
                herramientas <span className="text-blue-400 font-semibold">profesionales</span> y ejecución <span className="text-cyan-400 font-semibold">ultra rápida</span>
              </p>
            </div>

            {/* Botones de autenticación */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <button 
                onClick={() => handleShowAuth('login')}
                className="px-10 py-4 bg-gray-800/50 hover:bg-gray-700/50 text-white font-bold rounded-xl transition-all duration-300 border border-purple-500/30 hover:border-purple-500/50 backdrop-blur-sm transform hover:scale-105 flex items-center gap-2"
              >
                <FaSignInAlt /> Iniciar Sesión
              </button>
              <button 
                onClick={() => handleShowAuth('register')}
                className="px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transform hover:scale-105 group relative overflow-hidden flex items-center gap-2"
              >
                <FaUserPlus /> Regístrate
                <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>

            {/* Características con animación escalonada - CORREGIDO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
              {[
                {
                  icon: '🔒',
                  title: 'Seguridad Elite',
                  description: 'Encriptación bancaria y autenticación multifactor para máxima protección',
                  color: 'purple'
                },
                {
                  icon: '⚡',
                  title: 'Velocidad Lightning',
                  description: 'Ejecución en milisegundos con nuestra tecnología de baja latencia',
                  color: 'blue'
                },
                {
                  icon: '📊',
                  title: 'Análisis Avanzado',
                  description: 'Dashboard profesional con métricas en tiempo real y alertas inteligentes',
                  color: 'cyan'
                }
              ].map((feature, index) => {
                const color = colorMap[feature.color];
                return (
                  <div 
                    key={index}
                    className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border transition-all duration-500 group relative overflow-hidden transform hover:-translate-y-2 ${delayClasses[index]} ${color.border} ${color.borderHover}`}
                  >
                    <div className={`absolute -inset-1 bg-gradient-to-r ${color.gradientFrom} ${color.gradientTo} opacity-0 group-hover:opacity-10 blur transition-all duration-500`}></div>
                    <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-500">{feature.icon}</div>
                    <h3 className={`text-2xl font-bold ${color.text} mb-4`}>{feature.title}</h3>
                    <p className="text-gray-300 text-md leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Llamada a la acción */}
            <div className="mb-16 transform transition-all duration-1000 delay-500">
              <h3 className="text-3xl font-bold text-white mb-6">Comienza Tu Revolución Financiera</h3>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto text-lg">
                Únete a la élite de traders que ya están maximizando sus ganancias con nuestras herramientas avanzadas.
              </p>
            </div>

            {/* Estadísticas destacadas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto border-t border-purple-500/20 pt-12 transform transition-all duration-1000 delay-700">
              {[
                { value: '10K+', label: 'Traders Activos', color: 'purple' },
                { value: '$500M+', label: 'Volumen Mensual', color: 'blue' },
                { value: '99.9%', label: 'Uptime Garantizado', color: 'cyan' },
                { value: '24/7', label: 'Soporte Premium', color: 'green' }
              ].map((stat, index) => (
                <div key={index} className="text-center transform hover:scale-105 transition-transform duration-300">
                  <div className={`text-3xl font-bold text-${stat.color}-400 mb-2`}>{stat.value}</div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Testimonios (opcional) */}
            <div className="mt-16 border-t border-purple-500/20 pt-12 transform transition-all duration-1000 delay-1000">
              <h4 className="text-2xl font-bold text-white mb-8">Lo Que Dicen Nuestros Traders</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-purple-500/10 backdrop-blur-sm">
                  <p className="text-gray-300 italic mb-4">"JJXCAPITAL⚡ transformó completamente mi estrategia de trading. Las herramientas son increíbles."</p>
                  <div className="text-purple-400 font-semibold">- Alex C.</div>
                </div>
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-blue-500/10 backdrop-blur-sm">
                  <p className="text-gray-300 italic mb-4">"La velocidad de ejecución es incomparable. He aumentado mis ganancias un 40% desde que uso la plataforma."</p>
                  <div className="text-blue-400 font-semibold">- María R.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard refreshTrigger={refreshTrigger} onOpenProfile={() => setActiveTab('profile')} />;
      case 'p2p':
        return <P2PSimulator />;
      case 'arbitrage':
        return <ArbitrageSimulator />;
      case 'operations':
        return <Operations onOperationSaved={handleOperationSaved} />;
      case 'history':
        return <History refreshTrigger={refreshTrigger} />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard refreshTrigger={refreshTrigger} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black text-white overflow-x-hidden">
      {/* Header eliminado */}
      
      <main className={`${user ? 'pb-20' : ''}`}>
        {renderContent()}
      </main>

      {user && (
        <NavigationBar 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />
      )}

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