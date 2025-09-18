import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const Dashboard = () => {
  const [totalOperations, setTotalOperations] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [monthlyPerformance, setMonthlyPerformance] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "operations"));
        const operations = [];
        querySnapshot.forEach((doc) => {
          operations.push({ id: doc.id, ...doc.data() });
        });

        if (operations.length > 0) {
          setTotalOperations(operations.length);

          // Calcular ganancia total
          const totalProfitCalc = operations.reduce(
            (sum, op) => sum + (parseFloat(op.revenue || 0) - parseFloat(op.investment || 0)),
            0
          );
          setTotalProfit(totalProfitCalc);

          // Calcular tasa de éxito
          const successfulOps = operations.filter((op) => op.success === true).length;
          setSuccessRate(((successfulOps / operations.length) * 100).toFixed(1));

          // Calcular rendimiento mensual (últimos 30 días)
          const last30Days = new Date();
          last30Days.setDate(last30Days.getDate() - 30);
          const monthlyOps = operations.filter((op) => {
            const opDate = op.date ? new Date(op.date) : null;
            return opDate && opDate >= last30Days;
          });
          const monthlyProfit = monthlyOps.reduce(
            (sum, op) => sum + (parseFloat(op.revenue || 0) - parseFloat(op.investment || 0)),
            0
          );
          setMonthlyPerformance(monthlyProfit);
        }
      } catch (error) {
        console.error("Error al obtener datos del dashboard:", error);
      }
    };

    fetchData();
  }, []);

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
        <p className="text-2xl font-bold">${totalProfit.toFixed(2)}</p>
        <p className="text-gray-400 text-sm">Total en USDT</p>
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