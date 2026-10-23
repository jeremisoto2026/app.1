import React from "react";
import {
  ChartBarIcon,
  ArrowsRightLeftIcon,
  BoltIcon,
  DocumentTextIcon,
  ClockIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

const NavigationBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "dashboard", icon: ChartBarIcon, label: "Resumen", mobileLabel: "Inicio" },
    { id: "p2p", icon: ArrowsRightLeftIcon, label: "Simulador P2P", mobileLabel: "P2P" },
    { id: "arbitrage", icon: BoltIcon, label: "Arbitraje", mobileLabel: "Arbit." },
    { id: "sessions", icon: BoltIcon, label: "Arbitrajes", mobileLabel: "Arbit." },
    { id: "operations", icon: DocumentTextIcon, label: "Operaciones", mobileLabel: "Oper." },
    { id: "history", icon: ClockIcon, label: "Historial", mobileLabel: "Hist." },
    { id: "profile", icon: UserCircleIcon, label: "Perfil", mobileLabel: "Perfil" },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed z-[100] bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-xl md:bottom-auto md:top-0 md:left-0 md:right-0 md:translate-x-0 md:w-full md:max-w-none md:rounded-none bg-gray-950/95 backdrop-blur-2xl rounded-2xl border border-purple-500/30 md:border-x-0 md:border-t-0 md:border-b shadow-2xl shadow-purple-500/20 md:shadow-lg md:px-4 lg:px-8"
    >
      <div className="flex items-center justify-start md:justify-center gap-1 md:gap-2 p-2 md:py-3 max-w-7xl mx-auto overflow-x-auto overscroll-x-contain">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 flex-1 md:flex-none md:shrink-0 min-w-0 md:min-w-max px-1.5 md:px-4 py-2.5 md:py-2 rounded-xl text-xs md:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                isActive
                  ? "bg-gradient-to-br from-purple-600/30 to-blue-600/30 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <IconComponent className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate max-w-full">
                <span className="md:hidden">{tab.mobileLabel}</span>
                <span className="hidden md:inline">{tab.label}</span>
              </span>
              {isActive && (
                <span className="absolute bottom-0 md:bottom-auto md:right-2 w-1.5 h-1.5 rounded-full bg-green-400 md:static" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavigationBar;
