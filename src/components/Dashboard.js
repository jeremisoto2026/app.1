import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const Dashboard = ({ onOpenProfile }) => {
  const { user } = useAuth();
  const [totalOperations, setTotalOperations] = useState(0);
  const [totalProfitUsdt, setTotalProfitUsdt] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [monthlyPerformance, setMonthlyPerformance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

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

            // 👇 Fallback: si no hay timestamp, se usa la fecha actual
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
        setError(
          "Error al cargar los datos del dashboard. Por favor, revisa la consola para más detalles."
        );
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
    <div className="p-4 text-white relative min-h-screen">
      {/* Botón perfil arriba a la derecha */}
      <div className="absolute top-4 right-4">
        <button
          onClick={onOpenProfile}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-yellow-400 hover:scale-105 transition"
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center text-yellow-400 font-bold">
              {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
            </div>
          )}
        </button>
      </div>

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

      {/* Tasa de Éxito */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4 shadow">
        <h3 className="text-purple-400 font-medium">Tasa de Éxito</h3>
        <p className="text-2xl font-bold">{successRate}%</p>
        <p className="text-gray-400 text-sm">Operaciones exitosas</p>
      </div>

      {/* Rendimiento Mensual */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4 shadow mb-8">
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

      {/* 📌 Planes Premium */}
      <h2 className="text-2xl font-bold mb-6 text-yellow-400">Planes Premium</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Plan Mensual */}
        <div
          className={`p-6 rounded-lg shadow-lg border ${
            selectedPlan === "monthly"
              ? "border-yellow-400 bg-gray-800"
              : "border-gray-700 bg-gray-900"
          } transition cursor-pointer`}
          onClick={() => setSelectedPlan("monthly")}
        >
          <h3 className="text-xl font-bold text-white mb-2">Premium Mensual</h3>
          <p className="text-gray-400 mb-4">Acceso ilimitado mes a mes.</p>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold text-yellow-400">$15</span>
            <span className="text-gray-500 line-through">$20</span>
          </div>
          <button
            className={`w-full py-2 rounded font-semibold ${
              selectedPlan === "monthly"
                ? "bg-yellow-400 text-black"
                : "bg-gray-700 text-white hover:bg-yellow-500 hover:text-black"
            }`}
          >
            {selectedPlan === "monthly" ? "✔ Plan Seleccionado" : "Seleccionar Plan"}
          </button>
        </div>

        {/* Plan Anual */}
        <div
          className={`p-6 rounded-lg shadow-lg border ${
            selectedPlan === "yearly"
              ? "border-yellow-400 bg-gray-800"
              : "border-gray-700 bg-gray-900"
          } transition cursor-pointer`}
          onClick={() => setSelectedPlan("yearly")}
        >
          <h3 className="text-xl font-bold text-white mb-2">Premium Anual</h3>
          <p className="text-gray-400 mb-4">
            20% de descuento pagando anual.
          </p>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold text-yellow-400">$125</span>
            <span className="text-gray-500 line-through">$160</span>
          </div>
          <button
            className={`w-full py-2 rounded font-semibold ${
              selectedPlan === "yearly"
                ? "bg-yellow-400 text-black"
                : "bg-gray-700 text-white hover:bg-yellow-500 hover:text-black"
            }`}
          >
            {selectedPlan === "yearly" ? "✔ Plan Seleccionado" : "Seleccionar Plan"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;