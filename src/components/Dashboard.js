import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Dashboard() {
  const [stats, setStats] = useState({
    total_operations: 0,
    total_profit_usdt: 0,
    success_rate: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "operations"));
        let totalOperations = 0;
        let totalProfitUSDT = 0;
        let successfulOperations = 0;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          totalOperations++;
          totalProfitUSDT += data.profit_usdt || 0;
          if (data.success) {
            successfulOperations++;
          }
        });

        setStats({
          total_operations: totalOperations,
          total_profit_usdt: totalProfitUSDT,
          success_rate:
            totalOperations > 0
              ? (successfulOperations / totalOperations) * 100
              : 0,
        });
      } catch (error) {
        console.error("Error fetching operations:", error);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value, currency) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Grid con 3 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-400 text-sm font-medium">
              Total Operaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.total_operations}
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Operaciones realizadas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 text-sm font-medium">
              Ganancia USDT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(stats.total_profit_usdt, "USD")}
            </div>
            <p className="text-gray-400 text-xs mt-1">Total en USDT</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-400 text-sm font-medium">
              Tasa de Éxito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.success_rate.toFixed(1)}%
            </div>
            <p className="text-gray-400 text-xs mt-1">
              Operaciones exitosas
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;