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
    setActiveTab('dashboard'); // Navigate to dashboard after saving
  };

  const renderContent = () => {
    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-8xl mb-8">⚡</div>
            <h2 className="text-4xl font-bold text-yellow-400 mb-4">
              Bienvenido a JJXCAPITAL ⚡
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              La plataforma líder en arbitraje y transacciones P2P de criptomonedas. 
              Experimenta la combinación perfecta de seguridad, velocidad y confianza.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-yellow-400 mb-2">Seguridad</h3>
                <p className="text-gray-300 text-sm">
                  Autenticación multifactor y encriptación de última generación
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold text-yellow-400 mb-2">Velocidad</h3>
                <p className="text-gray-300 text-sm">
                  Operaciones instantáneas y simuladores en tiempo real
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="text-xl font-bold text-yellow-400 mb-2">Confianza</h3>
                <p className="text-gray-300 text-sm">
                  Transparencia total y herramientas profesionales de trading
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard refreshTrigger={refreshTrigger} />;
      case 'p2p':
        return <P2PSimulator />;
      case 'arbitrage':
        return <ArbitrageSimulator />;
      case 'operations':
        return <Operations onOperationSaved={handleOperationSaved} />;
      case 'history':
        return <History refreshTrigger={refreshTrigger} />;
      default:
        return <Dashboard refreshTrigger={refreshTrigger} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
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