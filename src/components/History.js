// src/components/History.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase"; // 👈 ajusta la ruta si tu firebase.js está en otro lado
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";

const getProfitabilityColor = (value) => {
  if (value > 0) return "text-green-400";
  if (value < 0) return "text-red-400";
  return "text-gray-400";
};

const History = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "history"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "history", id));
      console.log("Operación eliminada:", id);
    } catch (error) {
      console.error("Error al borrar:", error);
    }
  };

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-4">Historial</h2>

      {history.length === 0 ? (
        <p className="text-gray-400">No hay operaciones registradas aún.</p>
      ) : (
        <div className="space-y-4">
          {history.map((result) => {
            const diferencia = result.revenue - result.investment;

            return (
              <div
                key={result.id}
                className={`rounded-lg p-4 border ${
                  diferencia > 0
                    ? "bg-green-900/20 border-green-600"
                    : diferencia < 0
                    ? "bg-red-900/20 border-red-600"
                    : "bg-gray-900/20 border-gray-600"
                }`}
              >
                {/* Info principal */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-300">
                      <span className="font-semibold">Exchange 1:</span>{" "}
                      {result.exchange1}
                    </p>
                    <p className="text-gray-300">
                      <span className="font-semibold">Exchange 2:</span>{" "}
                      {result.exchange2}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(result.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Borrar
                  </button>
                </div>

                {/* Detalles */}
                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                  <div>
                    <span className="text-gray-400">ROI:</span>
                    <span
                      className={`ml-2 font-medium ${getProfitabilityColor(
                        result.profit_percentage
                      )}`}
                    >
                      {result.profit_percentage.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Diferencia:</span>
                    <span
                      className={`ml-2 font-medium ${getProfitabilityColor(
                        diferencia
                      )}`}
                    >
                      {diferencia.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;