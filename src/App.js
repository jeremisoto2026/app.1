import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import AuthForms from './components/AuthForms';
import NavigationBar from './components/NavigationBar';
import Dashboard from './components/Dashboard';
import P2PSimulator from './components/P2PSimulator';
import ArbitrageSimulator from './components/ArbitrageSimulator';
import Operations from './components/Operations';
import History from './components/History';
import Profile from './components/Profile';
import './App.css';

const MainApp = () => {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  const renderContent = () => {
    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black flex items-center justify-center p-4 relative overflow-hidden">
          {/* Elementos decorativos de fondo */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl"></div>
          
          <div className="text-center max-w-4xl mx-auto z-10">
            {/* Logo y título */}
            <div className="mb-8">
              <div className="text-6xl mb-4 animate-pulse">⚡</div>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
                JJXCAPITAL<span className="text-yellow-400">⚡</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                La plataforma premium de arbitraje y transacciones P2P de criptomonedas
              </p>
            </div>

            {/* Características */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-10 blur transition-all duration-300"></div>
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-purple-400 mb-2">Seguridad Elite</h3>
                <p className="text-gray-300 text-sm">
                  Autenticación multifactor y encriptación bancaria para tus activos
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-10 blur transition-all duration-300"></div>
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">Velocidad Lightning</h3>
                <p className="text-gray-300 text-sm">
                  Ejecución instantánea y simuladores en tiempo real con latency zero
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 group relative overflow-hidden">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-10 blur transition-all duration-300"></div>
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-cyan-400 mb-2">Análisis Profesional</h3>
                <p className="text-gray-300 text-sm">
                  Dashboard avanzado con métricas de rendimiento en tiempo real
                </p>
              </div>
            </div>

            {/* Llamada a la acción */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-4">Comienza tu journey financiero</h3>
              <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                Únete a la plataforma de trading más avanzada y comienza a optimizar tus operaciones con herramientas profesionales.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => handleShowAuth('register')}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                >
                  Crear Cuenta Premium
                </button>
                <button 
                  onClick={() => handleShowAuth('login')}
                  className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300 border border-purple-500/30"
                >
                  Acceso Traders
                </button>
              </div>
            </div>

            {/* Estadísticas destacadas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto border-t border-purple-500/20 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">10K+</div>
                <div className="text-sm text-gray-400">Traders Activos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">$500M+</div>
                <div className="text-sm text-gray-400">Volumen Mensual</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">99.9%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">24/7</div>
                <div className="text-sm text-gray-400">Soporte</div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-black text-white">
      <Header onShowAuth={handleShowAuth} />
      
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