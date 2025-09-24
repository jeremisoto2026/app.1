import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BinanceP2PService } from '../services/binanceService';
import { useBinanceSync } from '../hooks/useBinanceSync';
import { encrypt } from '../utils/encryption';

export default function BinanceConnect() {
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [connection, setConnection] = useState(null);
  const [user, setUser] = useState(null);

  const { isSyncing, syncStatus, startAutoSync, stopAutoSync } = useBinanceSync(user, connection);

  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);
    checkExistingConnection(auth.currentUser);
  }, []);

  const checkExistingConnection = async (user) => {
    if (!user) return;
    
    const connectionRef = doc(db, 'binanceConnections', user.uid);
    const connectionDoc = await getDoc(connectionRef);
    
    if (connectionDoc.exists()) {
      setConnection(connectionDoc.data());
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 1. Validar API Keys
      setMessage('🔍 Validando API Keys...');
      const validation = await BinanceP2PService.validateApiKeys(apiKey, secretKey);
      
      if (!validation.valid) {
        throw new Error('API Keys inválidas: ' + validation.error);
      }

      // 2. Guardar conexión en Firestore (encriptado)
      const connectionRef = doc(db, 'binanceConnections', user.uid);
      await setDoc(connectionRef, {
        apiKey: encrypt(apiKey),
        secretKey: encrypt(secretKey),
        connectedAt: new Date(),
        lastSync: null,
        isActive: true,
        userEmail: user.email
      });

      setConnection(await getDoc(connectionRef).data());
      setMessage('✅ ¡Conexión exitosa! Sincronización iniciada...');

      // 3. Iniciar sincronización automática
      startAutoSync(apiKey, secretKey);

      // 4. Limpiar formulario
      setApiKey('');
      setSecretKey('');

    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      // 1. Detener sincronización
      stopAutoSync();
      
      // 2. ELIMINAR API Keys (solo las keys, no las órdenes)
      const connectionRef = doc(db, 'binanceConnections', user.uid);
      await deleteDoc(connectionRef);
      
      setConnection(null);
      setMessage('✅ Conexión desconectada. API Keys eliminadas. Las órdenes permanecen en tu registro.');
    } catch (error) {
      setMessage(`❌ Error al desconectar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (connection) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-green-600">✅ Binance Conectado</h2>
        
        <div className="space-y-3 mb-4">
          <p><strong>Estado:</strong> {isSyncing ? '🔄 Sincronizando...' : '✅ Activo'}</p>
          <p><strong>Conectado desde:</strong> {new Date(connection.connectedAt?.toDate()).toLocaleDateString()}</p>
          <p><strong>Última sincronización:</strong> {syncStatus}</p>
        </div>

        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-400"
        >
          {loading ? 'Desconectando...' : '🚫 Desconectar Binance'}
        </button>

        {message && (
          <div className="mt-4 p-3 rounded-md bg-blue-100 text-blue-800">
            {message}
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          <p>💡 <strong>Nota:</strong> Al desconectar, tus API Keys se eliminarán pero todas las órdenes sincronizadas permanecerán en tu registro.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🔗 Conectar Binance P2P</h2>
      
      <form onSubmit={handleConnect} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">API Key:</label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.targetValue)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ingresa tu API Key de Binance"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Secret Key:</label>
          <input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ingresa tu Secret Key"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {loading ? 'Conectando...' : '🔗 Conectar y Sincronizar'}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-3 rounded-md ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p>📋 <strong>Cómo funciona:</strong></p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Se sincronizarán NUEVAS órdenes automáticamente</li>
          <li>No se importará el historial antiguo</li>
          <li>Puedes desconectar cuando quieras</li>
          <li>Tus órdenes guardadas permanecen siempre</li>
        </ul>
      </div>
    </div>
  );
}