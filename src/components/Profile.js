import React, { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export default function Profile() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
        {/* Imagen de perfil */}
        <div className="flex flex-col items-center">
          <img
            className="w-24 h-24 rounded-full shadow-lg"
            src={user?.photoURL || "https://via.placeholder.com/150"}
            alt="Profile"
          />
          <h2 className="mt-4 text-xl font-semibold text-gray-800">
            {user?.displayName || "Usuario"}
          </h2>
          <p className="text-gray-500">{user?.email}</p>
        </div>

        {/* Botones de acciones */}
        <div className="mt-6 space-y-4">
          {/* Historial */}
          <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Historial
          </button>

          {/* Ajustes */}
          <button className="w-full flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg shadow hover:bg-gray-300">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-1.14 1.603-1.14 1.902 0a1.724 1.724 0 002.573 1.02c.964-.556 2.16.64 1.605 1.605a1.724 1.724 0 001.02 2.573c1.14.3 1.14 1.603 0 1.902a1.724 1.724 0 00-1.02 2.573c.556.964-.64 2.16-1.605 1.605a1.724 1.724 0 00-2.573 1.02c-.3 1.14-1.603 1.14-1.902 0a1.724 1.724 0 00-2.573-1.02c-.964.556-2.16-.64-1.605-1.605a1.724 1.724 0 00-1.02-2.573c-1.14-.3-1.14-1.603 0-1.902a1.724 1.724 0 001.02-2.573c-.556-.964.64-2.16 1.605-1.605.97.561 2.27.12 2.573-1.02z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Ajustes
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10V5m0 0a7 7 0 00-7 7h0a7 7 0 007 7h0"
              />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}