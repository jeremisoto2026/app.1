import React from "react";
import { useAuth } from "../contexts/AuthContext";

const Profile = ({ onBack }) => {
  const { user } = useAuth();

  // Datos ficticios de progreso (después se conecta con BD)
  const ordersUsed = 20;
  const ordersLimit = 200;
  const exportsUsed = 5;
  const exportsLimit = 40;

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

      {/* Plan actual y limitaciones */}
      <h3 className="text-lg font-bold mb-3 text-yellow-400">Plan Actual</h3>
      <div className="bg-gray-900 p-6 rounded-lg shadow mb-8">
        <h4 className="text-xl font-bold mb-2 text-white">Gratuito</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold">
              {ordersUsed} / {ordersLimit}
            </p>
            <p className="text-gray-400">Órdenes</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <p className="text-2xl font-bold">
              {exportsUsed} / {exportsLimit}
            </p>
            <p className="text-gray-400">Exportaciones</p>
          </div>
        </div>
        <div className="mt-6 text-center">
          <button className="px-6 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400">
            Actualizar tus límites
          </button>
        </div>
      </div>

      {/* Plan Premium */}
      <h3 className="text-lg font-bold mb-3 text-yellow-400">Plan Premium</h3>
      <div className="bg-gray-900 p-6 rounded-lg shadow mb-8 text-center">
        <h4 className="text-xl font-bold mb-2">Premium</h4>
        <p className="text-3xl font-bold text-green-400 mb-4">$13 / mes</p>
        <p className="text-gray-300 mb-6 text-sm">
          Accede a órdenes, exportaciones y herramientas sin límites.
        </p>

        {/* Métodos de pago */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 cursor-pointer">
            <p className="text-lg font-bold text-blue-400">PayPal</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 cursor-pointer">
            <p className="text-lg font-bold text-yellow-400">Binance Pay</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 cursor-pointer">
            <p className="text-lg font-bold text-green-400">Blockchain Pay</p>
          </div>
        </div>

        <button className="px-6 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400">
          Suscribirme
        </button>
      </div>

      {/* Soporte */}
      <h3 className="text-lg font-bold mb-3 text-yellow-400">Soporte</h3>
      <div className="bg-gray-900 p-6 rounded-lg shadow text-center">
        <p className="text-gray-300 mb-4">
          ¿Necesitas ayuda? Contacta con nuestro equipo de soporte.
        </p>
        <button className="px-6 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400">
          Contactar Soporte
        </button>
      </div>
    </div>
  );
};

export default Profile;