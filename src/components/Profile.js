import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getCountFromServer } from "firebase/firestore";
import {
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  RocketLaunchIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";

const AccountPage = () => {
  const { user, signOut } = useContext(AuthContext);
  const [usageData, setUsageData] = useState(null);
  const [plan, setPlan] = useState("free");
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [operationCount, setOperationCount] = useState(0);
  const [exportCount, setExportCount] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // 🔹 Datos del usuario
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setPlan(data.plan || "free");
          setUsageData(
            data.usage || {
              operaciones: { usadas: 0, total: 200 },
              exportaciones: { usadas: 0, total: 40 },
            }
          );
        }

        // 🔹 Contar operaciones SOLO del usuario logueado
        const operacionesQuery = query(
          collection(db, "operaciones"),
          where("uid", "==", user.uid)
        );
        const operacionesSnapshot = await getCountFromServer(operacionesQuery);
        setOperationCount(operacionesSnapshot.data().count);

        // 🔹 Contar exportaciones SOLO del usuario logueado
        const exportacionesQuery = query(
          collection(db, "exportaciones"),
          where("uid", "==", user.uid)
        );
        const exportacionesSnapshot = await getCountFromServer(exportacionesQuery);
        setExportCount(exportacionesSnapshot.data().count);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  const handleUpgradePlan = (planType) => {
    alert(`Actualizando al plan ${planType === "monthly" ? "mensual" : "anual"}`);
  };

  const userName = user?.displayName || "Usuario";
  const nameParts = userName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Tu Perfil</h1>
          <button
            onClick={signOut}
            className="flex items-center space-x-2 text-red-400 hover:text-red-300"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda - Información del usuario */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tarjeta de información básica */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Foto de perfil"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{userName}</h2>
                  <p className="text-gray-400">{user?.email}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Miembro desde {new Date(user?.metadata.creationTime).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-6">
                <h3 className="text-lg font-semibold mb-4">Información del Perfil</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Nombre</label>
                    <div className="p-2 bg-gray-800 rounded-md">{firstName}</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Apellido</label>
                    <div className="p-2 bg-gray-800 rounded-md">{lastName}</div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-500 mb-1">Email</label>
                    <div className="p-2 bg-gray-800 rounded-md">{user?.email}</div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-500 mb-1">Plan actual</label>
                    <div className="flex items-center">
                      <div className={`p-2 px-4 rounded-full text-sm font-medium ${
                        plan === "free" 
                          ? "bg-indigo-900 text-indigo-300" 
                          : "bg-purple-900 text-purple-300"
                      }`}>
                        {plan === "free" ? "Free" : "Premium"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Estadísticas de uso */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-indigo-400" />
                Uso de tu cuenta
              </h3>

              <div className="space-y-6">
                {/* Operaciones */}
                <div>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>Operaciones</span>
                    <span>
                      {operationCount}/{usageData?.operaciones.total || 200}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (operationCount / (usageData?.operaciones.total || 200)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Exportaciones */}
                <div>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>Exportaciones</span>
                    <span>
                      {exportCount}/{usageData?.exportaciones.total || 40}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div
                      className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (exportCount / (usageData?.exportaciones.total || 40)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <button className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors duration-200">
                Actualizar tus Límites
              </button>
            </div>
          </div>

          {/* Columna derecha - Plan Premium */}
          <div className="space-y-8">
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <RocketLaunchIcon className="h-5 w-5 mr-2 text-purple-400" />
                Plan Premium
              </h3>
              
              {/* ... (tu parte de planes y métodos de pago igual que antes) ... */}

              <button 
                onClick={() => handleUpgradePlan(selectedPlan)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Actualizar a Premium
              </button>
            </div>

            {/* Botón de contacto con soporte */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg text-center">
              <a 
                href="mailto:soportejjxcapital@gmail.com"
                className="w-full block bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Contactar a Soporte
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;