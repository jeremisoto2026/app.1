// Profile.js
import React, { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  RocketLaunchIcon,
  ChartBarIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [operationCount, setOperationCount] = useState(0);
  const [plan, setPlan] = useState("free");

  const defaultUsage = {
    operaciones: { usadas: 0, total: 200 },
    exportaciones: { usadas: 0, total: 40 },
  };

  useEffect(() => {
    const fetchProfileAndUsage = async () => {
      setLoading(true);
      try {
        if (!user) {
          setProfileData(null);
          setOperationCount(0);
          setPlan("free");
          setLoading(false);
          return;
        }

        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        let data = null;
        if (docSnap.exists()) {
          data = docSnap.data();
          setProfileData(data);
          setPlan(data.plan || "free");
        } else {
          data = {
            nombre: user.displayName ? user.displayName.split(" ")[0] : "",
            apellido: user.displayName
              ? user.displayName.split(" ").slice(1).join(" ")
              : "",
            email: user.email,
            photoURL: user.photoURL || "",
            plan: "free",
            usage: defaultUsage,
            createdAt: null,
          };
          setProfileData(data);
          setPlan("free");
        }

        const opsCol = collection(db, "users", user.uid, "operations");
        const opsSnap = await getDocs(opsCol);
        setOperationCount(opsSnap.size || 0);

        if (!data.usage) {
          data.usage = {
            operaciones: { usadas: opsSnap.size, total: defaultUsage.operaciones.total },
            exportaciones: defaultUsage.exportaciones,
          };
        }

        setProfileData({ ...data });
      } catch (error) {
        console.error("Error fetching profile/usage:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndUsage();
  }, [user]);

  const getPhotoURL = () => {
    if (profileData?.photoURL) return profileData.photoURL;
    if (user?.photoURL) return user.photoURL;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">
            No se encontraron datos del perfil.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const usage = profileData.usage || defaultUsage;
  const operacionesUsadas = operationCount ?? usage.operaciones.usadas;
  const operacionesTotal = usage.operaciones.total;
  const exportacionesUsadas = usage.exportaciones.usadas;
  const exportacionesTotal = usage.exportaciones.total;

  const memberSince =
    profileData.createdAt?.toDate
      ? profileData.createdAt.toDate().toLocaleDateString()
      : user?.metadata?.creationTime
      ? new Date(user.metadata.creationTime).toLocaleDateString()
      : "Fecha no disponible";

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              {getPhotoURL() ? (
                <img
                  src={getPhotoURL()}
                  alt="Profile"
                  className="w-28 h-28 rounded-full object-cover border-4 border-white/20 shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-white/20 shadow-lg">
                  {(profileData.nombre || user?.email || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold text-white mb-1">
                {profileData.nombre
                  ? `${profileData.nombre} ${profileData.apellido || ""}`.trim()
                  : user?.displayName || "Usuario"}
              </h2>
              <p className="text-indigo-200">{profileData.email || user?.email}</p>
              <p className="text-sm text-indigo-100 mt-2">
                Miembro desde: {memberSince}
              </p>

              <div className="mt-4 flex items-center justify-center md:justify-start gap-3">
                <button
                  onClick={() => signOut && signOut()}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition flex items-center"
                >
                  <svg
                    className="h-4 w-4 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M16 17l5-5-5-5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 12H9"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13 19H6a2 2 0 01-2-2V7a2 2 0 012-2h7"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Uso de la cuenta */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-indigo-400" />
                Uso de tu cuenta
              </h3>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Operaciones</span>
                    <span className="text-gray-400">
                      {operacionesUsadas}/{operacionesTotal}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (operacionesUsadas / operacionesTotal) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Exportaciones</span>
                    <span className="text-gray-400">
                      {exportacionesUsadas}/{exportacionesTotal}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div
                      className="bg-green-600 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (exportacionesUsadas / exportacionesTotal) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <button className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors">
                Actualizar tus Límites
              </button>
            </div>
          </div>

          {/* Plan Premium */}
          <div className="space-y-8">
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <RocketLaunchIcon className="h-5 w-5 mr-2 text-purple-400" />
                Plan Premium
              </h3>

              <div className="mb-4 text-sm text-gray-400">
                {/* Plan mensual */}
                <p className="mb-2 font-bold text-white">$13 /mes</p>
                <ul className="space-y-1 mb-4">
                  <li className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    Operaciones ilimitadas
                  </li>
                  <li className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    Exportaciones ilimitadas
                  </li>
                  <li className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    Soporte prioritario
                  </li>
                </ul>

                {/* Plan anual */}
                <p className="mb-2 font-bold text-white">$125 /año (20% menos)</p>
                <ul className="space-y-1">
                  <li className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    Operaciones ilimitadas
                  </li>
                  <li className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    Exportaciones ilimitadas
                  </li>
                  <li className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    Soporte prioritario
                  </li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Métodos de pago
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md">
                    PayPal
                  </button>
                  <button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-2 px-3 rounded-md">
                    Binance Pay
                  </button>
                  <button className="bg-sky-500 hover:bg-sky-600 text-white py-2 px-3 rounded-md">
                    Blockchain Pay
                  </button>
                </div>
              </div>
            </div>

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

        <div className="h-10" />
      </div>
    </div>
  );
}