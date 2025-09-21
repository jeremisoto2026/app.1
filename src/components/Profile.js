import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, collection, getCountFromServer } from "firebase/firestore";
import {
  UserIcon,
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
  StarIcon,
  CheckBadgeIcon,
  RocketLaunchIcon,
  CreditCardIcon,
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
        // Obtener datos del usuario
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

        // Obtener conteo de operaciones
        const operacionesSnapshot = await getCountFromServer(collection(db, "operaciones"));
        setOperationCount(operacionesSnapshot.data().count);

        // Obtener conteo de exportaciones
        const exportacionesSnapshot = await getCountFromServer(collection(db, "exportaciones"));
        setExportCount(exportacionesSnapshot.data().count);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  const handleUpgradePlan = (planType) => {
    // Lógica para manejar la actualización del plan
    alert(`Actualizando al plan ${planType === "monthly" ? "mensual" : "anual"}`);
  };

  // Dividir el nombre completo en nombre y apellido
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
                  <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
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
                    <label className="block text-sm text-gray-500 mb-1">UID</label>
                    <div className="p-2 bg-gray-800 rounded-md text-sm font-mono">{user?.uid}</div>
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
              
              <p className="text-gray-400 mb-6">
                Obtén todo ilimitado por solo
              </p>

              <div className="mb-6">
                <div className="inline-flex rounded-md p-1 bg-gray-800 w-full">
                  <button
                    onClick={() => setSelectedPlan("monthly")}
                    className={`px-4 py-2 text-sm font-medium rounded-md flex-1 ${
                      selectedPlan === "monthly"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Mensual
                  </button>
                  <button
                    onClick={() => setSelectedPlan("yearly")}
                    className={`px-4 py-2 text-sm font-medium rounded-md flex-1 ${
                      selectedPlan === "yearly"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Anual
                  </button>
                </div>
              </div>

              <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <h4 className="font-bold text-lg text-white mb-2">
                  {selectedPlan === "monthly" ? "$13" : "$125"}
                  <span className="text-sm text-gray-400 ml-1">
                    /{selectedPlan === "monthly" ? "mes" : "año"}
                  </span>
                </h4>
                
                <ul className="space-y-2 mt-4">
                  <li className="flex items-center text-sm">
                    <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span>Operaciones ilimitadas</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span>Exportaciones ilimitadas</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                    <span>Soporte prioritario</span>
                  </li>
                  {selectedPlan === "yearly" && (
                    <li className="flex items-center text-sm">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      <span>Ahorras 20% comparado con mensual</span>
                    </li>
                  )}
                </ul>
              </div>

              <button 
                onClick={() => handleUpgradePlan(selectedPlan)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Actualizar a Premium
              </button>

              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Métodos de pago</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button className="flex flex-col items-center justify-center p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="bg-blue-500 text-white p-1 rounded-sm mb-1 text-xs">
                      <span className="font-bold">Pay</span>
                    </div>
                    <span className="text-xs">PayPal</span>
                  </button>
                  
                  <button className="flex flex-col items-center justify-center p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="bg-yellow-500 text-white p-1 rounded-sm mb-1 text-xs">
                      <span className="font-bold text-xs">BINANCE</span>
                    </div>
                    <span className="text-xs">Binance Pay</span>
                  </button>
                  
                  <button className="flex flex-col items-center justify-center p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="bg-gray-700 text-white p-1 rounded-sm mb-1">
                      <ArrowsRightLeftIcon className="h-4 w-4" />
                    </div>
                    <span className="text-xs">Blockchain</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Navegación de la app */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4">Navegación</h3>
              <div className="space-y-2">
                <a href="#" className="block py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors">Dashboard</a>
                <a href="#" className="block py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors">P2P</a>
                <a href="#" className="block py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors">Arbitraje</a>
                <a href="#" className="block py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors">Operaciones</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;