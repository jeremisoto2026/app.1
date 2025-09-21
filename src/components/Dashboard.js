import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  RocketLaunchIcon,
  CheckBadgeIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserIcon
} from "@heroicons/react/24/outline";

const Dashboard = ({ onOpenProfile }) => {
  const { user } = useAuth();
  const [totalOperations, setTotalOperations] = useState(0);
  const [totalProfitUsdt, setTotalProfitUsdt] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [monthlyPerformance, setMonthlyPerformance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        setError("User not authenticated.");
        return;
      }

      try {
        const operationsRef = collection(db, "users", user.uid, "operations");
        const q = query(operationsRef, orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        const operations = [];
        querySnapshot.forEach((doc) => {
          operations.push({ id: doc.id, ...doc.data() });
        });

        if (operations.length > 0) {
          setTotalOperations(operations.length);

          let totalCryptoBought = 0;
          let totalCryptoSold = 0;
          let monthlyCryptoBought = 0;
          let monthlyCryptoSold = 0;

          const last30Days = new Date();
          last30Days.setDate(last30Days.getDate() - 30);

          operations.forEach((op) => {
            const cryptoAmount = parseFloat(op.crypto_amount || 0);
            const opDate =
              op.timestamp && typeof op.timestamp.toDate === "function"
                ? op.timestamp.toDate()
                : new Date();

            if (op.operation_type === "Venta") {
              totalCryptoSold += cryptoAmount;
            } else if (op.operation_type === "Compra") {
              totalCryptoBought += cryptoAmount;
            }

            if (opDate >= last30Days) {
              if (op.operation_type === "Venta") {
                monthlyCryptoSold += cryptoAmount;
              } else if (op.operation_type === "Compra") {
                monthlyCryptoBought += cryptoAmount;
              }
            }
          });

          const totalProfitUsdtCalc = totalCryptoBought - totalCryptoSold;
          const monthlyPerformanceCalc =
            monthlyCryptoBought - monthlyCryptoSold;

          const successRateCalc = totalProfitUsdtCalc > 0 ? 100 : 0;

          setTotalProfitUsdt(totalProfitUsdtCalc);
          setSuccessRate(successRateCalc);
          setMonthlyPerformance(monthlyPerformanceCalc);
          setLoading(false);
        } else {
          setTotalOperations(0);
          setTotalProfitUsdt(0);
          setSuccessRate(0);
          setMonthlyPerformance(0);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Error al cargar los datos del dashboard.");
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center p-6 bg-gray-800 rounded-xl max-w-md mx-4">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-red-400 text-xl font-semibold mb-2">Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm">Resumen de tu actividad</p>
        </div>
        
        <button
          onClick={onOpenProfile}
          className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-yellow-500 hover:scale-105 transition-all duration-200 group"
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-yellow-500 font-bold group-hover:bg-gray-700 transition-colors">
              <UserIcon className="w-5 h-5" />
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all"></div>
        </button>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {/* Tarjeta: Total Operaciones */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 shadow-lg border border-gray-700 hover:border-yellow-500 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 font-medium">Total Operaciones</h3>
            <div className="p-2 bg-yellow-500 bg-opacity-10 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-yellow-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mb-1">{totalOperations}</p>
          <p className="text-gray-500 text-sm">Operaciones realizadas</p>
        </div>

        {/* Tarjeta: Ganancia USDT */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 shadow-lg border border-gray-700 hover:border-green-500 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 font-medium">Ganancia USDT</h3>
            <div className="p-2 bg-green-500 bg-opacity-10 rounded-lg">
              <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mb-1">
            ${totalProfitUsdt.toFixed(2)}
          </p>
          <p className="text-gray-500 text-sm">Total en USDT</p>
        </div>

        {/* Tarjeta: Tasa de Éxito */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 shadow-lg border border-gray-700 hover:border-purple-500 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 font-medium">Tasa de Éxito</h3>
            <div className="p-2 bg-purple-500 bg-opacity-10 rounded-lg">
              <CheckBadgeIcon className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mb-1">{successRate}%</p>
          <p className="text-gray-500 text-sm">Operaciones exitosas</p>
        </div>

        {/* Tarjeta: Rendimiento Mensual */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 shadow-lg border border-gray-700 hover:border-blue-500 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 font-medium">Rendimiento Mensual</h3>
            <div className="p-2 bg-blue-500 bg-opacity-10 rounded-lg">
              <ArrowTrendingUpIcon className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold mb-1">
            ${monthlyPerformance.toFixed(2)}
          </p>
          <div className="flex items-center">
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-md ${
                monthlyPerformance >= 0
                  ? "bg-green-900 text-green-400"
                  : "bg-red-900 text-red-400"
              }`}
            >
              {monthlyPerformance >= 0 ? "+ Positivo" : "Negativo"}
            </span>
            <p className="text-gray-500 text-sm ml-2">Últimos 30 días</p>
          </div>
        </div>
      </div>

      {/* Sección: Planes Premium */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
        <div className="flex items-center mb-6">
          <RocketLaunchIcon className="h-6 w-6 text-yellow-500 mr-2" />
          <h2 className="text-xl font-bold">Planes Premium</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Plan Premium Mensual */}
          <div
            onClick={onOpenProfile}
            className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-yellow-500 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold group-hover:text-yellow-400 transition-colors">
                  Plan Premium
                </h3>
                <p className="text-sm text-gray-400">Ideal para traders activos</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">
                  $13 <span className="text-sm text-gray-400">/mes</span>
                </p>
              </div>
            </div>

            <div className="mb-4 text-sm text-gray-300">
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                  Operaciones ilimitadas
                </li>
                <li className="flex items-center">
                  <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                  Exportaciones ilimitadas
                </li>
                <li className="flex items-center">
                  <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                  Soporte prioritario
                </li>
              </ul>
            </div>
            
            <button className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium rounded-lg transition-colors text-center">
              Seleccionar plan
            </button>
          </div>

          {/* Card: Plan Premium Anual */}
          <div
            onClick={onOpenProfile}
            className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-purple-500 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
              POPULAR
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold group-hover:text-purple-400 transition-colors">
                  Plan Premium Anual
                </h3>
                <p className="text-sm text-gray-400">Para traders serios</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">
                  $125 <span className="text-sm text-gray-400">/año</span>
                </p>
                <p className="text-xs text-green-400 font-semibold">Ahorra ~20%</p>
              </div>
            </div>

            <div className="mb-4 text-sm text-gray-300">
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                  Operaciones ilimitadas
                </li>
                <li className="flex items-center">
                  <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                  Exportaciones ilimitadas
                </li>
                <li className="flex items-center">
                  <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                  Soporte prioritario
                </li>
                <li className="flex items-center">
                  <CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />
                  Alertas personalizadas
                </li>
              </ul>
            </div>
            
            <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors text-center">
              Seleccionar plan
            </button>
          </div>
        </div>
      </div>

      {/* Footer o información adicional */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>Actualizado en tiempo real • Para más detalles visita tu perfil</p>
      </div>
    </div>
  );
};

export default Dashboard;