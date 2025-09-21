// AccountPage.js
import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  UserIcon,
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
  ClockIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";

const AccountPage = () => {
  const { user, signOut } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("perfil");
  const [usageData, setUsageData] = useState(null);
  const [plan, setPlan] = useState("free");
  const [billingCycle, setBillingCycle] = useState("mensual"); // mensual | anual
  const [selectedPlan, setSelectedPlan] = useState(null); // plan seleccionado

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setPlan(data.plan || "free");
          setUsageData(
            data.usage || {
              operaciones: { usadas: 0, total: 30 },
              exportaciones: { usadas: 0, total: 10 },
            }
          );
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  const renderContent = () => {
    switch (activeTab) {
      case "perfil":
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <img
                src={
                  user?.photoURL ||
                  `https://ui-avatars.com/api/?name=${user?.displayName || "U"}`
                }
                alt="Avatar"
                className="w-20 h-20 rounded-full border-2 border-gray-300"
              />
              <div>
                <h2 className="text-xl font-bold">{user?.displayName}</h2>
                <p className="text-gray-600">{user?.email}</p>
                <p className="text-sm text-indigo-600 font-semibold mt-1">
                  Plan: {plan}
                </p>
              </div>
            </div>

            {usageData && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Uso actual</h3>

                {/* Operaciones */}
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Operaciones</span>
                    <span>
                      {usageData.operaciones.usadas}/
                      {usageData.operaciones.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full"
                      style={{
                        width: `${
                          (usageData.operaciones.usadas /
                            usageData.operaciones.total) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Exportaciones */}
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Exportaciones</span>
                    <span>
                      {usageData.exportaciones.usadas}/
                      {usageData.exportaciones.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-green-500 h-2.5 rounded-full"
                      style={{
                        width: `${
                          (usageData.exportaciones.usadas /
                            usageData.exportaciones.total) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={signOut}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md flex items-center justify-center space-x-2"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        );

      case "premium":
        return (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-center flex items-center justify-center space-x-2">
              <RocketLaunchIcon className="h-6 w-6 text-indigo-600" />
              <span>Mejora tu plan 🚀</span>
            </h2>

            {/* Toggle mensual/anual */}
            <div className="flex justify-center items-center space-x-4">
              <span
                className={`cursor-pointer ${
                  billingCycle === "mensual"
                    ? "text-indigo-600 font-bold"
                    : "text-gray-600"
                }`}
                onClick={() => setBillingCycle("mensual")}
              >
                Mensual
              </span>
              <div
                className="w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 cursor-pointer"
                onClick={() =>
                  setBillingCycle(
                    billingCycle === "mensual" ? "anual" : "mensual"
                  )
                }
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ${
                    billingCycle === "anual"
                      ? "translate-x-6"
                      : "translate-x-0"
                  }`}
                />
              </div>
              <span
                className={`cursor-pointer ${
                  billingCycle === "anual"
                    ? "text-indigo-600 font-bold"
                    : "text-gray-600"
                }`}
                onClick={() => setBillingCycle("anual")}
              >
                Anual
              </span>
            </div>

            {/* Planes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Plan mensual */}
              {billingCycle === "mensual" && (
                <div
                  className={`border p-6 rounded-lg shadow-sm text-center transition transform hover:scale-105 ${
                    selectedPlan === "mensual"
                      ? "ring-2 ring-indigo-600"
                      : "bg-white"
                  }`}
                  onClick={() => setSelectedPlan("mensual")}
                >
                  <h3 className="font-bold text-lg">Mensual</h3>
                  <p className="text-3xl font-bold my-2">9,99 €</p>
                  <p className="text-gray-600 mb-4">
                    Acceso ilimitado + soporte
                  </p>
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md w-full">
                    Seleccionar plan
                  </button>
                </div>
              )}

              {/* Plan anual */}
              {billingCycle === "anual" && (
                <div
                  className={`border p-6 rounded-lg shadow-md text-center bg-indigo-50 transition transform hover:scale-105 ${
                    selectedPlan === "anual"
                      ? "ring-2 ring-indigo-600"
                      : "bg-indigo-50"
                  }`}
                  onClick={() => setSelectedPlan("anual")}
                >
                  <h3 className="font-bold text-lg flex items-center justify-center space-x-2">
                    <span>Anual</span>
                  </h3>
                  <p className="text-gray-500 line-through">160 €</p>
                  <p className="text-3xl font-bold my-2 text-indigo-700">
                    125 €
                  </p>
                  <p className="text-green-600 font-semibold mb-4">
                    Ahorra 20% + beneficios extra
                  </p>
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md w-full">
                    Seleccionar plan
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case "historial":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Historial</h2>
            <p className="text-gray-600">Aquí verás tus operaciones.</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Tabs */}
      <div className="flex justify-around border-b mb-6">
        <button
          className={`flex items-center space-x-2 px-4 py-2 ${
            activeTab === "perfil"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("perfil")}
        >
          <UserIcon className="h-5 w-5" />
          <span>Perfil</span>
        </button>

        <button
          className={`flex items-center space-x-2 px-4 py-2 ${
            activeTab === "premium"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("premium")}
        >
          <ChartBarIcon className="h-5 w-5" />
          <span>Plan Premium</span>
        </button>

        <button
          className={`flex items-center space-x-2 px-4 py-2 ${
            activeTab === "historial"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("historial")}
        >
          <ClockIcon className="h-5 w-5" />
          <span>Historial</span>
        </button>
      </div>

      {/* Contenido dinámico */}
      <div>{renderContent()}</div>
    </div>
  );
};

export default AccountPage;