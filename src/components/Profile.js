import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, collection, getCountFromServer } from "firebase/firestore";
import {
  UserIcon,
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
  ClockIcon,
  StarIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
  DocumentChartBarIcon,
  ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";

const AccountPage = () => {
  const { user, signOut } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("perfil");
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

  const renderContent = () => {
    switch (activeTab) {
      case "perfil":
        return (
          <div className="space-y-8">
            {/* Información del usuario */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-indigo-600" />
                Información Personal
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <div className="p-2 bg-gray-50 rounded-md">{user?.displayName?.split(' ')[0] || "No especificado"}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <div className="p-2 bg-gray-50 rounded-md">{user?.displayName?.split(' ')[1] || "No especificado"}</div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                  <div className="p-2 bg-gray-50 rounded-md">{user?.email || "No especificado"}</div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Plan</label>
                  <div className="flex items-center">
                    <div className={`p-2 px-4 rounded-full text-sm font-medium ${
                      plan === "free" 
                        ? "bg-indigo-100 text-indigo-800" 
                        : "bg-purple-100 text-purple-800"
                    }`}>
                      {plan === "free" ? "Free" : "Premium"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Estadísticas de uso */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-indigo-600" />
                Estadísticas de Uso
              </h3>

              <div className="space-y-6">
                {/* Operaciones */}
                <div>
                  <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>Total de Operaciones</span>
                    <span>
                      {operationCount}/{usageData?.operaciones.total || 200}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
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
                  <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>Total de Exportaciones</span>
                    <span>
                      {exportCount}/{usageData?.exportaciones.total || 40}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
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
            </div>

            {/* Botón de contacto con soporte */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">¿Necesitas ayuda?</h3>
              <button className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg transition-colors duration-200">
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                <span>Contactar a Soporte</span>
              </button>
            </div>

            {/* Acciones de cuenta */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones de cuenta</h3>
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg transition-colors duration-200"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        );

      case "premium":
        return (
          <div className="space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center">
                <RocketLaunchIcon className="h-8 w-8 mr-3" />
                <h2 className="text-2xl font-bold">Potencia tu experiencia</h2>
              </div>
              <p className="mt-2 opacity-90">Desbloquea todo el potencial de nuestra plataforma con el plan Premium</p>
            </div>

            {/* Plan Premium */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Premium</h3>
              <p className="text-gray-600 mb-6">
                Accede a todas las funciones sin límites: operaciones ilimitadas, exportaciones ilimitadas, 
                soporte prioritario y mucho más.
              </p>

              {/* Selector de plan */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex rounded-md p-1 bg-gray-100">
                  <button
                    onClick={() => setSelectedPlan("monthly")}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      selectedPlan === "monthly"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-gray-700 hover:text-indigo-600"
                    }`}
                  >
                    Pago mensual
                  </button>
                  <button
                    onClick={() => setSelectedPlan("yearly")}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      selectedPlan === "yearly"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-gray-700 hover:text-indigo-600"
                    }`}
                  >
                    Pago anual
                  </button>
                </div>
              </div>

              {/* Tarjetas de planes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`border rounded-xl p-6 ${selectedPlan === "monthly" ? "border-indigo-500 ring-2 ring-indigo-500 ring-opacity-20" : "border-gray-200"}`}>
                  <h3 className="font-bold text-lg text-gray-900">Plan Mensual</h3>
                  <div className="my-4">
                    <span className="text-4xl font-bold text-gray-900">$13</span>
                    <span className="text-gray-600">/mes</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-gray-700">Operaciones ilimitadas</span>
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-gray-700">Exportaciones ilimitadas</span>
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-gray-700">Soporte prioritario</span>
                    </li>
                  </ul>
                  <button 
                    onClick={() => handleUpgradePlan("monthly")}
                    className={`w-full py-3 rounded-lg font-medium ${
                      selectedPlan === "monthly" 
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                        : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                    } transition-colors`}
                  >
                    {selectedPlan === "monthly" ? "Seleccionar" : "Elegir mensual"}
                  </button>
                </div>

                <div className={`border rounded-xl p-6 ${selectedPlan === "yearly" ? "border-indigo-500 ring-2 ring-indigo-500 ring-opacity-20" : "border-gray-200"} relative`}>
                  {selectedPlan === "yearly" && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center">
                        <StarIcon className="h-4 w-4 mr-1" />
                        Más popular
                      </span>
                    </div>
                  )}
                  <h3 className="font-bold text-lg text-gray-900">Plan Anual</h3>
                  <div className="my-4">
                    <span className="text-4xl font-bold text-gray-900">$125</span>
                    <span className="text-gray-600">/año</span>
                  </div>
                  <div className="text-sm text-green-600 font-medium mb-2">Ahorras 20% comparado con el plan mensual</div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-gray-700">Todo lo del plan mensual</span>
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-gray-700">Acceso a funciones beta</span>
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-gray-700">Informes avanzados</span>
                    </li>
                  </ul>
                  <button 
                    onClick={() => handleUpgradePlan("yearly")}
                    className={`w-full py-3 rounded-lg font-medium ${
                      selectedPlan === "yearly" 
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                        : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                    } transition-colors`}
                  >
                    {selectedPlan === "yearly" ? "Seleccionar" : "Elegir anual"}
                  </button>
                </div>
              </div>
            </div>

            {/* Métodos de pago */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCardIcon className="h-5 w-5 mr-2 text-indigo-600" />
                Métodos de pago
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:border-indigo-400 hover:shadow-md transition-all">
                  <div className="bg-blue-500 text-white p-2 rounded-md mb-2">
                    <span className="font-bold">Pay</span>
                  </div>
                  <span className="text-sm font-medium">PayPal</span>
                </button>
                
                <button className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:border-indigo-400 hover:shadow-md transition-all">
                  <div className="bg-yellow-500 text-white p-2 rounded-md mb-2">
                    <span className="font-bold">BINANCE</span>
                  </div>
                  <span className="text-sm font-medium">Binance Pay</span>
                </button>
                
                <button className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:border-indigo-400 hover:shadow-md transition-all">
                  <div className="bg-gray-800 text-white p-2 rounded-md mb-2">
                    <ArrowsRightLeftIcon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">Blockchain Pay</span>
                </button>
              </div>
            </div>

            {/* Contactar a soporte */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">¿Necesitas ayuda con tu plan?</h3>
              <button className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg transition-colors duration-200">
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                <span>Contactar a Soporte</span>
              </button>
            </div>
          </div>
        );

      case "historial":
        return (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2 text-indigo-600" />
              Historial de operaciones
            </h2>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-4 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                <div>Fecha</div>
                <div>Operación</div>
                <div>Tipo</div>
                <div>Estado</div>
              </div>
              
              <div className="divide-y divide-gray-200">
                <div className="grid grid-cols-4 px-4 py-3 text-sm">
                  <div className="text-gray-900">20 Sep 2023</div>
                  <div className="text-gray-900">Análisis de mercado</div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Análisis
                    </span>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completado
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 px-4 py-3 text-sm">
                  <div className="text-gray-900">19 Sep 2023</div>
                  <div className="text-gray-900">Exportación de datos</div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Exportación
                    </span>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completado
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 px-4 py-3 text-sm">
                  <div className="text-gray-900">18 Sep 2023</div>
                  <div className="text-gray-900">Simulación P2P</div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Simulación
                    </span>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completado
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <button className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium">
                <DocumentChartBarIcon className="h-5 w-5 mr-1" />
                Ver reporte completo
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Cuenta</h1>
        <p className="text-gray-600 mb-8">Gestiona tu perfil y configuración de cuenta</p>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === "perfil"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("perfil")}
            >
              <UserIcon className="h-5 w-5 mr-2" />
              Perfil
            </button>

            <button
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === "premium"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("premium")}
            >
              <StarIcon className="h-5 w-5 mr-2" />
              Plan Premium
            </button>

            <button
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === "historial"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("historial")}
            >
              <ClockIcon className="h-5 w-5 mr-2" />
              Historial
            </button>
          </nav>
        </div>

        {/* Contenido dinámico */}
        <div>{renderContent()}</div>
      </div>
    </div>
  );
};

export default AccountPage;