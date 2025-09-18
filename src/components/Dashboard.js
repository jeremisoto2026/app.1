import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const [totalOperations, setTotalOperations] = useState(0);
  const [totalProfitUsdt, setTotalProfitUsdt] = useState(0);
  const [totalProfitEur, setTotalProfitEur] = useState(0);
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
          let totalFiatSpent = 0;
          let totalFiatReceived = 0;
          let successfulOpsCount = 0;
          
          const last30Days = new Date();
          last30Days.setDate(last30Days.getDate() - 30);
          let monthlyProfit = 0;

          operations.forEach(op => {
            const cryptoAmount = parseFloat(op.crypto_amount);
            const fiatAmount = parseFloat(op.fiat_amount);
            const profit = parseFloat(op.profit); // Asegúrate de que este campo exista o calcula la ganancia de otra forma.

            if (op.operation_type === 'Venta') {
                totalCryptoSold += cryptoAmount;
                totalFiatReceived += fiatAmount;
                if (profit > 0) successfulOpsCount++;
                if (op.timestamp && op.timestamp.toDate() >= last30Days) {
                    monthlyProfit += profit;
                }
            } else if (op.operation_type === 'Compra') {
                totalCryptoBought += cryptoAmount;
                totalFiatSpent += fiatAmount;
                if (profit > 0) successfulOpsCount++;
                if (op.timestamp && op.timestamp.toDate() >= last30Days) {
                    monthlyProfit += profit;
                }
            }
          });

          // Asegúrate de que los campos existan en tu base de datos para que esto funcione
          const totalProfitUsdtCalc = totalCryptoSold - totalCryptoBought;
          const totalProfitEurCalc = totalFiatReceived - totalFiatSpent;

          setTotalProfitUsdt(totalProfitUsdtCalc);
          setTotalProfitEur(totalProfitEurCalc);
          setSuccessRate(((successfulOpsCount / operations.length) * 100).toFixed(1));
          setMonthlyPerformance(monthlyProfit);

        } else {
          setTotalOperations(0);
          setTotalProfitUsdt(0);
          setTotalProfitEur(0);
          setSuccessRate(0);
          setMonthlyPerformance(0);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Error al cargar los datos del dashboard. Por favor, revisa la consola para más detalles.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-red-400 text-xl mb-2">Error</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 text-white">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      {/* Total Operaciones */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4 shadow">
        <h3 className="text-yellow-400 font-medium">Total Operaciones</h3>
        <p className="text-2xl font-bold">{totalOperations}</p>
        <p className="text-gray-400 text-sm">Operaciones realizadas</p>
      </div>

      {/* Ganancia USDT */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4 shadow">
        <h3 className="text-green-400 font-medium">Ganancia USDT</h3>
        <p className="text-2xl font-bold">${totalProfitUsdt.toFixed(2)}</p>
        <p className="text-gray-400 text-sm">Total en USDT</p>
      </div>
      
      {/* Ganancia EUR */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4 shadow">
        <h3 className="text-blue-400 font-medium">Ganancia EUR</h3>
        <p className="text-2xl font-bold">€{totalProfitEur.toFixed(2)}</p>
        <p className="text-gray-400 text-sm">Total en EUR</p>
      </div>

      {/* Tasa de Éxito */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4 shadow">
        <h3 className="text-purple-400 font-medium">Tasa de Éxito</h3>
        <p className="text-2xl font-bold">{successRate}%</p>
        <p className="text-gray-400 text-sm">Operaciones exitosas</p>
      </div>

      {/* Rendimiento Mensual */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4 shadow">
        <h3 className="text-yellow-400 font-medium flex items-center">
          📈 Rendimiento Mensual
        </h3>
        <p className="text-2xl font-bold">${monthlyPerformance.toFixed(2)}</p>
        <p className="text-gray-400 text-sm">Últimos 30 días</p>
        <span
          className={`mt-2 inline-block px-3 py-1 rounded text-sm font-medium ${
            monthlyPerformance >= 0 ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {monthlyPerformance >= 0 ? "✅ Positivo" : "❌ Negativo"}
        </span>
      </div>
    </div>
  );
};

export default Dashboard;