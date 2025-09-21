import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BoltIcon, ArrowLeftOnRectangleIcon, UserCircleIcon, SparklesIcon } from '@heroicons/react/24/solid';

const Header = ({ onShowAuth }) => {
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    // Animación de entrada
    setIsVisible(true);
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled 
        ? 'bg-gradient-to-r from-gray-950/95 via-purple-950/95 to-black/95 backdrop-blur-xl shadow-2xl shadow-purple-500/10 py-3' 
        : 'bg-transparent py-6'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo y marca */}
          <div className={`flex items-center space-x-3 transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'}`}>
            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
              <div className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl shadow-lg">
                <BoltIcon className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
                JJXCAPITAL<span className="text-yellow-400">⚡</span>
              </h1>
              <p className="text-xs text-gray-400 font-light tracking-wider">
                PREMIUM TRADING
              </p>
            </div>
          </div>

          {user ? (
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 bg-gray-900/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-purple-500/20">
                <UserCircleIcon className="h-5 w-5 text-purple-400" />
                <span className="text-white text-sm">
                  Hola, <span className="text-purple-400 font-medium">{user.displayName || user.email}</span>
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="group flex items-center space-x-2 bg-gradient-to-r from-purple-600/10 to-blue-600/10 hover:from-purple-600/20 hover:to-blue-600/20 text-white px-4 py-2 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300 shadow-lg shadow-purple-500/5 hover:shadow-purple-500/20"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <span className="hidden sm:block text-sm">Cerrar Sesión</span>
              </button>
            </div>
          ) : (
            <div className={`flex items-center space-x-3 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-5'}`}>
              <button
                onClick={() => onShowAuth('login')}
                className="group flex items-center space-x-2 bg-gray-900/50 backdrop-blur-sm hover:bg-gray-800/50 text-white px-4 py-2 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300"
              >
                <span className="text-sm">Iniciar Sesión</span>
              </button>
              <button
                onClick={() => onShowAuth('register')}
                className="group relative flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <SparklesIcon className="h-4 w-4 relative z-10" />
                <span className="text-sm font-medium relative z-10">Registrarse</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Efecto de partículas decorativas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-500/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          ></div>
        ))}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-blue-500/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${20 + Math.random() * 10}s`
            }}
          ></div>
        ))}
      </div>
    </header>
  );
};

export default Header;