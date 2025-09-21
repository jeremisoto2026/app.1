// Profile.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [operationCount, setOperationCount] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [plan, setPlan] = useState("free");

  // Valores por defecto de límites (no cambian diseño)
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

        // 1) Obtener documento del usuario en "users/{uid}"
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        let data = null;
        if (docSnap.exists()) {
          data = docSnap.data();
          setProfileData(data);
          setPlan(data.plan || "free");
        } else {
          // Si no existe doc en Firestore, armamos mínimo con la info de auth
          data = {
            nombre: user.displayName ? user.displayName.split(" ")[0] : "",
            apellido: user.displayName ? user.displayName.split(" ").slice(1).join(" ") : "",
            email: user.email,
            photoURL: user.photoURL || "",
            plan: "free",
            usage: defaultUsage,
            createdAt: null,
            displayName: user.displayName || null,
          };
          setProfileData(data);
          setPlan("free");
        }

        // 2) Contar operaciones del usuario en la subcolección "users/{uid}/operations"
        const opsCol = collection(db, "users", user.uid, "operations");
        const opsSnap = await getDocs(opsCol);
        const opsCount = opsSnap.size || 0;
        setOperationCount(opsCount);

        // Si el doc tiene usage, respetamos total, pero actualizamos "usadas" con ops reales si no existe
        if (data?.usage) {
          if (!data.usage.operaciones || data.usage.operaciones.usadas === undefined) {
            data.usage = {
              ...(data.usage || {}),
              operaciones: { usadas: opsCount, total: data.usage?.operaciones?.total || defaultUsage.operaciones.total },
            };
          } else {
            // si hay uso guardado, actualizamos operaciones.usadas por seguridad
            data.usage.operaciones.usadas = opsCount;
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
  }, [user]);

  // Helper: obtener URL de la foto (prioriza Firestore -> auth -> fallback)
  const getPhotoURL = () => {
    if (profileData?.photoURL) return profileData.photoURL;
    if (user?.photoURL) return user.photoURL;
    return null;
  };

  // Iconos SVG (sin dependencia externa)
  const IconRocket = ({ className = "h-5 w-5 mr-2 text-purple-400" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2c2.21 0 4 1.79 4 4v3l3 3-3 3v3c0 2.21-1.79 4-4 4s-4-1.79-4-4v-3L5 15l3-3V6c0-2.21 1.79-4 4-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const IconChart = ({ className = "h-5 w-5 mr-2 text-indigo-400" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="11" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="10.5" y="6" width="3" height="15" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="18" y="3" width="3" height="18" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
  const IconCheck = ({ className = "h-4 w-4 text-green-500 mr-2" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const IconLogout = ({ className = "h-5 w-5 mr-2 text-red-400" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 12H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 19H6a2 2 0 01-2-2V7a2 2 0 012-2h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

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

  // Uso (operaciones / exportaciones)
  const usage = profileData.usage || defaultUsage;
  const operacionesUsadas = operationCount ?? (usage.operaciones?.usadas || 0);
  const operacionesTotal = usage.operaciones?.total || defaultUsage.operaciones.total;
  const exportacionesUsadas = usage.exportaciones?.usadas || defaultUsage.exportaciones.usadas;
  const exportacionesTotal = usage.exportaciones?.total || defaultUsage.exportaciones.total;

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
                  {(profileData.nombre || profileData.displayName || user?.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold text-white mb-1">
                {profileData.nombre ? `${profileData.nombre} ${profileData.apellido || ""}`.trim() : (profileData.displayName || user?.displayName || "Usuario")}
              </h2>
              <p className="text-indigo-200">{profileData.email || user?.email}</p>
              <p className="text-sm text-indigo-100 mt-2">
                Miembro desde:{" "}
                {profileData.createdAt?.toDate
                  ? profileData.createdAt.toDate().toLocaleDateString()
                  : user?.metadata?.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleDateString()
                    : "Fecha no disponible"}
              </p>

              {/* Botones */}
              <div className="mt-4 flex items-center justify-center md:justify-start gap-3">
                {/* AJUSTES QUITADO según petición */}
                <button
                  onClick={() => signOut && signOut()}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition flex items-center"
                >
                  <IconLogout className="h-4 w-4 mr-2" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal: Uso + Plan */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda (estadísticas / info) - ocupa 2 columnas */}
          <div className="lg:col-span-2 space-y-8">
            {/* Información del Perfil */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-semibold mb-4">Información del Perfil</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Nombre</p>
                  <div className="p-3 bg-gray-800 rounded-md">{profileData.nombre || profileData.displayName || "-"}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Apellido</p>
                  <div className="p-3 bg-gray-800 rounded-md">{profileData.apellido || "-"}</div>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-gray-400 mb-1">Email</p>
                  <div className="p-3 bg-gray-800 rounded-md">{profileData.email || user?.email}</div>
                </div>

                {/* Plan */}
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-400 mb-1">Plan actual</p>
                  <div className="inline-block mt-2 px-3 py-1 bg-indigo-900 text-indigo-300 rounded-full text-xs font-medium">
                    {plan === "free" ? "Free" : plan}
                  </div>
                </div>
              </div>
            </div>

            {/* Uso de tu cuenta */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <IconChart />
                Uso de tu cuenta
              </h3>

              <div className="space-y-6">
                {/* Operaciones */}
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

                {/* Exportaciones */}
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

          {/* Columna derecha - Plan Premium y métodos de pago */}
          <div className="space-y-8">
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <IconRocket />
                Plan Premium
              </h3>

              <div className="mb-4 text-sm text-gray-400">
                <p className="mb-2 font-bold text-white">$13 /mes</p>
                <ul className="space-y-1">
                  <li className="flex items-center"><IconCheck />Operaciones ilimitadas</li>
                  <li className="flex items-center"><IconCheck />Exportaciones ilimitadas</li>
                  <li className="flex items-center"><IconCheck />Soporte prioritario</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Métodos de pago</h4>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    className="py-2 px-3 rounded-md text-white font-medium"
                    style={{ backgroundColor: "#003087" }} // PayPal azul
                  >
                    PayPal
                  </button>
                  <button
                    className="py-2 px-3 rounded-md font-semibold"
                    style={{ backgroundColor: "#F3BA2F", color: "#111" }} // Binance amarillo (texto oscuro)
                  >
                    Binance Pay
                  </button>
                  <button
                    className="py-2 px-3 rounded-md text-white font-medium"
                    style={{ backgroundColor: "#0F6FFF" }} // Blockchain azul/celeste
                  >
                    Blockchain Pay
                  </button>
                </div>
              </div>

              <button 
                onClick={() => alert("Funcionalidad de pago no implementada en esta demo.")}
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

        {/* Espacio final */}
        <div className="h-10" />
      </div>
    </div>
  );
}