// src/components/Profile.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext"; // <- usa el hook exportado por tu AuthContext
import { db } from "../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

// Iconos (usa @heroicons/react/24/outline)
import {
  RocketLaunchIcon,
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
  StarIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

/**
 * Profile component
 * - Mantiene estructura, estilos y bloques.
 * - Conecta con Firestore para traer doc usuario y contar subcolección operations.
 * - No muestra UID ni navegación.
 * - Botón Contactar abre mailto:soportejjxcapital@gmail.com
 */
export default function Profile() {
  const { user, signOut } = useAuth(); // espera que useAuth devuelva { user, signOut, ... }
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [operationCount, setOperationCount] = useState(0);

  // Límites por defecto (si el documento no tiene usage)
  const defaultUsage = {
    operaciones: { usadas: 0, total: 200 },
    exportaciones: { usadas: 0, total: 40 },
  };

  // ---------- Fetch profile & usage ----------
  useEffect(() => {
    let cancelled = false;

    const fetchProfileAndUsage = async () => {
      setLoading(true);
      try {
        if (!user) {
          setProfileData(null);
          setOperationCount(0);
          setLoading(false);
          return;
        }

        // 1) Intentamos obtener el documento de Firestore en users/{uid}
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        let data = null;
        if (userSnap.exists()) {
          data = userSnap.data();
        } else {
          // Si no existe documento en Firestore, armamos datos mínimos desde auth
          data = {
            nombre: user.displayName ? user.displayName.split(" ")[0] : "",
            apellido: user.displayName ? user.displayName.split(" ").slice(1).join(" ") : "",
            email: user.email,
            photoURL: user.photoURL || "",
            plan: "free",
            usage: defaultUsage,
            createdAt: null,
          };
        }

        if (!cancelled) {
          setProfileData(data);
        }

        // 2) Contamos las operaciones guardadas en la subcolección
        //    Colección: users/{uid}/operations
        const opsColRef = collection(db, "users", user.uid, "operations");
        const opsSnap = await getDocs(opsColRef);
        const opsCount = opsSnap.size || 0;
        if (!cancelled) setOperationCount(opsCount);

        // Si el documento tenía usage, respetarlo pero asegurar operaciones.usadas reflejan conteo real
        if (!data.usage) {
          data.usage = {
            operaciones: { usadas: opsCount, total: defaultUsage.operaciones.total },
            exportaciones: defaultUsage.exportaciones,
          };
        } else {
          // si existe pero no trae operaciones.usadas, actualizamos para mostrar algo real
          if (!data.usage.operaciones || data.usage.operaciones.usadas === undefined) {
            data.usage = {
              ...(data.usage || {}),
              operaciones: {
                usadas: opsCount,
                total: data.usage?.operaciones?.total || defaultUsage.operaciones.total,
              },
            };
          }
        }

        // seteamos nuevamente profileData para tener usage consistente
        if (!cancelled) setProfileData(data);
      } catch (err) {
        console.error("Error fetching profile/usage:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfileAndUsage();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // ---------- Helpers ----------
  const getPhotoURL = () => {
    // Prioriza la foto guardada en Firestore -> foto del auth -> null
    if (profileData?.photoURL) return profileData.photoURL;
    if (user?.photoURL) return user.photoURL;
    return null;
  };

  const formatMemberSince = () => {
    if (profileData?.createdAt?.toDate) {
      try {
        return profileData.createdAt.toDate().toLocaleDateString();
      } catch {
        // ignore
      }
    }
    if (user?.metadata?.creationTime) {
      try {
        return new Date(user.metadata.creationTime).toLocaleDateString();
      } catch {
        // ignore
      }
    }
    return "Fecha no disponible";
  };

  // contenido loading
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // si no hay profileData (caso raro)
  if (!profileData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">No se encontraron datos del perfil.</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Uso (operaciones / exportaciones) - prioriza operationCount real
  const usage = profileData.usage || defaultUsage;
  const operacionesUsadas = operationCount ?? (usage.operaciones?.usadas || 0);
  let operacionesTotal = usage.operaciones?.total || defaultUsage.operaciones.total;
  let exportacionesUsadas = usage.exportaciones?.usadas || defaultUsage.exportaciones.usadas;
  let exportacionesTotal = usage.exportaciones?.total || defaultUsage.exportaciones.total;

  // ⚡️ Ajuste: si es Premium → ilimitado (Infinity)
  if (profileData.plan?.toLowerCase() === "premium") {
    operacionesTotal = Infinity;
    exportacionesTotal = Infinity;
  }

  // ---------- Render (diseño completo, sin UID, sin navegación, tarjetas separadas) ----------
  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ================= Header con avatar e info ================= */}
        <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              {getPhotoURL() ? (
                <img
                  src={getPhotoURL()}
                  alt="Foto de perfil"
                  className="w-28 h-28 rounded-full object-cover border-4 border-white/20 shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-white/20 shadow-lg">
                  {(profileData.nombre || user?.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold text-white mb-1">
                {profileData.nombre ? `${profileData.nombre} ${profileData.apellido || ""}`.trim() : (user?.displayName || "Usuario")}
              </h2>
              <p className="text-indigo-200">{profileData.email || user?.email}</p>
              <p className="text-sm text-indigo-100 mt-2">
                Miembro desde: {formatMemberSince()}
              </p>

              {/* Botón cerrar sesión (se mantiene) */}
              <div className="mt-4 flex items-center justify-center md:justify-start gap-3">
                <button
                  onClick={() => signOut && signOut()}
                  title="Cerrar sesión"
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition flex items-center"
                >
                  <ArrowLeftOnRectangleIcon className="h-4 w-4 mr-2" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= Contenido principal: Info + Uso + Planes ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ---------- Columna izquierda (información + uso) ocupa 2 columnas ---------- */}
          <div className="lg:col-span-2 space-y-8">
            {/* ---- Tarjeta Información del Perfil ---- */}
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
                  <div className="p-3 bg-gray-800 rounded-md">{profileData.email || user?.email}</div>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm text-gray-400 mb-1">Plan actual</p>
                  <div className="inline-block mt-2 px-3 py-1 bg-indigo-900 text-indigo-300 rounded-full text-xs font-medium">
                    {profileData.plan === "free" || !profileData.plan ? "Free" : profileData.plan}
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Tarjeta Uso de tu cuenta ---- */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-indigo-400" />
                Uso de tu cuenta
              </h3>

              <div className="space-y-6">
                {/* Operaciones */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Operaciones</span>
                    <span className="text-gray-400">
                      {operacionesUsadas}/{operacionesTotal === Infinity ? "∞" : operacionesTotal}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all"
                      style={{
                        width: operacionesTotal === Infinity
                          ? "100%"
                          : `${Math.min((operacionesUsadas / operacionesTotal) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Exportaciones */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Exportaciones</span>
                    <span className="text-gray-400">
                      {exportacionesUsadas}/{exportacionesTotal === Infinity ? "∞" : exportacionesTotal}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5">
                    <div
                      className="bg-green-600 h-2.5 rounded-full transition-all"
                      style={{
                        width: exportacionesTotal === Infinity
                          ? "100%"
                          : `${Math.min((exportacionesUsadas / exportacionesTotal) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              </div>


            {/* ---- Historial / espacio extra si quieres más contenido ---- */}
            {/* Si más adelante quieres mostrar listados de operaciones, aquí va la tabla pequeña */}
          </div>

          {/* ---------- Columna derecha (Plan Premium + Métodos + Soporte) ---------- */}
          <div className="space-y-8">
            {/* ---------- Card: Plan Premium Mensual ---------- */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <RocketLaunchIcon className="h-5 w-5 mr-2 text-purple-400" />
                  <h3 className="text-lg font-semibold">Plan Premium</h3>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">$13 <span className="text-sm text-gray-400">/mes</span></p>
                </div>
              </div>

              <div className="mb-4 text-sm text-gray-300">
                <ul className="space-y-2">
                  <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />Operaciones ilimitadas</li>
                  <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />Exportaciones ilimitadas</li>
                  <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />Soporte prioritario</li>
                </ul>
              </div>

              {/* Métodos de pago (RESTORADOS) */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Métodos de pago</h4>
                <div className="grid grid-cols-3 gap-3">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md">PayPal</button>
                  <button className="bg-yellow-400 hover:brightness-95 text-black py-2 px-3 rounded-md">Binance Pay</button>
                  <button className="bg-cyan-500 hover:bg-cyan-600 text-white py-2 px-3 rounded-md">Blockchain Pay</button>
                </div>
              </div>

            </div>

            {/* ---------- Card: Plan Premium Anual (separada) ---------- */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <RocketLaunchIcon className="h-5 w-5 mr-2 text-purple-400" />
                  <h3 className="text-lg font-semibold">Plan Premium Anual</h3>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">$125 <span className="text-sm text-gray-400">/año</span></p>
                  <p className="text-xs text-green-400 font-semibold">Ahorra ~20%</p>
                </div>
              </div>

              <div className="mb-4 text-sm text-gray-300">
                <ul className="space-y-2">
                  <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />Operaciones ilimitadas</li>
                  <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />Exportaciones ilimitadas</li>
                  <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-green-400 mr-2" />Soporte prioritario</li>
                </ul>
              </div>

              {/* Métodos de pago (RESTORADOS) */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Métodos de pago</h4>
                <div className="grid grid-cols-3 gap-3">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md">PayPal</button>
                  <button className="bg-yellow-400 hover:brightness-95 text-black py-2 px-3 rounded-md">Binance Pay</button>
                  <button className="bg-cyan-500 hover:bg-cyan-600 text-white py-2 px-3 rounded-md">Blockchain Pay</button>
                </div>
              </div>
            </div>

            {/* ---------- Card: Contactar Soporte ---------- */}
            <div className="bg-gray-900 rounded-xl p-6 shadow-lg text-center">
              <a
                href="mailto:soportejjxcapital@gmail.com"
                className="w-full inline-block bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Contactar a Soporte
              </a>
            </div>
          </div>
        </div>

        {/* ---------- Footer spacing ---------- */}
        <div className="h-10" />
      </div>
    </div>
  );
}