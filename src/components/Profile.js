// src/pages/Profile.js
import React from "react";
import { useAuth } from "../contexts/AuthContext";

const Profile = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>No hay usuario autenticado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-6">
      <h2 className="text-2xl font-bold mb-6">👤 Perfil de Usuario</h2>

      <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
        {/* Email */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm">Correo</p>
          <p className="text-lg font-semibold">{user.email}</p>
        </div>

        {/* UID */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm">ID de Usuario</p>
          <p className="text-lg font-semibold break-all">{user.uid}</p>
        </div>

        {/* Botón Cerrar Sesión */}
        <button
          onClick={() => user && user.auth.signOut()}
          className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default Profile;