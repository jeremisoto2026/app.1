import React from "react";
import { Link, useLocation } from "react-router-dom";

const FooterNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: '📊', label: 'Dashboard' },
    { path: '/operations', icon: '📝', label: 'Historial' },
    { path: '/new', icon: '➕', label: 'Nueva' },
    { path: '/subscription', icon: '💳', label: 'Plan' }
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-40">
      <nav className="flex justify-around items-center py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors duration-200 ${
              location.pathname === item.path
                ? 'text-yellow-400 bg-gray-700'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </footer>
  );
};

export default FooterNav;