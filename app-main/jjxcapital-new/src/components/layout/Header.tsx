import React from "react";
import { useAuth } from "../auth/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/config";

const Header: React.FC = () => {
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <header className="bg-gradient-to-r from-gray-900 to-black text-white p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-3xl">⚡</div>
          <div>
            <h1 className="text-2xl font-bold text-yellow-400">JJXCAPITAL ⚡</h1>
            <p className="text-sm text-gray-300">Seguridad, velocidad y confianza</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-300">Hola,</p>
            <p className="font-semibold text-yellow-400">
              {user.displayName || user.email} 👋
            </p>
          </div>
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
};

export default Header;