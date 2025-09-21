import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaSignInAlt, FaUserPlus, FaSignOutAlt } from 'react-icons/fa';

const Header = ({ onShowAuth }) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="header-container">
      <div className="header-content">
        <div className="logo-section">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">
            <h1 className="logo-main">JUXCAPITAL</h1>
            <p className="logo-sub">PREMIUM TRADING</p>
          </div>
        </div>

        {user ? (
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
        ) : (
          <div className="auth-buttons">
            <button
              onClick={() => onShowAuth('login')}
              className="btn-login"
            >
              <FaSignInAlt /> Iniciar Sesión
            </button>
            <button
              onClick={() => onShowAuth('register')}
              className="btn-register"
            >
              <FaUserPlus /> Regístrate
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;