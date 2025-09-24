import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { BinanceP2PService } from '../services/binanceService';

export const useBinanceSync = (user, connection) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const intervalRef = useRef(null);

  // Función para sincronizar órdenes nuevas
  const syncNewOrders = async (apiKey, secretKey, lastSyncTime) => {
    try {
      setIsSyncing(true);
      setSyncStatus('Buscando nuevas órdenes...');
      
      const result = await BinanceP2PService.getNewP2POrders(apiKey, secretKey, lastSyncTime);
      
      if (result.newOrdersCount > 0) {
        setSyncStatus(`Encontradas ${result.newOrdersCount} nuevas órdenes`);
        
        // Guardar cada nueva orden en Firestore
        for (const order of result.orders) {
          await addDoc(collection(db, 'operaciones'), {
            userId: user.uid,
            binanceOrderId: order.orderNumber,
            activo: order.asset,
            moneda: order.fiat,
            tipo: order.orderType === 'BUY' ? 'compra' : 'venta',
            precio: parseFloat(order.price),
            cantidad: parseFloat(order.quantity),
            montoTotal: parseFloat(order.totalPrice),
            comision: parseFloat(order.commission),
            contraparte: order.counterPartNickName,
            estado: order.orderStatus,
            fechaOperacion: new Date(order.tradeTime),
            fechaCreacion: new Date(order.createTime),
            plataforma: 'Binance P2P',
            sincronizadoEl: serverTimestamp(),
            esSincronizado: true
          });
        }
        
        // Actualizar última sincronización
        await updateLastSync(user.uid, result.lastCheckTime);
        
        setSyncStatus(`✅ ${result.newOrdersCount} órdenes guardadas`);
      } else {
        setSyncStatus('✅ No hay nuevas órdenes');
      }
      
      return result.lastCheckTime;
    } catch (error) {
      setSyncStatus(`❌ Error: ${error.message}`);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  // Iniciar sincronización automática cada 2 minutos
  const startAutoSync = (apiKey, secretKey) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    let lastSyncTime = null;
    
    intervalRef.current = setInterval(async () => {
      if (!isSyncing) {
        lastSyncTime = await syncNewOrders(apiKey, secretKey, lastSyncTime);
      }
    }, 2 * 60 * 1000); // 2 minutos
    
    // Primera sincronización inmediata
    syncNewOrders(apiKey, secretKey, lastSyncTime);
  };

  // Detener sincronización
  const stopAutoSync = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSyncStatus('Sincronización detenida');
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isSyncing,
    syncStatus,
    startAutoSync,
    stopAutoSync,
    syncNewOrders
  };
};

// Función helper para actualizar última sincronización
const updateLastSync = async (userId, timestamp) => {
  const connectionRef = doc(db, 'binanceConnections', userId);
  await updateDoc(connectionRef, {
    lastSync: timestamp,
    lastSyncDate: serverTimestamp()
  });
};