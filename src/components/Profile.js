
// src/components/Profile.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, collection, getDocs, onSnapshot } from "firebase/firestore";

// Iconos de la interfaz
import {
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

/**
 * Perfil de usuario: consulta los datos de la cuenta y el uso registrado.
 */
const getExportUsageCount = (data = {}) => {
  const candidates = [
    data?.exportsUsed,
    data?.usage?.exportaciones?.usadas,
    data?.usage?.exportsUsed,
    data?.usage?.exportaciones?.exportsUsed,
  ].map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0);
  return candidates.length ? Math.max(...candidates) : 0;
};

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [actionError, setActionError] = useState("");
  const [operationCount, setOperationCount] = useState(0);

  // Estado adicional: contador de exportaciones en tiempo real (no toca UI/lógica existente)
  const [exportCount, setExportCount] = useState(null);

  // Valores de reserva para mostrar los contadores cuando el perfil todavía no los contiene.
  const defaultUsage = {
    operaciones: { usadas: 0 },
    exportaciones: { usadas: 0 },
  };

  // ---------- Fetch profile & usage ----------
  useEffect(() => {
    let cancelled = false;

    const fetchProfileAndUsage = async () => {
      setLoading(true);
      setProfileError("");
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
        console.error("Error al cargar el perfil y su uso:", err);
        if (!cancelled) {
          setProfileError("No se pudieron cargar los datos del perfil. Comprueba la conexión e inténtalo de nuevo.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfileAndUsage();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // ---------- Listener en tiempo real para exportaciones ----------
  // Solo añadí este efecto: escucha el documento users/{uid} y actualiza exportCount cuando cambie.
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        // Buscamos el contador en varios lugares por compatibilidad:
        // - usage.exportaciones.usadas (estructura que venías usando)
        // - exportsUsed (ejemplo JSON que compartiste antes)
        // - usage.exportsUsed (por si alguien guardó ese path)
        // - usage.exportaciones.exportsUsed (por compatibilidad extra)
        const hasAnyCounter = [
          data?.exportsUsed,
          data?.usage?.exportaciones?.usadas,
          data?.usage?.exportsUsed,
          data?.usage?.exportaciones?.exportsUsed,
        ].some((value) => value !== undefined && value !== null && value !== "");

        if (hasAnyCounter) {
          setExportCount(getExportUsageCount(data));
        }
      },
      (error) => {
        console.error("onSnapshot error (profile exports):", error);
      }
    );

    return () => unsubscribe();
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
          <div className="text-white text-xl mb-4">{profileError || "No se encontraron datos del perfil."}</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    if (!signOut || signingOut) return;
    setActionError("");
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Error al cerrar sesión desde el perfil:", error);
      setActionError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
    } finally {
      setSigningOut(false);
    }
  };

  // Uso (operaciones / exportaciones) - prioriza operationCount real
  const usage = profileData.usage || defaultUsage;
  const operacionesUsadas = operationCount ?? (usage.operaciones?.usadas || 0);

  // El límite de exportación Free sí se aplica en el historial. No se muestra
  // un límite de operaciones porque el formulario no lo impone al guardar.
  const exportacionesUsadas = (exportCount !== null && exportCount !== undefined)
    ? (Number(exportCount) || 0)
    : (Number(usage.exportaciones?.usadas) || Number(profileData.exportsUsed) || 0);

  // ---------- Render (diseño completo, sin UID, sin navegación, tarjetas separadas) ----------
  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {profileError && (
          <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">
            {profileError}
          </div>
        )}
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
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition flex items-center disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                >
                  <ArrowLeftOnRectangleIcon className="h-4 w-4 mr-2" />
                  {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                </button>
              </div>
              {actionError && (
                <p role="alert" className="text-sm text-red-300 mt-3">{actionError}</p>
              )}
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
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-300">Operaciones registradas</span>
                    <span className="text-white font-semibold">{operacionesUsadas}</span>
                  </div>
                </div>
                {/* Exportaciones */}
                <div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">Exportaciones realizadas</span>
                    <span className="text-white font-semibold">{exportacionesUsadas}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    La exportación CSV está disponible sin un límite configurado en la aplicación.
                  </p>
                </div>
              </div>
              </div>


            {/* ---- Historial / espacio extra si quieres más contenido ---- */}
            {/* Si más adelante quieres mostrar listados de operaciones, aquí va la tabla pequeña */}
          </div>

          {/* ---------- Suscripciones y soporte ---------- */}
          <div className="space-y-8">
            <section className="bg-gray-900 rounded-xl p-6 shadow-lg border border-purple-500/20">
              <div className="flex items-center gap-3 mb-3">
                <RocketLaunchIcon className="h-6 w-6 text-purple-400" />
                <h3 className="text-lg font-semibold">Suscripciones</h3>
              </div>
              <p className="text-sm text-gray-300">
                La contratación y los pagos de planes aún no están habilitados. Esta pantalla no procesa cobros ni modifica tu suscripción.
              </p>
            </section>

            <section className="bg-gray-900 rounded-xl p-6 shadow-lg text-center">
              <h3 className="text-lg font-semibold mb-2">¿Necesitas ayuda?</h3>
              <p className="text-sm text-gray-400 mb-4">
                Contacta con el equipo de soporte para consultas sobre tu cuenta.
              </p>
              <a
                href="mailto:soportejjxcapital@gmail.com"
                className="w-full inline-block bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
              >
                Contactar con soporte
              </a>
            </section>
          </div>
        </div>

        {/* ---------- Footer spacing ---------- */}
        <div className="h-10" />
      </div>
    </div>
  );
}