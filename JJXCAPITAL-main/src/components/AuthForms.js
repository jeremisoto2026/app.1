import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
        >
          ×
        </button>
        
        <h3 className="text-2xl font-bold text-white mb-6 text-center">
          {mode === 'register' ? 'Registro' : 'Iniciar Sesión'}
        </h3>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <input
                type="text"
                name="firstName"
                placeholder="Nombre"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Apellido"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
              />
            </>
          )}
          
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
          />
          
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-yellow-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : (mode === 'register' ? 'Registrar' : 'Entrar')}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">O continúa con</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              Google
            </button>
            <button
              onClick={() => handleSocialLogin('microsoft')}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              Microsoft
            </button>
            <button
              onClick={() => handleSocialLogin('apple')}
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              Apple
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForms;