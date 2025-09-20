// src/pages/Profile.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserOperations, getUserPreferences } from "../services/database";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, signOut } = useAuth();
  const [operationCount, setOperationCount] = useState(0);
  const [exportCount, setExportCount] = useState(0);
  const [plan, setPlan] = useState("Gratuito");
  const [limits, setLimits] = useState({ operations: 200, exports: 40 });
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Obtener operaciones
        const operations = await getUserOperations(user.uid);
        setOperationCount(operations.length);

        // Obtener preferencias del usuario (plan y límites)
        const prefs = await getUserPreferences(user.uid);
        if (prefs?.plan) setPlan(prefs.plan);
        if (prefs?.limits) setLimits(prefs.limits);
        if (prefs?.exportsUsed) setExportCount(prefs.exportsUsed);
      } catch (error) {
        console.error("Error cargando perfil:", error);
      }
    };

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <p>Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Botón volver */}
      <button
        onClick={() => navigate("/dashboard")}
        className="bg-gray-700 text-white px-4 py-2 rounded-md mb-6 hover:bg-gray-600"
      >
        Volver al Dashboard
      </button>

      {/* Avatar + nombre + email */}
      <div className="flex flex-col items-center mb-6">
        <img
          src={user.photoURL || "https://i.pravatar.cc/150"}
          alt="avatar"
          className="w-24 h-24 rounded-full border-4 border-yellow-500 mb-3"
        />
        <h1 className="text-2xl font-bold">{user.displayName || "Usuario"}</h1>
        <p className="text-gray-400">{user.email}</p>
      </div>

      {/* Plan actual */}
      <div className="bg-gray-900 rounded-lg p-5 mb-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-3">Plan Actual</h2>
        <p className="text-lg font-semibold mb-2">{plan}</p>

        {/* Órdenes */}
        <div className="bg-gray-800 p-4 rounded-md mb-3 text-center">
          <p className="text-xl font-bold text-yellow-400">
            {operationCount} / {limits.operations}
          </p>
          <p className="text-gray-400">Órdenes</p>
        </div>

        {/* Exportaciones */}
        <div className="bg-gray-800 p-4 rounded-md text-center">
          <p className="text-xl font-bold text-yellow-400">
            {exportCount} / {limits.exports}
          </p>
          <p className="text-gray-400">Exportaciones</p>
        </div>

        {/* Botón actualizar límites */}
        <button className="mt-4 w-full bg-yellow-500 text-black py-2 rounded-md font-bold hover:bg-yellow-400">
          Actualizar tus límites
        </button>
      </div>

      {/* Plan Premium */}
      <div className="bg-gray-900 rounded-lg p-5 mb-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-3">Plan Premium</h2>
        <p className="mb-2">Accede a operaciones y exportaciones ilimitadas.</p>
        <p className="mb-4 text-gray-400">
          Métodos de pago: Paypal | Binance Pay | Blockchain Pay
        </p>
        <button className="w-full bg-yellow-500 text-black py-2 rounded-md font-bold hover:bg-yellow-400">
          Actualizar a Premium - $13/mes
        </button>
      </div>

      {/* Soporte */}
      <div className="bg-gray-900 rounded-lg p-5 mb-6 text-center">
        <h2 className="text-xl font-bold text-yellow-400 mb-3">Soporte</h2>
        <button className="text-blue-400 underline">Contactar Soporte</button>
      </div>

      {/* Botón cerrar sesión */}
      <button
        onClick={handleLogout}
        className="w-full bg-red-600 py-2 rounded-md font-bold hover:bg-red-500"
      >
        Cerrar Sesión
      </button>
    </div>
  );
}