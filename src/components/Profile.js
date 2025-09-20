import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";

const Profile = () => {
  const { user, signOut } = useAuth();
  const [operationsCount, setOperationsCount] = useState(0);
  const [exportsCount, setExportsCount] = useState(0);
  const [memberSince, setMemberSince] = useState("");

  // 🔥 Cargar datos adicionales desde Firestore
  useEffect(() => {
    if (!user) return;

    // Total operaciones
    const fetchOperations = async () => {
      try {
        const q = query(collection(db, "operations"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);
        setOperationsCount(snapshot.size);
      } catch (error) {
        console.error("❌ Error fetching operations:", error);
      }
    };

    // Exportaciones
    const fetchExports = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setExportsCount(snap.data().exports || 0);
          if (snap.data().memberSince?.seconds) {
            const date = new Date(snap.data().memberSince.seconds * 1000);
            setMemberSince(date.toLocaleDateString());
          }
        }
      } catch (error) {
        console.error("❌ Error fetching user profile:", error);
      }
    };

    fetchOperations();
    fetchExports();
  }, [user]);

  if (!user) return <p className="text-center mt-10 text-gray-400">Cargando perfil...</p>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 text-white">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Hola, {user.firstName} 👋</h1>
        <button
          onClick={signOut}
          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Foto y datos */}
      <div className="flex flex-col items-center mt-6">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt="Foto de perfil"
            className="w-24 h-24 rounded-full border-4 border-blue-500 shadow-md"
          />
        ) : (
          <div className="w-24 h-24 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-3xl font-bold shadow-md">
            {user.firstName?.[0] || "U"}
          </div>
        )}

        <p className="mt-4 text-lg font-semibold">{user.firstName} {user.lastName}</p>
        <p className="text-gray-400">{user.email}</p>
        <span className="mt-2 text-sm text-gray-500">Miembro desde {memberSince || "—"}</span>
      </div>

      {/* Plan */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl mt-6 p-4 shadow-lg">
        <h2 className="text-lg font-bold">Plan Actual: {user.plan || "Free"}</h2>
      </div>

      {/* Uso de cuenta */}
      <div className="bg-gray-900 rounded-xl mt-4 p-5 shadow-lg">
        <h3 className="text-xl font-semibold mb-4">📊 Uso de tu cuenta</h3>

        <div className="mb-3">
          <p className="text-sm text-gray-400">Operaciones</p>
          <p>{operationsCount}/200</p>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${(operationsCount / 200) * 100}%` }}
            />
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm text-gray-400">Exportaciones</p>
          <p>{exportsCount}/40</p>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${(exportsCount / 40) * 100}%` }}
            />
          </div>
        </div>

        <button className="mt-4 w-full bg-blue-500 hover:bg-blue-600 py-2 rounded-lg font-medium">
          Actualizar tus Límites
        </button>
      </div>

      {/* Plan Premium */}
      <div className="bg-gray-800 rounded-xl mt-6 p-5 shadow-lg">
        <h3 className="text-xl font-semibold mb-3">🌟 Plan Premium</h3>
        <p className="text-gray-300">Accede a todo ilimitado por solo <b>$13/mes</b>.</p>

        <div className="flex flex-col gap-3 mt-4">
          <button className="w-full bg-yellow-500 hover:bg-yellow-600 py-2 rounded-lg font-medium">
            PayPal
          </button>
          <button className="w-full bg-green-500 hover:bg-green-600 py-2 rounded-lg font-medium">
            Binance Pay
          </button>
          <button className="w-full bg-purple-500 hover:bg-purple-600 py-2 rounded-lg font-medium">
            Blockchain Pay
          </button>
        </div>
      </div>

      {/* Contacto soporte */}
      <div className="mt-8 text-center">
        <button className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-semibold">
          📩 Contactar a Soporte
        </button>
      </div>
    </div>
  );
};

export default Profile;