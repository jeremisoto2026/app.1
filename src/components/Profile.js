import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUserOperations } from "../services/database";
const Profile = () => {
  const { user } = useAuth();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOperations = async () => {
      if (!user) return;
      try {
        const ops = await getUserOperations(user.uid);
        setOperations(ops);
      } catch (error) {
        console.error("Error fetching operations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOperations();
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-lg text-gray-700">Debes iniciar sesión</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      {/* Tarjeta del perfil */}
      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-3xl">
        <div className="flex items-center space-x-4">
          <img
            src={user.photoURL || "https://ui-avatars.com/api/?name=" + user.displayName}
            alt="Avatar"
            className="w-20 h-20 rounded-full border-4 border-indigo-500 shadow-md"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {user.displayName || "Usuario"}
            </h1>
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8">
          <div className="bg-indigo-50 rounded-xl p-4 shadow text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {loading ? "..." : operations.length}
            </p>
            <p className="text-gray-600 text-sm">Operaciones</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 shadow text-center">
            <p className="text-2xl font-bold text-green-600">+0</p>
            <p className="text-gray-600 text-sm">Ganancias</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 shadow text-center">
            <p className="text-2xl font-bold text-yellow-600">0%</p>
            <p className="text-gray-600 text-sm">Éxito</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 shadow text-center">
            <p className="text-2xl font-bold text-red-600">0</p>
            <p className="text-gray-600 text-sm">Pérdidas</p>
          </div>
        </div>

        {/* Historial */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Historial de Operaciones
          </h2>
          {loading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : operations.length === 0 ? (
            <p className="text-gray-500">No hay operaciones registradas</p>
          ) : (
            <ul className="space-y-3">
              {operations.map((op) => (
                <li
                  key={op.id}
                  className="bg-gray-50 p-4 rounded-lg shadow flex justify-between"
                >
                  <span className="font-medium text-gray-700">
                    {op.operation_type}
                  </span>
                  <span className="text-gray-500">{op.crypto_amount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;