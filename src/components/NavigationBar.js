import React from 'react';
import {
  ChartBarIcon,
  ArrowsRightLeftIcon,
  BoltIcon,
  DocumentTextIcon,
  ClockIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

const NavigationBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { 
      id: 'dashboard', 
      icon: ChartBarIcon, 
      label: 'Dashboard'
    },
    { 
      id: 'p2p', 
      icon: ArrowsRightLeftIcon, 
      label: 'P2P'
    },
    { 
      id: 'arbitrage', 
      icon: BoltIcon, 
      label: 'Arbitraje'
    },
    { 
      id: 'operations', 
      icon: DocumentTextIcon, 
      label: 'Operaciones'
    },
    { 
      id: 'history', 
      icon: ClockIcon, 
      label: 'Historial'
    },
    { 
      id: 'profile', 
      icon: UserIcon, 
      label: 'Perfil'
    }
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-gray-900/95 backdrop-blur-2xl rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 z-50 overflow-hidden">
      {/* Efecto de borde luminoso */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-2xl"></div>
      
      <div className="relative flex justify-between items-center p-2">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center flex-1 min-w-0 px-2 py-3 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-gradient-to-br from-purple-600/20 to-blue-600/20' 
                  : 'hover:bg-white/5'
              }`}
            >
              {/* Efecto de fondo activo */}
              {isActive && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-xl"></div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-20 blur-sm"></div>
                </>
              )}

              {/* Efecto al hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 to-blue-600/0 group-hover:from-purple-600/5 group-hover:to-blue-600/5 rounded-xl transition-all duration-300"></div>
              
              {/* Contenedor del icono */}
              <div className={`relative mb-1 p-2 rounded-lg transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30' 
                  : 'bg-gray-800/50 group-hover:bg-gray-700/50'
              }`}>
                <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${
                  isActive 
                    ? 'text-white scale-110' 
                    : 'text-gray-400 group-hover:text-white group-hover:scale-105'
                }`} />
                
                {/* Punto indicador activo */}
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full border-2 border-gray-900 shadow-lg"></div>
                )}
              </div>
              
              {/* Texto de la etiqueta - Mejorado para responsive */}
              <span className={`text-[10px] xs:text-xs font-medium transition-all duration-300 relative z-10 truncate max-w-full px-1 ${
                isActive 
                  ? 'text-white font-semibold' 
                  : 'text-gray-400 group-hover:text-white'
              }`}>
                {tab.label}
              </span>
              
              {/* Tooltip en hover para pantallas grandes */}
              <div className="hidden lg:block absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-xl px-3 py-2 rounded-lg border border-purple-500/30 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 min-w-max">
                <div className="text-xs font-semibold text-white whitespace-nowrap">{tab.label}</div>
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900/95 rotate-45 border-r border-b border-purple-500/30"></div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Efecto de brillo inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
    </nav>
  );
};

export default NavigationBar;