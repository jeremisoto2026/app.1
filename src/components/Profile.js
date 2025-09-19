// src/components/Profile.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const OWNER_UID = "TU_UID_DE_FIREBASE"; // ⚡ Reemplaza con tu UID

const Profile = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [operationsCount, setOperationsCount] = useState(0);
  const [exportsCount, setExportsCount] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!user) {
          setError("Usuario no autenticado.");
          setLoading(false);
          return;
        }

        // Leer info del usuario en Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserData(userSnap.data());
          setOperationsCount(userSnap.data().operationsCount || 0);
          setExportsCount(userSnap.data().exportsCount || 0);
        } else {
          setUserData({});
        }

        setLoading(false);
      } catch (err) {
        console.error("Error al cargar datos del perfil:", err);
        setError("No se pudieron cargar los datos del usuario.");
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">Cargando perfil...</div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-red-400">{error}</div>;
  }

  if (!user) {
    return <div className="p-6 text-center text-gray-400">No hay usuario activo.</div>;
  }

  // Detectar plan
  let currentPlan = userData?.plan || "free";
  if (user.uid === OWNER_UID) {
    currentPlan = "exclusive";
  }

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-bold mb-6">Perfil del Usuario</h2>

      {/* Info básica */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 shadow">
        <div className="flex items-center space-x-4">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt="Foto de perfil"
              className="w-16 h-16 rounded-full border border-gray-700"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl">
              👤
            </div>
          )}
          <div>
            <h3 className="text-lg font-medium">
              {user.displayName || "Usuario"}
            </h3>
            <p className="text-gray-400 text-sm">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Tipo de Plan */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 shadow">
        <h3 className="text-yellow-400 font-medium mb-2">Tipo de Plan</h3>
        {currentPlan === "exclusive" ? (
          <div>
            <p className="text-xl font-bold text-yellow-300">🏆 Exclusivo (Dueño)</p>
            <p className="text-green-400 mt-2">Órdenes: Ilimitadas</p>
            <p className="text-green-400">Exportaciones: Ilimitadas</p>
          </div>
        ) : currentPlan === "premium" ? (
          <div>
            <p className="text-xl font-bold text-green-400">⭐ Premium</p>
            <p className="text-green-400 mt-2">Órdenes: Ilimitadas</p>
            <p className="text-green-400">Exportaciones: Ilimitadas</p>
          </div>
        ) : (
          <div>
            <p className="text-xl font-bold text-gray-300">🔓 Gratuito</p>
            <p className="text-gray-400 mt-2">
              Órdenes: {operationsCount}/200
            </p>
            <p className="text-gray-400">
              Exportaciones: {exportsCount}/40
            </p>
            <button className="mt-3 px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-400">
              Actualizar tus límites
            </button>
          </div>
        )}
      </div>

      {/* Plan Premium (solo si no eres dueño y no tienes premium) */}
      {currentPlan === "free" && (
        <div className="bg-gray-900 rounded-lg p-4 mb-6 shadow">
          <h3 className="text-yellow-400 font-medium mb-4">Plan Premium</h3>
          <p className="text-2xl font-bold text-green-400 mb-4">
            $13 / mes
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-blue-600 py-2 rounded-lg hover:bg-blue-500 font-medium">
              PayPal
            </button>
            <button className="bg-yellow-400 text-black py-2 rounded-lg hover:bg-yellow-300 font-medium">
              Binance Pay
            </button>
            <button className="bg-gray-700 py-2 rounded-lg hover:bg-gray-600 font-medium">
              Blockchain Pay
            </button>
          </div>
        </div>
      )}

      {/* Soporte */}
      <div className="bg-gray-900 rounded-lg p-4 shadow">
        <h3 className="text-yellow-400 font-medium mb-2">Soporte</h3>
        <button className="w-full py-2 bg-purple-600 rounded-lg hover:bg-purple-500 font-medium">
          Contactar Soporte
        </button>
      </div>
    </div>
  );
};

export default Profile;