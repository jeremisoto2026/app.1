import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, onSnapshot } from "firebase/firestore";
import {
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
  UserCircleIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  LifebuoyIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const asText = (value, fallback = "") => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

const countFromProfile = (data = {}) => {
  const candidates = [
    data?.exportsUsed,
    data?.usage?.exportaciones?.usadas,
    data?.usage?.exportsUsed,
    data?.usage?.exportaciones?.exportsUsed,
  ].map((value) => Number(value)).filter((value) => Number.isFinite(value) && value >= 0);
  return candidates.length ? Math.max(...candidates) : 0;
};

const formatDate = (timestamp, authDate) => {
  try {
    const date = timestamp?.toDate ? timestamp.toDate() : authDate ? new Date(authDate) : null;
    if (!date || Number.isNaN(date.getTime())) return "Fecha no disponible";
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  } catch {
    return "Fecha no disponible";
  }
};

const MetricCard = ({ label, value, caption, icon: Icon }) => (
  <div className="jjx-panel p-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-slate-400">{label}</p>
      <span className="jjx-icon-chip"><Icon className="h-5 w-5" aria-hidden="true" /></span>
    </div>
    <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{caption}</p>
  </div>
);

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [actionError, setActionError] = useState("");
  const [operationCount, setOperationCount] = useState(null);
  const [exportCount, setExportCount] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setProfileError("");
      if (!user?.uid) {
        setProfileData(null);
        setOperationCount(0);
        setLoading(false);
        return;
      }

      const authName = asText(user.displayName);
      let data = {
        nombre: authName.split(" ")[0] || "",
        apellido: authName.split(" ").slice(1).join(" "),
        email: asText(user.email, "Correo no disponible"),
        photoURL: asText(user.photoURL),
        plan: "free",
        exportsUsed: 0,
        createdAt: null,
      };

      try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));
        if (userSnapshot.exists()) data = { ...data, ...userSnapshot.data() };
      } catch (error) {
        console.error("No se pudo leer el documento del perfil:", error);
        if (!cancelled) setProfileError("No se pudo cargar toda la información guardada. Mostramos los datos básicos de tu sesión.");
      }

      try {
        const operationsSnapshot = await getDocs(collection(db, "users", user.uid, "operations"));
        if (!cancelled) setOperationCount(operationsSnapshot.size);
      } catch (error) {
        console.error("No se pudo contar el historial:", error);
        if (!cancelled) setProfileError("El perfil está disponible, pero no se pudo consultar el contador de operaciones.");
      }

      if (!cancelled) {
        // Firestore puede contener campos heredados con tipos distintos; el render solo usa texto seguro.
        const normalized = {
          ...data,
          nombre: asText(data.nombre, data.nombre && typeof data.nombre === "object" ? asText(data.nombre.nombre) : ""),
          apellido: asText(data.apellido),
          email: asText(data.email, asText(user.email, "Correo no disponible")),
          photoURL: asText(data.photoURL, asText(user.photoURL)),
          plan: asText(data.plan, "free"),
        };
        setProfileData(normalized);
        setExportCount(countFromProfile(data));
        setLoading(false);
      }
    };

    loadProfile().catch((error) => {
      console.error("Error inesperado al cargar el perfil:", error);
      if (!cancelled) {
        setProfileData({
          nombre: asText(user?.displayName).split(" ")[0] || "",
          apellido: asText(user?.displayName).split(" ").slice(1).join(" "),
          email: asText(user?.email, "Correo no disponible"),
          photoURL: asText(user?.photoURL),
          plan: "free",
          exportsUsed: 0,
          createdAt: null,
        });
        setProfileError("Ocurrió un problema al cargar el perfil. Puedes continuar usando el resto de la aplicación.");
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user?.uid, retry]);

  useEffect(() => {
    if (!user?.uid) {
      setExportCount(null);
      return undefined;
    }

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) setExportCount(countFromProfile(snapshot.data()));
      },
      (error) => {
        // Un error de contador no debe tumbar ni ocultar toda la pantalla.
        console.error("No se pudo actualizar el contador de exportaciones:", error);
      }
    );
    return unsubscribe;
  }, [user?.uid]);

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

  if (loading) {
    return (
      <div className="jjx-page min-h-[60vh] flex items-center justify-center px-4" role="status" aria-live="polite">
        <div className="text-center">
          <span className="jjx-spinner mx-auto mb-4" />
          <p className="text-sm text-slate-400">Cargando tu perfil…</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="jjx-page min-h-[60vh] flex items-center justify-center p-4">
        <section className="jjx-panel max-w-lg p-8 text-center" role="alert">
          <UserCircleIcon className="mx-auto h-10 w-10 text-violet-300" />
          <h2 className="mt-4 text-xl font-semibold text-white">No se pudo abrir el perfil</h2>
          <p className="mt-2 text-sm text-slate-400">{profileError || "No se encontraron datos de la cuenta."}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="jjx-button-primary mt-5">Volver a intentar</button>
        </section>
      </div>
    );
  }

  const firstName = asText(profileData.nombre) || asText(user?.displayName).split(" ")[0] || "Usuario";
  const fullName = [firstName, asText(profileData.apellido)].filter(Boolean).join(" ");
  const photoURL = asText(profileData.photoURL) || asText(user?.photoURL);
  const plan = asText(profileData.plan, "free").toLowerCase();
  const planLabel = plan === "free" ? "Plan gratuito" : plan.charAt(0).toUpperCase() + plan.slice(1);
  const operationsAvailable = Number.isFinite(operationCount);
  const operations = operationsAvailable ? operationCount : "—";
  const exports = Number.isFinite(exportCount) ? exportCount : countFromProfile(profileData);
  const memberSince = formatDate(profileData.createdAt, user?.metadata?.creationTime);

  return (
    <div className="jjx-page min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="jjx-panel overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" />
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              {photoURL ? (
                <img src={photoURL} alt="" className="h-20 w-20 rounded-2xl border border-white/10 object-cover shadow-lg" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-blue-500/20 text-2xl font-semibold text-white ring-1 ring-white/10">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="jjx-eyebrow">CUENTA PERSONAL</span>
                  <span className="jjx-status"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {planLabel}</span>
                </div>
                <h1 className="break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">{fullName}</h1>
                <p className="mt-1 break-all text-sm text-slate-400">{asText(profileData.email, asText(user?.email))}</p>
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500"><CalendarDaysIcon className="h-4 w-4" /> Miembro desde {memberSince}</p>
              </div>
            </div>
            <button type="button" onClick={handleSignOut} disabled={signingOut} className="jjx-button-secondary shrink-0" aria-label="Cerrar sesión">
              <ArrowLeftOnRectangleIcon className="h-4 w-4" />
              {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          </div>
        </header>

        {profileError && <div role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">{profileError}</div>}
        {actionError && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-sm text-rose-200">{actionError}</div>}

        <section aria-labelledby="profile-usage-heading" className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="profile-usage-heading" className="text-lg font-semibold tracking-tight text-white">Uso de tu cuenta</h2>
              <p className="mt-1 text-sm text-slate-400">Información de uso disponible para tu sesión.</p>
            </div>
            <span className="text-xs text-slate-500">Datos de tu cuenta · No compartidos</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label="Operaciones registradas"
              value={operations}
              caption={operationsAvailable ? "Compras y ventas guardadas" : "No se pudo consultar el historial"}
              icon={ChartBarIcon}
            />
            <MetricCard label="Exportaciones realizadas" value={exports} caption="Archivos de historial generados" icon={SparklesIcon} />
            <MetricCard label="Estado de la cuenta" value="Activa" caption="Acceso protegido por tu sesión" icon={ShieldCheckIcon} />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="jjx-panel p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="jjx-icon-chip"><UserCircleIcon className="h-5 w-5" /></span>
              <div>
                <h2 className="text-lg font-semibold text-white">Información del perfil</h2>
                <p className="mt-0.5 text-sm text-slate-400">Datos asociados a tu cuenta.</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="jjx-inset"><p className="jjx-field-label">Nombre</p><p className="mt-2 break-words text-sm text-slate-100">{firstName}</p></div>
              <div className="jjx-inset"><p className="jjx-field-label">Apellidos</p><p className="mt-2 break-words text-sm text-slate-100">{asText(profileData.apellido) || "No indicados"}</p></div>
              <div className="jjx-inset sm:col-span-2"><p className="jjx-field-label"><EnvelopeIcon className="mr-1 inline h-4 w-4" /> Correo electrónico</p><p className="mt-2 break-all text-sm text-slate-100">{asText(profileData.email, asText(user?.email, "No disponible"))}</p></div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="jjx-panel p-6">
              <div className="flex items-center gap-3">
                <span className="jjx-icon-chip"><SparklesIcon className="h-5 w-5" /></span>
                <h2 className="text-lg font-semibold text-white">Suscripciones</h2>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div>
                  <p className="text-sm font-semibold text-white">{planLabel}</p>
                  <p className="mt-1 text-xs text-slate-400">Funciones básicas de registro y análisis.</p>
                </div>
                <span className="jjx-status"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Activa</span>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">La contratación de planes de pago y las suscripciones todavía no están habilitadas.</p>
            </section>
            <section className="jjx-panel p-6">
              <div className="flex items-center gap-3">
                <span className="jjx-icon-chip"><ShieldCheckIcon className="h-5 w-5" /></span>
                <h2 className="text-lg font-semibold text-white">Privacidad y acceso</h2>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">Tu historial está separado del de otras cuentas. No compartas tu contraseña y cierra la sesión si utilizas un equipo compartido.</p>
            </section>
            <section className="jjx-panel p-6">
              <div className="flex items-center gap-3">
                <span className="jjx-icon-chip"><LifebuoyIcon className="h-5 w-5" /></span>
                <h2 className="text-lg font-semibold text-white">¿Necesitas ayuda?</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">Contacta con soporte si tienes problemas para acceder a tu cuenta o registrar una operación.</p>
              <a href="mailto:soportejjxcapital@gmail.com" className="jjx-button-secondary mt-5 w-full justify-center">Contactar con soporte</a>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
