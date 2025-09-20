import React, { useEffect, useState } from "react";
import { db } from "../contexts/database";
import { useAuth } from "../contexts/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Profile() {
  const { currentUser } = useAuth();
  const [operationsCount, setOperationsCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;

    const fetchOperations = async () => {
      try {
        const q = query(
          collection(db, "operations"),
          where("userId", "==", currentUser.uid)
        );
        const snapshot = await getDocs(q);
        setOperationsCount(snapshot.size);
      } catch (error) {
        console.error("Error al obtener operaciones:", error);
      }
    };

    fetchOperations();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-600">
        Cargando perfil...
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
          {currentUser.email?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {currentUser.email}
          </h1>
          <p className="text-sm text-gray-500">UID: {currentUser.uid}</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-gray-50 p-4 rounded-lg border">
          <p className="text-2xl font-bold text-blue-600">{operationsCount}</p>
          <p className="text-sm text-gray-500">Operaciones</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border">
          <p className="text-2xl font-bold text-green-600">✔</p>
          <p className="text-sm text-gray-500">Verificado</p>
        </div>
      </div>
    </div>
  );
}