import React from 'react';
import {
  ChartBarIcon,
  ArrowsRightLeftIcon,
  BoltIcon,
  DocumentTextIcon,
  ClockIcon,
  UserIcon,
  CogIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';

const NavigationBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { 
      id: 'dashboard', 
      icon: ChartBarIcon, 
      label: 'Dashboard',
      description: 'Resumen general'
    },
    { 
      id: 'p2p', 
      icon: ArrowsRightLeftIcon, 
      label: 'P2P',
      description: 'Operaciones P2P'
    },
    { 
      id: 'arbitrage', 
      icon: BoltIcon, 
      label: 'Arbitraje',
      description: 'Simulador'
    },
    { 
      id: 'operations', 
      icon: DocumentTextIcon, 
      label: 'Operaciones',
      description: 'Gestión'
    },
    { 
      id: 'history', 
      icon: ClockIcon, 
      label: 'Historial',
      description: 'Registros'
    }
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-3rem)] max-w-2xl bg-gray-900/95 backdrop-blur-2xl rounded-3xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 z-50 overflow-hidden">
      {/* Efecto de borde luminoso */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl"></div>
      
      <div className="relative flex justify-between items-center py-4 px-6">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center px-4 py-3 rounded-2xl transition-all duration-500 group min-w-[80px] ${
                isActive 
                  ? 'bg-gradient-to-br from-purple-600/20 to-blue-600/20' 
                  : 'hover:bg-white/5'
              }`}
            >
              {/* Efecto de fondo activo */}
              {isActive && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-2xl"></div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl opacity-20 blur-md"></div>
                </>
              )}

              {/* Efecto de partículas al hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 to-blue-600/0 group-hover:from-purple-600/5 group-hover:to-blue-600/5 rounded-2xl transition-all duration-300"></div>
              
              {/* Icono con efectos */}
              <div className={`relative mb-2 p-2 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30' 
                  : 'bg-gray-800/50 group-hover:bg-gray-700/50'
              }`}>
                <IconComponent className={`w-5 h-5 transition-all duration-300 ${
                  isActive 
                    ? 'text-white scale-110' 
                    : 'text-gray-400 group-hover:text-white group-hover:scale-105'
                }`} />
                
                {/* Punto indicador activo */}
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full border-2 border-gray-900 shadow-lg"></div>
                )}
              </div>
              
              {/* Texto de la etiqueta */}
              <span className={`text-xs font-semibold transition-all duration-300 relative z-10 ${
                isActive 
                  ? 'text-white' 
                  : 'text-gray-400 group-hover:text-white'
              }`}>
                {tab.label}
              </span>
              
              {/* Tooltip en hover */}
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-xl px-3 py-2 rounded-lg border border-purple-500/30 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 min-w-max">
                <div className="text-xs font-semibold text-white">{tab.label}</div>
                <div className="text-[10px] text-gray-300">{tab.description}</div>
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45 border-r border-b border-purple-500/30"></div>
              </div>
              
              {/* Efecto de onda al hacer click */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600/0 to-blue-600/0 group-active:from-purple-600/20 group-active:to-blue-600/20 transition-all duration-200"></div>
            </button>
          );
        })}
        
        {/* Botón de perfil/configuración adicional */}
        <button
          onClick={() => onTabChange('profile')}
          className={`relative flex flex-col items-center px-4 py-3 rounded-2xl transition-all duration-500 group min-w-[80px] ${
            activeTab === 'profile' 
              ? 'bg-gradient-to-br from-purple-600/20 to-blue-600/20' 
              : 'hover:bg-white/5'
          }`}
        >
          {/* Mismos efectos que los demás botones */}
          {activeTab === 'profile' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-2xl"></div>
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl opacity-20 blur-md"></div>
            </>
          )}

          <div className={`relative mb-2 p-2 rounded-xl transition-all duration-300 ${
            activeTab === 'profile' 
              ? 'bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30' 
              : 'bg-gray-800/50 group-hover:bg-gray-700/50'
          }`}>
            <UserIcon className={`w-5 h-5 transition-all duration-300 ${
              activeTab === 'profile' 
                ? 'text-white scale-110' 
                : 'text-gray-400 group-hover:text-white group-hover:scale-105'
            }`} />
            
            {activeTab === 'profile' && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full border-2 border-gray-900 shadow-lg"></div>
            )}
          </div>
          
          <span className={`text-xs font-semibold transition-all duration-300 relative z-10 ${
            activeTab === 'profile' 
              ? 'text-white' 
              : 'text-gray-400 group-hover:text-white'
          }`}>
            Perfil
          </span>
        </button>
      </div>

      {/* Efecto de brillo inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
    </nav>
  );
};

export default NavigationBar;