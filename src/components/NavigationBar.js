import React from 'react';

const NavigationBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'p2p', icon: '💱', label: 'P2P' },
    { id: 'arbitrage', icon: '⚡', label: 'Arbitraje' },
    { id: 'operations', icon: '📝', label: 'Operaciones' },
    { id: 'history', icon: '📈', label: 'Historial' }
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-purple-500/20 shadow-2xl shadow-purple-500/10 z-50">
      <div className="flex justify-around items-center py-3 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
              activeTab === tab.id 
                ? 'bg-gradient-to-br from-purple-600/20 to-blue-600/20 text-purple-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {/* Efecto de fondo activo */}
            {activeTab === tab.id && (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-xl"></div>
            )}
            
            {/* Efecto de borde activo */}
            {activeTab === tab.id && (
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-50 blur-sm"></div>
            )}
            
            {/* Efecto de iluminación al hacer hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 to-blue-600/0 group-hover:from-purple-600/10 group-hover:to-blue-600/10 rounded-xl transition-all duration-300"></div>
            
            <span className={`text-xl mb-1 transition-all duration-300 relative z-10 ${
              activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'
            }`}>
              {tab.icon}
            </span>
            <span className={`text-xs font-medium transition-all duration-300 relative z-10 ${
              activeTab === tab.id ? 'text-white' : 'group-hover:text-white'
            }`}>
              {tab.label}
            </span>
            
            {/* Indicador activo */}
            {activeTab === tab.id && (
              <div className="absolute bottom-1 w-1 h-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default NavigationBar;