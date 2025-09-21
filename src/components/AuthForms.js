import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaGoogle, FaMicrosoft, FaApple, FaTimes, FaEye, FaEyeSlash, FaLock, FaEnvelope, FaUser, FaSignInAlt, FaUserPlus } from 'react-icons/fa';

const AuthForms = ({ mode, onClose }) => {
  const { signUp, signIn, signInWithGoogle, signInWithMicrosoft, signInWithApple } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await signUp(formData.email, formData.password, formData.firstName, formData.lastName);
      } else {
        await signIn(formData.email, formData.password);
      }
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setError('');
    setLoading(true);

    try {
      switch (provider) {
        case 'google':
          await signInWithGoogle();
          break;
        case 'microsoft':
          await signInWithMicrosoft();
          break;
        case 'apple':
          await signInWithApple();
          break;
        default:
          break;
      }
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 w-full max-w-md relative border border-gold shadow-2xl shadow-gold/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gold text-xl transition-colors duration-200 p-2 rounded-full hover:bg-gray-700/50"
        >
          <FaTimes />
        </button>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-gold to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            {mode === 'register' ? (
              <FaUserPlus className="text-2xl text-black" />
            ) : (
              <FaSignInAlt className="text-2xl text-black" />
            )}
          </div>
          <h3 className="text-3xl font-bold text-gold mb-2">
            {mode === 'register' ? 'Crear Cuenta Premium' : 'Acceso Élite'}
          </h3>
          <p className="text-gray-400">
            {mode === 'register' ? 'Únete a la revolución financiera' : 'Accede a tu dashboard premium'}
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 text-red-200 p-4 rounded-lg mb-6 text-sm border border-red-700/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="text-gray-500" />
                </div>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Nombre"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none transition-all duration-200"
                />
              </div>
              <div className="relative">
                <input
                  type="text"
                  name="lastName"
                  placeholder="Apellido"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none transition-all duration-200"
                />
              </div>
            </div>
          )}
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaEnvelope className="text-gray-500" />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none transition-all duration-200"
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaLock className="text-gray-500" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-12 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-gold focus:ring-2 focus:ring-gold/20 focus:outline-none transition-all duration-200"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gold transition-colors duration-200"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-gold to-orange-500 hover:from-gold/90 hover:to-orange-500/90 text-black font-bold py-4 rounded-xl transition-all duration-300 shadow-lg shadow-gold/30 hover:shadow-gold/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
            ) : (
              <>
                {mode === 'register' ? 'Crear Cuenta Premium' : 'Acceder a Mi Dashboard'}
              </>
            )}
          </button>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-gradient-to-br from-gray-900 to-gray-800 text-gray-400">O continúa con</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="flex items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 transition-all duration-200 disabled:opacity-50 group"
            >
              <FaGoogle className="text-red-400 group-hover:text-red-300 text-xl" />
            </button>
            <button
              onClick={() => handleSocialLogin('microsoft')}
              disabled={loading}
              className="flex items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 transition-all duration-200 disabled:opacity-50 group"
            >
              <FaMicrosoft className="text-blue-400 group-hover:text-blue-300 text-xl" />
            </button>
            <button
              onClick={() => handleSocialLogin('apple')}
              disabled={loading}
              className="flex items-center justify-center p-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 transition-all duration-200 disabled:opacity-50 group"
            >
              <FaApple className="text-gray-300 group-hover:text-white text-xl" />
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            {mode === 'register' 
              ? '¿Ya tienes una cuenta? ' 
              : '¿No tienes una cuenta? '}
            <button 
              onClick={() => setError('')}
              className="text-gold hover:text-orange-400 font-medium transition-colors duration-200"
            >
              {mode === 'register' ? 'Iniciar Sesión' : 'Regístrate'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForms;