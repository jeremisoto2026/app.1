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
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-40">
      <div className="flex justify-around items-center py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors duration-200 ${
              activeTab === tab.id 
                ? 'text-yellow-400 bg-gray-700' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span className="text-xl mb-1">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default NavigationBar;