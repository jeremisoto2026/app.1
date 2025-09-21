// src/components/Profile.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext"; // usa tu hook existente
import { db, auth } from "../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { RocketLaunchIcon } from "@heroicons/react/24/outline";

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [operationCount, setOperationCount] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(null); // "monthly" | "annual"
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

        // 1) Obtener documento del usuario en Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let data = null;
        if (userSnap.exists()) {
          data = userSnap.data();
          setPlan(data.plan || "free");
        } else {
          // no existe en Firestore: construir a partir de auth
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
          setPlan("free");
        }

        // 2) Contar operaciones del usuario en la subcolección "users/{uid}/operations"
        const opsCol = collection(db, "users", user.uid, "operations");
        const opsSnap = await getDocs(opsCol);
        const opsCount = opsSnap.size || 0;
        setOperationCount(opsCount);

        // 3) Normalizar campo usage (si existe en Firestore lo respetamos, si no lo creamos)
        if (data.usage) {
          // si existe usage, pero operaciones.usadas no está definido, fijarlo con el conteo real
          if (
            !data.usage.operaciones ||
            data.usage.operaciones.usadas === undefined
          ) {
            data.usage = {
              ...(data.usage || {}),
              operaciones: {
                usadas: opsCount,
                total: data.usage?.operaciones?.total || defaultUsage.operaciones.total,
              },
            };
          }
        } else {
          data.usage = {
            operaciones: { usadas: opsCount, total: defaultUsage.operaciones.total },
            exportaciones: defaultUsage.exportaciones,
          };
        }

        setProfileData(data);
      } catch (error) {
        console.error("Error fetching profile/usage:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const formatDate = (timestampOrString) => {
    if (!timestampOrString) return "Fecha no disponible";
    try {
      if (timestampOrString.toDate) return timestampOrString.toDate().toLocaleDateString();
      if (timestampOrString.seconds) return new Date(timestampOrString.seconds * 1000).toLocaleDateString();
      return new Date(timestampOrString).toLocaleDateString();
    } catch {
      return "Fecha no disponible";
    }
  };

  const getPhotoURL = () => {
    // prioridad: Firestore (profileData.photoURL) -> auth.photoURL -> null (mostrar inicial)
    if (profileData?.photoURL) return profileData.photoURL;
    if (auth?.currentUser?.photoURL) return auth.currentUser.photoURL;
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
          <div className="text-white text-xl mb-4">No se encontraron datos del perfil.</div>
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

  // uso real
  const usage = profileData.usage || defaultUsage;
  const operacionesUsadas = operationCount ?? usage.operaciones.usadas ?? 0;
  const operacionesTotal = usage.operaciones.total ?? defaultUsage.operaciones.total;
  const exportacionesUsadas = usage.exportaciones?.usadas ?? defaultUsage.exportaciones.usadas;
  const exportacionesTotal = usage.exportaciones?.total ?? defaultUsage.exportaciones.total;

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              {getPhotoURL() ? (
                <img
                  src={getPhotoURL()}
                  alt="Profile"
                  className="w-28 h-28 rounded-full object-cover border-4 border-white/20 shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-white/20 shadow-lg">
                  {(profileData.nombre || profileData.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold text-white mb-1">
                {profileData.nombre ? `${profileData.nombre} ${profileData.apellido || ""}`.trim() : (auth?.currentUser?.displayName || "Usuario")}
              </h2>
              <p className="text-indigo-200">{profileData.email || auth?.currentUser?.email}</p>
              <p className="text-sm text-indigo-100 mt-2">
                Miembro desde:{" "}
                {profileData.createdAt ? formatDate(profileData.createdAt) :
                 auth?.currentUser?.metadata?.creationTime ? new Date(auth.currentUser.metadata.creationTime).toLocaleDateString()
                 : "Fecha no disponible"}
              </p>

              {/* Botones: solo Cerrar sesión (quitado Ajustes de cuenta) */}
              <div className="mt-4 flex items-center justify-center md:justify-start gap-3">
                <button
                  onClick={() => signOut && signOut()}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                    <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13 19H6a2 2 0 01-2-2V7a2 2 0 012-2h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Izquierda - información y uso (ocupa 2 columnas) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-semibold mb-4">Información del Perfil</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Nombre</p>
                  <div className="p-3 bg-gray-800 rounded-md">{profileData.nombre || "-"}</div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Apellido</p>
                  <div className="p-3 bg-gray-800 rounded-md">{profileData.apellido || "-"}</div>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-gray-400 mb-1">Email</p>
                  <div className="p-3 bg-gray-800 rounded-md">{profileData.email || auth?.currentUser?.email}</div>
                </div>

                {/* NOTA: UID removido por tu pedido */}
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-400 mb-1">Plan actual</p>
                  <div className="inline-block mt-2 px-3 py-1 bg-indigo-900 text-indigo-300 rounded-full text-xs font-medium">
                    {plan === "free" ? "Free" : plan}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <svg className="h-5 w-5 mr-2 text-indigo-400" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="10.5" y="6" width="3" height="15" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="18" y="3" width="3" height="18" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                Uso de tu cuenta
              </h3>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Operaciones</span>
                    <span className="text-gray-400">{operacionesUsadas}/{operacionesTotal}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${Math.min((operacionesUsadas / operacionesTotal) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Exportaciones</span>
                    <span className="text-gray-400">{exportacionesUsadas}/{exportacionesTotal}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div
                      className="bg-green-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${Math.min((exportacionesUsadas / exportacionesTotal) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <button className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors">
                Actualizar tus Límites
              </button>
            </div>
          </div>

          {/* Derecha - Plan Premium y métodos de pago */}
          <div className="space-y-8">
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <RocketLaunchIcon className="h-5 w-5 mr-2 text-purple-400" />
                Plan Premium
              </h3>

              <div className="mb-4 text-sm text-gray-400">
                <p className="mb-2 font-bold text-white">$13 /mes</p>
                <ul className="space-y-1">
                  <li className="flex items-center"><svg className="h-4 w-4 text-green-500 mr-2" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>Operaciones ilimitadas</li>
                  <li className="flex items-center"><svg className="h-4 w-4 text-green-500 mr-2" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>Exportaciones ilimitadas</li>
                  <li className="flex items-center"><svg className="h-4 w-4 text-green-500 mr-2" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>Soporte prioritario</li>
                </ul>
              </div>

              {/* Cards separadas Mensual / Anual */}
              <div className="grid grid-cols-1 gap-4">
                <div className={`p-4 rounded-lg border ${selectedPlan === "monthly" ? "ring-2 ring-indigo-600" : "bg-gray-800"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold">Mensual</h4>
                      <p className="text-2xl font-bold">$13</p>
                      <p className="text-sm text-gray-400">Pago mensual</p>
                    </div>
                    <div>
                      <button
                        onClick={() => setSelectedPlan("monthly")}
                        className={`px-4 py-2 rounded-md ${selectedPlan === "monthly" ? "bg-indigo-600 text-white" : "bg-gray-700 text-white hover:bg-gray-600"}`}
                      >
                        Seleccionar mensual
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${selectedPlan === "annual" ? "ring-2 ring-indigo-600" : "bg-gray-800"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold flex items-center gap-2">
                        Anual
                        <span className="text-xs bg-yellow-400 text-gray-900 px-2 py-0.5 rounded">AHORRA 20%</span>
                      </h4>
                      <p className="text-sm text-gray-400 line-through">~~160$~~</p>
                      <p className="text-2xl font-bold">125$</p>
                      <p className="text-sm text-gray-400">Pago anual</p>
                    </div>
                    <div>
                      <button
                        onClick={() => setSelectedPlan("annual")}
                        className={`px-4 py-2 rounded-md ${selectedPlan === "annual" ? "bg-indigo-600 text-white" : "bg-gray-700 text-white hover:bg-gray-600"}`}
                      >
                        Seleccionar anual
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métodos de pago */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Métodos de pago</h4>
                <div className="grid grid-cols-3 gap-3">
                  <button className="flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-[#003087] hover:bg-[#00215a] text-white">
                    {/* PayPal (azul) */}
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M6 6h6l-2 12H6z" stroke="white" strokeWidth="1.2"/></svg>
                    PayPal
                  </button>

                  <button className="flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-[#f3ba2f] hover:bg-[#e0a800] text-black">
                    {/* Binance Pay (amarillo) */}
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="6" stroke="black" strokeWidth="1.2"/></svg>
                    Binance Pay
                  </button>

                  <button className="flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-gray-800 hover:bg-gray-700 text-white">
                    {/* Blockchain Pay (gris) */}
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" stroke="white" strokeWidth="1.2" /></svg>
                    Blockchain Pay
                  </button>
                </div>
              </div>
            </div>

            {/* Botón de contacto con soporte (fondo) */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg text-center">
              <a
                href="mailto:soportejjxcapital@gmail.com"
                className="w-full inline-block bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors"
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