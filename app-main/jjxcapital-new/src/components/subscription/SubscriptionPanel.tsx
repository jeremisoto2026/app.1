import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useOperations } from "../../hooks/useOperations";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestore } from "../../firebase/config";
import { Subscription } from "../../types";

const SubscriptionPanel: React.FC = () => {
  const { user } = useAuth();
  const { operations } = useOperations(user?.uid || '');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = async () => {
    if (!user) return;

    try {
      const subDoc = await getDoc(doc(firestore, 'subscriptions', user.uid));
      
      if (subDoc.exists()) {
        setSubscription(subDoc.data() as Subscription);
      } else {
        // Create default free subscription
        const defaultSub: Subscription = {
          uid: user.uid,
          plan: 'free',
          ordersUsed: operations.length,
          ordersLimit: 300,
          movementsUsed: operations.length,
          movementsLimit: 150,
          exportsUsed: 0,
          exportsLimit: 50,
          monthlyPayment: 0,
        };
        
        await setDoc(doc(firestore, 'subscriptions', user.uid), defaultSub);
        setSubscription(defaultSub);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionUsage = async () => {
    if (!user || !subscription) return;

    const updatedSub = {
      ...subscription,
      ordersUsed: operations.length,
      movementsUsed: operations.length,
    };

    try {
      await setDoc(doc(firestore, 'subscriptions', user.uid), updatedSub);
      setSubscription(updatedSub);
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  // Update usage when operations change
  useEffect(() => {
    if (subscription && operations.length !== subscription.ordersUsed) {
      updateSubscriptionUsage();
    }
  }, [operations.length, subscription?.ordersUsed]);

  const handlePayment = (method: string) => {
    alert(`Redirigiendo a ${method}... (Funcionalidad en desarrollo)`);
    // Aquí integrarías con PayPal, Binance Pay, etc.
  };

  const getUsagePercentage = (used: number, limit: number): number => {
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-yellow-400 text-xl">Cargando suscripción...</div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 text-lg">Error al cargar la suscripción</div>
      </div>
    );
  }

  const ordersPercentage = getUsagePercentage(subscription.ordersUsed, subscription.ordersLimit);
  const movementsPercentage = getUsagePercentage(subscription.movementsUsed, subscription.movementsLimit);
  const exportsPercentage = getUsagePercentage(subscription.exportsUsed, subscription.exportsLimit);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-yellow-400 mb-2">💳 Gestión de Suscripción</h1>
        <p className="text-gray-300">Administra tu plan y límites de uso</p>
      </div>

      {/* Current Plan */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-yellow-400">
              {subscription.plan === 'free' ? '🆓 Plan Gratuito' : '⭐ Plan Premium'}
            </h2>
            <p className="text-gray-300">
              {subscription.plan === 'free' 
                ? 'Perfecto para empezar tu journey en crypto trading'
                : 'Acceso completo a todas las funcionalidades'
              }
            </p>
          </div>
          {subscription.plan === 'free' && (
            <button
              onClick={() => alert('Upgrade a Premium próximamente')}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
            >
              🚀 Upgrade a Premium
            </button>
          )}
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Orders */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-white">📊 Órdenes</h3>
              <span className="text-sm text-gray-300">
                {subscription.ordersUsed} / {subscription.ordersLimit}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(ordersPercentage)}`}
                style={{ width: `${ordersPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {subscription.ordersLimit - subscription.ordersUsed} restantes
            </p>
          </div>

          {/* Movements */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-white">💱 Movimientos</h3>
              <span className="text-sm text-gray-300">
                {subscription.movementsUsed} / {subscription.movementsLimit}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(movementsPercentage)}`}
                style={{ width: `${movementsPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {subscription.movementsLimit - subscription.movementsUsed} restantes
            </p>
          </div>

          {/* Exports */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-white">📋 Exportaciones</h3>
              <span className="text-sm text-gray-300">
                {subscription.exportsUsed} / {subscription.exportsLimit}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(exportsPercentage)}`}
                style={{ width: `${exportsPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {subscription.exportsLimit - subscription.exportsUsed} restantes
            </p>
          </div>
        </div>
      </div>

      {/* Upgrade Section */}
      {subscription.plan === 'free' && (
        <div className="bg-gradient-to-r from-yellow-900 to-yellow-800 rounded-lg p-8 mb-8">
          <div className="text-center">
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-3xl font-bold text-yellow-100 mb-4">¿Necesitas más límites?</h2>
            <p className="text-yellow-200 mb-6 max-w-2xl mx-auto">
              Upgrade a Premium y desbloquea límites ilimitados, exportaciones avanzadas, 
              análisis detallados y soporte prioritario.
            </p>
            
            <div className="bg-black bg-opacity-30 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-xl font-bold text-yellow-100 mb-4">Plan Premium</h3>
              <div className="text-3xl font-bold text-yellow-400 mb-2">€15 / mes</div>
              <ul className="text-yellow-200 text-sm space-y-2 mb-6">
                <li>✅ Operaciones ilimitadas</li>
                <li>✅ Exportaciones ilimitadas</li>
                <li>✅ Análisis avanzados</li>
                <li>✅ Soporte prioritario</li>
                <li>✅ API access</li>
              </ul>
              <button
                onClick={() => handlePayment('Premium')}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                🎯 Actualizar a Premium
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">💳 Métodos de Pago</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handlePayment('PayPal')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200"
          >
            💳 PayPal
          </button>
          
          <button
            onClick={() => handlePayment('Binance Pay')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200"
          >
            🪙 Binance Pay
          </button>
          
          <button
            onClick={() => handlePayment('Blockchain Pay')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200"
          >
            ⛓️ Blockchain Pay
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">💰 Resumen de Facturación</h3>
          <div className="space-y-2 text-gray-300">
            <div className="flex justify-between">
              <span>Costo Mensual:</span>
              <span className="font-semibold">
                {subscription.plan === 'free' ? '€0.00' : '€15.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Descuentos:</span>
              <span className="font-semibold">€0.00</span>
            </div>
            <div className="flex justify-between border-t border-gray-600 pt-2">
              <span className="font-semibold">Total a Pagar:</span>
              <span className="font-bold text-yellow-400">
                {subscription.plan === 'free' ? '€0.00' : '€15.00'}
              </span>
            </div>
          </div>
          
          {subscription.nextPaymentDate && (
            <div className="mt-3 text-sm text-gray-400">
              Próximo pago: {subscription.nextPaymentDate}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPanel;