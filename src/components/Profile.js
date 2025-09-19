import React from "react";
import { useAuth } from "../contexts/AuthContext";

const Profile = ({ onBack }) => {
  const { user } = useAuth();

  // Separar nombre y apellido si existe displayName
  const [firstName, lastName] = user?.displayName
    ? user.displayName.split(" ")
    : ["Usuario", ""];

  return (
    <div className="p-4 text-white min-h-screen bg-black">
      {/* Botón volver */}
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-gray-800 text-yellow-400 rounded hover:bg-gray-700"
      >
        ⬅ Volver al Dashboard
      </button>

      {/* Datos del usuario */}
      <div className="flex items-center mb-6">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-yellow-400 mr-4">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center text-yellow-400 font-bold text-xl">
              {firstName.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold">
            {firstName} {lastName}
          </h2>
          <p className="text-gray-400">{user?.email}</p>
        </div>
      </div>

      {/* Limitaciones del plan */}
      <h3 className="text-lg font-bold mb-3 text-yellow-400">Limitaciones</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold">200</p>
          <p className="text-gray-400">Órdenes</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold">100</p>
          <p className="text-gray-400">Movimientos</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold">40</p>
          <p className="text-gray-400">Exportaciones</p>
        </div>
      </div>

      {/* Planes Premium */}
      <h3 className="text-lg font-bold mb-3 text-yellow-400">Planes Premium</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plan Básico */}
        <div className="bg-gray-900 p-6 rounded-lg shadow text-center">
          <h4 className="text-xl font-bold mb-2">Plan Básico</h4>
          <p className="text-3xl font-bold text-green-400 mb-4">$5</p>
          <ul className="mb-4 text-gray-300 text-sm">
            <li>✔ 500 Órdenes</li>
            <li>✔ 300 Movimientos</li>
            <li>✔ 100 Exportaciones</li>
          </ul>
          <button className="px-4 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400">
            Actualizar
          </button>
        </div>

        {/* Plan Pro */}
        <div className="bg-gray-900 p-6 rounded-lg shadow text-center border-2 border-yellow-400">
          <h4 className="text-xl font-bold mb-2">Plan Pro</h4>
          <p className="text-3xl font-bold text-green-400 mb-4">$15</p>
          <ul className="mb-4 text-gray-300 text-sm">
            <li>✔ 2000 Órdenes</li>
            <li>✔ 1000 Movimientos</li>
            <li>✔ 500 Exportaciones</li>
            <li>✔ Soporte prioritario</li>
          </ul>
          <button className="px-4 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400">
            Actualizar
          </button>
        </div>

        {/* Plan Premium */}
        <div className="bg-gray-900 p-6 rounded-lg shadow text-center">
          <h4 className="text-xl font-bold mb-2">Plan Premium</h4>
          <p className="text-3xl font-bold text-green-400 mb-4">$30</p>
          <ul className="mb-4 text-gray-300 text-sm">
            <li>✔ Órdenes ilimitadas</li>
            <li>✔ Movimientos ilimitados</li>
            <li>✔ Exportaciones ilimitadas</li>
            <li>✔ Asesoría personalizada</li>
          </ul>
          <button className="px-4 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400">
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;