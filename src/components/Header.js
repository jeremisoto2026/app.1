import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';

const Header = ({ onShowAuth }) => {
  const { user, signOut } = useAuth();

  const testFirebaseConnection = async () => {
    try {
      await signInAnonymously(auth);
      alert('✅ Firebase Conectado - Login Anónimo Exitoso!');
    } catch (error) {
      alert(`❌ Error Firebase: ${error.code} - ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (user) {
    return (
      <header className="text-center py-8 bg-gradient-to-r from-gray-900 to-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-6xl">⚡</div>
          <h1 className="text-4xl md:text-6xl font-bold text-yellow-400 font-montserrat">
            JJXCAPITAL ⚡
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-light">
            Seguridad, velocidad y confianza
          </p>
          <div className="flex items-center space-x-4 mt-4">
            <span className="text-white text-lg">
              Hola, <span className="text-yellow-400 font-semibold">{user.displayName || user.email}</span> 👋
            </span>
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="text-center py-8 bg-gradient-to-r from-gray-900 to-black">
      <div className="flex flex-col items-center space-y-4">
        <div className="text-6xl">⚡</div>
        <h1 className="text-4xl md:text-6xl font-bold text-yellow-400 font-montserrat">
          JJXCAPITAL ⚡
        </h1>
        <p className="text-lg md:text-xl text-gray-300 font-light">
          Seguridad, velocidad y confianza
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button
            onClick={() => onShowAuth('register')}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3 rounded-lg transition-colors duration-200 shadow-lg"
          >
            Regístrate
          </button>
          <button
            onClick={() => onShowAuth('login')}
            className="bg-transparent border-2 border-yellow-400 hover:bg-yellow-400 hover:text-black text-yellow-400 font-semibold px-8 py-3 rounded-lg transition-colors duration-200"
          >
            Iniciar Sesión
          </button>
        </div>
        
        {/* Botón de prueba Firebase */}
        <button
          onClick={testFirebaseConnection}
          className="mt-4 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition-colors duration-200"
        >
          🧪 Probar Firebase Connection
        </button>
      </div>
    </header>
  );
};

export default Header;