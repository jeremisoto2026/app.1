import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaSignOutAlt } from 'react-icons/fa';

const Header = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return null; // No mostrar header si no hay usuario autenticado
  }

  return (
    <header className="header-container">
      <div className="header-content">
        <div className="user-section">
          <div className="user-info">
            <div className="user-avatar">
              <FaUser />
            </div>
            <div className="user-details">
              <span className="user-greeting">Hola,</span>
              <span className="user-name">{user.displayName || user.email}</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="btn-logout"
          >
            <FaSignOutAlt /> Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;