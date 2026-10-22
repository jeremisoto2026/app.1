import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaGoogle, 
  FaTimes, 
  FaEye, 
  FaEyeSlash, 
  FaLock, 
  FaEnvelope, 
  FaUser, 
  FaSignInAlt, 
  FaUserPlus,
  FaShieldAlt,
  FaRocket
} from 'react-icons/fa';

const getAuthErrorMessage = (error) => {
  const messages = {
    "auth/email-already-in-use": "Ese correo ya tiene una cuenta. Inicia sesión.",
    "auth/invalid-email": "Introduce un correo electrónico válido.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/invalid-credential": "El correo o la contraseña no son correctos.",
    "auth/user-not-found": "No hay una cuenta con ese correo.",
    "auth/wrong-password": "El correo o la contraseña no son correctos.",
    "auth/too-many-requests": "Se han realizado demasiados intentos. Espera un momento y vuelve a intentarlo.",
    "auth/network-request-failed": "No se pudo conectar. Comprueba tu conexión a internet.",
    "auth/popup-closed-by-user": "Cerraste la ventana de Google antes de completar el acceso.",
    "auth/cancelled-popup-request": "La solicitud de acceso con Google se canceló.",
    "auth/account-exists-with-different-credential": "Este correo ya está asociado a otro método de acceso.",
    "auth/unauthorized-domain": "Este dominio no está autorizado para iniciar sesión con Google.",
  };
  return messages[error?.code] || "No se pudo completar el acceso. Revisa los datos e inténtalo de nuevo.";
};

const AuthForms = ({ mode, onClose, onSwitchMode }) => {
  const { signUp, signIn, signInWithGoogle } = useAuth();
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
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
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

  const handleSwitchMode = () => {
    setError('');
    // Cambiar al modo opuesto
    onSwitchMode(mode === 'register' ? 'login' : 'register');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-xl flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-black rounded-3xl p-10 w-full max-w-lg relative border border-purple-500/30 shadow-2xl shadow-purple-500/10 overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl"></div>
        
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-purple-400 text-xl transition-all duration-300 p-2 rounded-full hover:bg-purple-500/10 z-10"
        >
          <FaTimes />
        </button>
        
        <div className="text-center mb-10 relative z-10">
          <div className="relative inline-block">
            <div className="absolute -inset-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-lg opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
              {mode === 'register' ? (
                <FaUserPlus className="text-3xl text-white" />
              ) : (
                <FaSignInAlt className="text-3xl text-white" />
              )}
            </div>
          </div>
          
          <h3 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            {mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
          </h3>
          <p className="text-gray-400 text-lg">
            {mode === 'register' 
              ? 'Crea una cuenta para registrar y consultar tus operaciones.' 
              : 'Inicia sesión para acceder a tu historial y tus resultados.'}
          </p>
        </div>

        {error && (
          <div className="bg-gradient-to-r from-red-900/50 to-red-800/30 text-red-200 p-4 rounded-xl mb-8 text-sm border border-red-700/50 backdrop-blur-sm relative z-10">
            <div className="flex items-center">
              <FaShieldAlt className="mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaUser className="text-purple-400/70" />
                </div>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Nombre"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-gray-900/60 text-white rounded-xl border border-purple-500/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 focus:outline-none transition-all duration-300 backdrop-blur-sm placeholder-gray-500"
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
                  className="w-full px-4 py-4 bg-gray-900/60 text-white rounded-xl border border-purple-500/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 focus:outline-none transition-all duration-300 backdrop-blur-sm placeholder-gray-500"
                />
              </div>
            </div>
          )}
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaEnvelope className="text-purple-400/70" />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full pl-12 pr-4 py-4 bg-gray-900/60 text-white rounded-xl border border-purple-500/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 focus:outline-none transition-all duration-300 backdrop-blur-sm placeholder-gray-500"
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaLock className="text-purple-400/70" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full pl-12 pr-12 py-4 bg-gray-900/60 text-white rounded-xl border border-purple-500/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 focus:outline-none transition-all duration-300 backdrop-blur-sm placeholder-gray-500"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-purple-400/70 hover:text-purple-300 transition-colors duration-200"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full group relative bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 rounded-xl transition-all duration-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative flex items-center justify-center gap-3">
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
                  <FaRocket className="text-cyan-300" />
                </>
              )}
            </span>
          </button>
        </form>

        <div className="mt-10 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-purple-500/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-gradient-to-br from-gray-900 via-purple-900/20 to-black text-purple-400/70">O continúa con</span>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center p-4 bg-gray-900/60 hover:bg-gray-800/60 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 disabled:opacity-50 group backdrop-blur-sm"
            >
              <FaGoogle className="text-red-400 group-hover:text-red-300 text-xl transition-colors duration-300" />
              <span className="ml-2">Google</span>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center relative z-10">
          <p className="text-gray-400 text-sm">
            {mode === 'register' 
              ? '¿Ya tienes una cuenta? ' 
              : '¿Todavía no tienes una cuenta? '}
            <button 
              type="button"
              onClick={handleSwitchMode}
              className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 hover:from-purple-300 hover:to-blue-300 font-medium transition-all duration-300"
            >
              {mode === 'register' ? 'Acceder' : 'Crear cuenta'}
            </button>
          </p>
        </div>

        {/* Elemento decorativo inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 opacity-70"></div>
      </div>
    </div>
  );
};

export default AuthForms;