import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, onSnapshot } from "firebase/firestore";
import { FREE_PLAN_LIMITS, getProfileExportCount, getLimitProgress, isProSubscriptionActive } from "../utils/planLimits";
import {
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
  UserCircleIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  LifebuoyIcon,
  SparklesIcon,
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  BoltIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

const asText = (value, fallback = "") => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

const countFromProfile = getProfileExportCount;

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
  const [orderCount, setOrderCount] = useState(null);
  const [exportCount, setExportCount] = useState(null);
  const [retry, setRetry] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [payments, setPayments] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [paymentAction, setPaymentAction] = useState("");
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [blockchainInvoice, setBlockchainInvoice] = useState(null);
  const [blockchainTxHash, setBlockchainTxHash] = useState("");

  const copyPaymentDetail = async (value, label) => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        setCopyFeedback("No se pudo copiar automáticamente. Selecciona el dato y cópialo manualmente.");
        return;
      }
      await navigator.clipboard.writeText(value);
      setCopyFeedback(label + " copiado.");
    } catch (error) {
      console.error("No se pudo copiar el dato de pago:", error);
      setCopyFeedback("No se pudo copiar automáticamente. Selecciona el dato y cópialo manualmente.");
    }
  };

  const callPaymentApi = async (path, payload) => {
    if (!user?.getIdToken) throw new Error("Vuelve a iniciar sesión para realizar esta acción.");
    const token = await user.getIdToken();
    const response = await fetch(path, {
      method: payload === undefined ? "GET" : "POST",
      headers: {
        Authorization: "Bearer " + token,
        ...(payload === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo completar la solicitud de pago.");
    return data;
  };

  const loadPaymentHistory = async () => {
    if (!user?.uid) {
      setPayments([]);
      return;
    }
    try {
      const data = await callPaymentApi("/api/payments/history");
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setHistoryError("");
    } catch (error) {
      console.warn("No se pudo cargar el historial de pagos:", error);
      setHistoryError("El historial de pagos estará disponible cuando se configure el acceso seguro del servidor.");
    }
  };

  const startBinancePay = async () => {
    setPaymentActionLoading(true);
    setPaymentAction("binance");
    setPaymentError("");
    setPaymentMessage("");
    try {
      const data = await callPaymentApi("/api/payments/binance/create-order", {});
      if (!data.checkoutUrl || !/^https:\/\/pay\.binance\.com\//i.test(data.checkoutUrl)) {
        throw new Error("Binance Pay no devolvió un enlace de pago seguro.");
      }
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      setPaymentError(error.message || "No se pudo iniciar el pago con Binance Pay.");
    } finally {
      setPaymentActionLoading(false);
      setPaymentAction("");
    }
  };

  const createBlockchainInvoice = async () => {
    setPaymentActionLoading(true);
    setPaymentAction("bep20");
    setPaymentError("");
    setPaymentMessage("");
    try {
      const data = await callPaymentApi("/api/payments/blockchain/create-invoice", {});
      setBlockchainInvoice(data);
      setBlockchainTxHash("");
      setPaymentMessage("Orden creada. Envía el importe exacto que aparece abajo por BNB Smart Chain (BEP20), espera las confirmaciones e introduce el TxID.");
      await loadPaymentHistory();
    } catch (error) {
      setPaymentError(error.message || "No se pudo crear la orden BEP20.");
    } finally {
      setPaymentActionLoading(false);
      setPaymentAction("");
    }
  };

  const verifyBlockchainPayment = async (event) => {
    event.preventDefault();
    if (!blockchainInvoice?.paymentId) {
      setPaymentError("Primero crea una orden de pago BEP20.");
      return;
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(blockchainTxHash.trim())) {
      setPaymentError("Introduce un TxID válido de 66 caracteres que empiece por 0x.");
      return;
    }
    setPaymentActionLoading(true);
    setPaymentAction("verify");
    setPaymentError("");
    setPaymentMessage("");
    try {
      const data = await callPaymentApi("/api/payments/blockchain/verify", {
        paymentId: blockchainInvoice.paymentId,
        txHash: blockchainTxHash.trim(),
      });
      setProfileData((previous) => previous ? {
        ...previous,
        plan: "pro",
        subscriptionStatus: "active",
        subscriptionExpiresAt: data.expiresAt || previous.subscriptionExpiresAt,
      } : previous);
      setPaymentMessage(data.message || "Pago confirmado. JJXCAPITAL Pro está activo.");
      setBlockchainInvoice(null);
      setBlockchainTxHash("");
      await loadPaymentHistory();
    } catch (error) {
      setPaymentError(error.message || "No se pudo verificar la transacción.");
    } finally {
      setPaymentActionLoading(false);
      setPaymentAction("");
    }
  };

  const paymentStatusLabel = (status) => ({
    paid: "Pagado",
    pending: "Pendiente",
    expired: "Caducado",
    failed: "Fallido",
  }[String(status || "").toLowerCase()] || "En revisión");

  const formatPaymentDate = (value) => {
    try {
      const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
      if (!date || Number.isNaN(date.getTime())) return "Fecha pendiente";
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(date);
    } catch {
      return "Fecha pendiente";
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setProfileError("");
      if (!user?.uid) {
        setProfileData(null);
        setOperationCount(0);
        setOrderCount(0);
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
        if (!cancelled) setProfileError("El perfil está disponible, pero no se pudo consultar el contador de movimientos.");
      }

      try {
        const sessionsSnapshot = await getDocs(collection(db, "users", user.uid, "sessions"));
        if (!cancelled) setOrderCount(sessionsSnapshot.size);
      } catch (error) {
        console.error("No se pudo contar las órdenes/arbitrajes:", error);
        if (!cancelled) setOrderCount(null);
      }

      await loadPaymentHistory();

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
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        setExportCount(countFromProfile(data));
        setProfileData((previous) => previous ? {
          ...previous,
          plan: asText(data.plan, previous.plan || "free"),
          subscriptionStatus: asText(data.subscriptionStatus, previous.subscriptionStatus || ""),
          subscriptionExpiresAt: data.subscriptionExpiresAt || previous.subscriptionExpiresAt || null,
          ordersUsed: data.ordersUsed === undefined ? previous.ordersUsed : Number(data.ordersUsed),
          movementsUsed: data.movementsUsed === undefined ? previous.movementsUsed : Number(data.movementsUsed),
          exportsUsed: data.exportsUsed === undefined ? previous.exportsUsed : Number(data.exportsUsed),
          usage: data.usage || previous.usage,
        } : previous);
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
  const proActive = isProSubscriptionActive(profileData);
  const planLabel = proActive ? "Pro activo" : "Plan gratuito";
  const storedOrderCount = Number(profileData.ordersUsed);
  const storedMovementCount = Number(profileData.movementsUsed);
  const hasStoredOrderCount = Number.isFinite(storedOrderCount) && storedOrderCount >= 0;
  const hasStoredMovementCount = Number.isFinite(storedMovementCount) && storedMovementCount >= 0;
  const ordersAvailable = Number.isFinite(orderCount) || hasStoredOrderCount;
  const operationsAvailable = Number.isFinite(operationCount) || hasStoredMovementCount;
  const ordersUsed = Math.max(Number.isFinite(orderCount) ? orderCount : 0, hasStoredOrderCount ? storedOrderCount : 0);
  const movementsUsed = Math.max(Number.isFinite(operationCount) ? operationCount : 0, hasStoredMovementCount ? storedMovementCount : 0);
  const operations = operationsAvailable ? movementsUsed : "—";
  const exports = Number.isFinite(exportCount) ? exportCount : countFromProfile(profileData);
  const memberSince = formatDate(profileData.createdAt, user?.metadata?.creationTime);
  const orderUsage = ordersAvailable ? getLimitProgress(ordersUsed, FREE_PLAN_LIMITS.orders) : null;
  const movementUsage = operationsAvailable ? getLimitProgress(movementsUsed, FREE_PLAN_LIMITS.movements) : null;
  const exportUsage = getLimitProgress(exports, FREE_PLAN_LIMITS.exports);
  const currentExpiryLabel = proActive ? formatPaymentDate(profileData.subscriptionExpiresAt) : "";

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
              label="Movimientos registrados"
              value={operations}
              caption={operationsAvailable ? "Compras y ventas guardadas" : "No se pudo consultar el historial"}
              icon={ChartBarIcon}
            />
            <MetricCard label="Exportaciones realizadas" value={exports} caption="Archivos de historial generados" icon={SparklesIcon} />
            <MetricCard label="Estado de la cuenta" value="Activa" caption="Acceso protegido por tu sesión" icon={ShieldCheckIcon} />
          </div>
        </section>

        <section aria-labelledby="plan-limits-heading" className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="jjx-eyebrow">TIPO DE PLAN ACTUAL</span>
              <h2 id="plan-limits-heading" className="mt-1 text-lg font-semibold tracking-tight text-white">
                {proActive ? "JJXCAPITAL Pro · Acceso ilimitado" : "Plan gratuito · Límites de uso"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {proActive
                  ? "Todas las funciones están ilimitadas hasta " + currentExpiryLabel + "."
                  : "Tu consumo se compara con los límites del plan gratuito. Tus datos e historial se conservan."}
              </p>
            </div>
            <span className="jjx-status">
              <span className={`h-1.5 w-1.5 rounded-full ${proActive ? "bg-emerald-400" : "bg-slate-400"}`} />
              {proActive ? "Pro activo" : "Gratuito"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="jjx-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-200">Órdenes / arbitrajes</p>
                <span className="text-xs text-slate-500">{proActive ? "Sin límite" : "300 máximo"}</span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-white">{proActive ? "Ilimitado" : ordersAvailable ? ordersUsed : "—"}</p>
              {!proActive && <p className="mt-1 text-xs text-slate-400">{ordersAvailable ? `de ${FREE_PLAN_LIMITS.orders} · ${orderUsage.remaining} disponibles` : "No se pudo cargar el contador"}</p>}
              {!proActive && <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${orderUsage?.percent || 0}%` }} /></div>}
              {proActive && <p className="mt-1 text-xs text-emerald-300">Sin límite durante tu suscripción</p>}
            </article>

            <article className="jjx-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-200">Movimientos</p>
                <span className="text-xs text-slate-500">{proActive ? "Sin límite" : "150 máximo"}</span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-white">{proActive ? "Ilimitado" : operationsAvailable ? operationCount : "—"}</p>
              {!proActive && <p className="mt-1 text-xs text-slate-400">{operationsAvailable ? `de ${FREE_PLAN_LIMITS.movements} · ${movementUsage.remaining} disponibles` : "No se pudo cargar el contador"}</p>}
              {!proActive && <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${movementUsage?.percent || 0}%` }} /></div>}
              {proActive && <p className="mt-1 text-xs text-emerald-300">Sin límite durante tu suscripción</p>}
            </article>

            <article className="jjx-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-200">Exportaciones</p>
                <span className="text-xs text-slate-500">{proActive ? "Sin límite" : "50 máximo"}</span>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-white">{proActive ? "Ilimitadas" : exports}</p>
              {!proActive && <p className="mt-1 text-xs text-slate-400">{`de ${FREE_PLAN_LIMITS.exports} · ${exportUsage.remaining} disponibles`}</p>}
              {!proActive && <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${exportUsage.percent}%` }} /></div>}
              {proActive && <p className="mt-1 text-xs text-emerald-300">Sin límite durante tu suscripción</p>}
            </article>
          </div>
        </section>

        <section aria-labelledby="billing-heading" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="jjx-eyebrow">CUENTA Y SUSCRIPCIÓN</span>
              <h2 id="billing-heading" className="mt-1 text-xl font-semibold tracking-tight text-white">Planes y facturación</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">Consulta tu plan, revisa el uso de tu cuenta y encuentra aquí la información de tus pagos.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-1.5 text-xs font-semibold text-amber-100">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              Cobros en preparación
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <section className="jjx-panel overflow-hidden" aria-labelledby="current-plan-heading">
                <div className="h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" />
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="jjx-eyebrow">TU PLAN ACTUAL</span>
                      <h3 id="current-plan-heading" className="mt-2 text-2xl font-semibold tracking-tight text-white">{planLabel}</h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Tu cuenta puede seguir utilizando las funciones que ya están disponibles. No se realizará ningún cobro desde esta pantalla.</p>
                    </div>
                    <span className="jjx-status"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Activo</span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="jjx-inset">
                      <div className="flex items-center gap-2 text-slate-400">
                        <ChartBarIcon className="h-4 w-4" aria-hidden="true" />
                        <span className="text-xs font-medium">Operaciones</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{operations}</p>
                      <p className="mt-1 text-xs text-slate-500">Registros en tu historial</p>
                    </div>
                    <div className="jjx-inset">
                      <div className="flex items-center gap-2 text-slate-400">
                        <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                        <span className="text-xs font-medium">Exportaciones</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{exports}</p>
                      <p className="mt-1 text-xs text-slate-500">Exportaciones contabilizadas</p>
                    </div>
                    <div className="jjx-inset">
                      <div className="flex items-center gap-2 text-slate-400">
                        <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
                        <span className="text-xs font-medium">Facturación</span>
                      </div>
                      <p className="mt-2 text-lg font-semibold tracking-tight text-white">{proActive ? "Pro activo" : "Sin activar"}</p>
                      <p className="mt-1 text-xs text-slate-500">{proActive ? "Vence: " + currentExpiryLabel : "No hay una suscripción activa"}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-500">Los contadores se comprueban en el servidor. Los datos e historial se conservan aunque cambies de plan.</p>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Planes disponibles">
                <article className="jjx-panel p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="jjx-eyebrow">{proActive ? "PLAN DISPONIBLE" : "PLAN ACTUAL"}</span>
                    <span className={"rounded-full border px-2.5 py-1 text-[10px] font-bold " + (proActive ? "border-white/10 bg-white/5 text-slate-300" : "border-emerald-300/20 bg-emerald-300/5 text-emerald-200")}>{proActive ? "DISPONIBLE" : "ACTIVO"}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">Gratuito</h3>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-white">0 € <span className="text-xs font-medium text-slate-500">/ siempre</span></p>
                  <p className="mt-3 min-h-[42px] text-sm leading-5 text-slate-400">Para registrar, revisar y organizar tus operaciones.</p>
                  <ul className="mt-5 space-y-3 text-sm text-slate-300">
                    <li className="flex items-start gap-2"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> Resumen y métricas de actividad</li>
                    <li className="flex items-start gap-2"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> Registro de operaciones y arbitrajes</li>
                    <li className="flex items-start gap-2"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> Historial disponible en la aplicación</li>
                  </ul>
                  <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-center text-xs font-semibold text-slate-400">{proActive ? "Podrás volver a este plan cuando termine la suscripción Pro." : "Ya estás usando este plan"}</div>
                </article>

                <article className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-b from-violet-500/[0.10] to-slate-950/60 p-5 sm:p-6">
                  <div className={"absolute right-0 top-0 rounded-bl-xl border-b border-l px-3 py-1.5 text-[10px] font-bold tracking-wide " + (proActive ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-violet-300/20 bg-violet-300/10 text-violet-200")}>{proActive ? "PLAN ACTIVO" : "PLAN PREMIUM"}</div>
                  <span className="jjx-eyebrow">PLAN AMPLIADO</span>
                  <h3 className="mt-4 text-xl font-semibold text-white">JJXCAPITAL Pro</h3>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-white">15 USDT <span className="text-xs font-medium text-slate-500">/ 30 días</span></p>
                  <p className="mt-3 min-h-[42px] text-sm leading-5 text-slate-400">Pago de 15 USDT por 30 días. Órdenes/arbitrajes, movimientos y exportaciones ilimitados durante la suscripción activa.</p>
                  <ul className="mt-5 space-y-3 text-sm text-slate-300">
                    <li className="flex items-start gap-2"><BoltIcon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /> Órdenes y arbitrajes ilimitados</li>
                    <li className="flex items-start gap-2"><CreditCardIcon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /> Movimientos y exportaciones ilimitados</li>
                    <li className="flex items-start gap-2"><ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /> Acceso ilimitado durante 30 días desde la confirmación</li>
                  </ul>
                  <button type="button" disabled className="jjx-button-primary mt-6 w-full justify-center opacity-60" title={proActive ? "Tu suscripción ya está activa" : "La activación se habilita tras confirmar el pago en el servidor"}>{proActive ? "Pro activo · vence " + currentExpiryLabel : "Pago de Pro en preparación"}</button>
                </article>
              </section>
            </div>

            <div className="space-y-5">
              <section className="jjx-panel p-5 sm:p-6" aria-labelledby="payment-method-heading">
                <div className="flex items-center gap-3">
                  <span className="jjx-icon-chip"><CreditCardIcon className="h-5 w-5" aria-hidden="true" /></span>
                  <div>
                    <h3 id="payment-method-heading" className="text-lg font-semibold text-white">Métodos de pago</h3>
                    <p className="mt-0.5 text-sm text-slate-400">JJXCAPITAL Pro · 15 USDT por 30 días</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">Binance Pay</p>
                        <p className="mt-1 text-xs text-slate-400">Checkout oficial · 15 USDT</p>
                        <p className="mt-1 text-[11px] text-slate-500">ID de referencia: 807678814</p>
                        <p className="mt-2 max-w-sm text-[11px] leading-5 text-slate-500">El ID por sí solo no crea una orden. El checkout automático requiere una cuenta Binance Pay Merchant y sus credenciales API en Vercel.</p>
                      </div>
                      <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-2.5 py-1 text-[10px] font-bold text-amber-100">Requiere credenciales</span>
                    </div>
                    <button
                      type="button"
                      onClick={startBinancePay}
                      disabled={paymentActionLoading}
                      className="jjx-button-primary mt-4 w-full justify-center"
                    >
                      {paymentAction === "binance" ? "Creando orden segura…" : "Pagar con Binance Pay"}
                    </button>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">Blockchain Pay · USDT BEP20</p>
                        <p className="mt-1 text-xs text-slate-400">Precio base: 15 USDT + una fracción identificadora inferior a 0,01 USDT. El importe está limitado a cuatro decimales.</p>
                      </div>
                      <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-2.5 py-1 text-[10px] font-bold text-amber-100">BNB Smart Chain</span>
                    </div>
                    <p className="mt-4 text-[10px] uppercase tracking-wide text-slate-500">Dirección de recepción</p>
                    <p className="mt-1 break-all font-mono text-xs leading-6 text-slate-200">{blockchainInvoice?.recipient || "0x4c64b783f1babc0a2fe62f174873f415393c2269"}</p>
                    <button
                      type="button"
                      onClick={() => copyPaymentDetail(blockchainInvoice?.recipient || "0x4c64b783f1babc0a2fe62f174873f415393c2269", "Dirección BEP20")}
                      className="jjx-button-secondary mt-3 w-full justify-center"
                    >
                      Copiar dirección BEP20
                    </button>
                    <div className="mt-4 rounded-lg border border-white/[0.07] bg-black/10 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Red obligatoria</p>
                      <p className="mt-1 text-sm font-semibold text-white">BNB Smart Chain (BEP20) · Chain ID 56</p>
                      <p className="mt-2 break-all font-mono text-[10px] leading-5 text-slate-400">Contrato configurado: {blockchainInvoice?.tokenContract || "0x55d398326f99059fF775485246999027B3197955"}</p>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-amber-100/90">Envía solo USDT por BNB Smart Chain (BEP20). No uses ERC20, TRC20 ni otra red. La red y el token deben coincidir exactamente para verificar el pago.</p>
                    <button
                      type="button"
                      onClick={createBlockchainInvoice}
                      disabled={paymentActionLoading}
                      className="jjx-button-primary mt-4 w-full justify-center"
                    >
                      {paymentAction === "bep20" ? "Creando orden…" : "Crear orden y pagar con BEP20"}
                    </button>

                    {blockchainInvoice && (
                      <form onSubmit={verifyBlockchainPayment} className="mt-4 space-y-3 rounded-xl border border-violet-300/20 bg-violet-300/[0.04] p-4">
                        <div className="space-y-3">
                          <div className="rounded-xl border-2 border-amber-300/80 bg-amber-300/[0.10] p-4 shadow-lg shadow-amber-500/10">
                            <p className="text-center text-xs font-extrabold uppercase tracking-widest text-amber-200">Importe exacto que debes enviar</p>
                            <p aria-label={`Importe exacto ${Number(blockchainInvoice.amount).toFixed(4)} USDT`} className="mt-3 break-all text-center font-mono text-3xl font-black tracking-tight text-white sm:text-4xl">
                              {Number(blockchainInvoice.amount).toFixed(8)}
                            </p>
                            <p className="mt-1 text-center text-xl font-extrabold text-amber-100">USDT</p>
                            <button
                              type="button"
                              onClick={() => copyPaymentDetail(Number(blockchainInvoice.amount).toFixed(8), "Importe exacto")}
                              className="jjx-button-secondary mt-4 w-full justify-center border-amber-200/40 font-bold text-white"
                            >
                              Copiar importe exacto
                            </button>
                            <p className="mt-3 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-center text-sm font-extrabold leading-5 text-rose-100">
                              No envíes 15 USDT exactos si el total de arriba es distinto. Envía exactamente el importe que ves arriba, con sus cuatro decimales.
                            </p>
                          </div>
                          <p className="break-all font-mono text-[10px] text-slate-400">Orden: {blockchainInvoice.paymentId}</p>
                          <p className="text-sm font-semibold text-slate-300">Red obligatoria: BNB Smart Chain (BEP20)</p>
                          <p className="text-xs text-slate-500">Caduca: {formatPaymentDate(blockchainInvoice.expiresAt)}</p>
                        </div>
                        <label htmlFor="blockchain-tx-id" className="block text-xs font-semibold text-slate-300">TxID de la transferencia</label>
                        <input
                          id="blockchain-tx-id"
                          type="text"
                          inputMode="text"
                          autoComplete="off"
                          spellCheck="false"
                          maxLength={66}
                          placeholder="0x…"
                          value={blockchainTxHash}
                          onChange={(event) => setBlockchainTxHash(event.target.value.trim())}
                          className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-3 font-mono text-xs text-white placeholder:text-slate-600 focus:border-violet-400 focus:outline-none"
                        />
                        <p className="text-[11px] leading-5 text-slate-500">Después de enviar el importe exacto, pega aquí el hash. La orden añade una fracción identificadora de 0,0001 a 0,0099 USDT, compatible con cuatro decimales. El servidor comprobará contrato, destinatario, importe y 12 confirmaciones.</p>
                        <button type="submit" disabled={paymentActionLoading} className="jjx-button-primary w-full justify-center">
                          {paymentAction === "verify" ? "Verificando en blockchain…" : "Verificar transferencia automáticamente"}
                        </button>
                      </form>
                    )}
                  </div>

                  {copyFeedback && <p role="status" className="text-xs leading-5 text-slate-300">{copyFeedback}</p>}
                  {paymentError && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-xs leading-5 text-rose-200">{paymentError}</p>}
                  {paymentMessage && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3 text-xs leading-5 text-emerald-200">{paymentMessage}</p>}
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3">
                  <LockClosedIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden="true" />
                  <p className="text-xs leading-5 text-slate-400">La verificación no confía solo en el TxID: consulta la blockchain y exige el token, la red, el destinatario, el importe exacto y 12 confirmaciones antes de activar Pro. Para habilitar pagos reales, configura las credenciales seguras de Firebase y Binance Pay en Vercel y registra el webhook del comercio.</p>
                </div>
              </section>

              <section className="jjx-panel p-5 sm:p-6" aria-labelledby="payment-history-heading">
                <div className="flex items-center gap-3">
                  <span className="jjx-icon-chip"><ClockIcon className="h-5 w-5" aria-hidden="true" /></span>
                  <div>
                    <h3 id="payment-history-heading" className="text-lg font-semibold text-white">Historial de pagos</h3>
                    <p className="mt-0.5 text-sm text-slate-400">Órdenes y comprobantes vinculados a tu cuenta</p>
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.08]">
                  {payments.length ? (
                    <div className="divide-y divide-white/[0.07]">
                      {payments.map((payment) => (
                        <div key={payment.id || payment.paymentId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                              {payment.provider === "binance_pay" ? "Binance Pay" : "USDT · BNB Smart Chain (BEP20)"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">{formatPaymentDate(payment.createdAt)}</p>
                            <p className="mt-1 text-xs text-slate-400">{payment.amount || 15} {payment.currency || "USDT"}</p>
                            {payment.txHash && (
                              <a className="mt-2 inline-block break-all text-xs text-violet-300 underline underline-offset-2" href={"https://bscscan.com/tx/" + payment.txHash} target="_blank" rel="noreferrer">Ver transacción en BscScan</a>
                            )}
                            {payment.transactionId && <p className="mt-2 break-all text-[10px] text-slate-500">Referencia: {payment.transactionId}</p>}
                          </div>
                          <span className={"inline-flex w-fit shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold " + (
                            payment.status === "paid"
                              ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-200"
                              : payment.status === "failed" || payment.status === "expired"
                                ? "border-rose-300/20 bg-rose-300/5 text-rose-200"
                                : "border-amber-300/20 bg-amber-300/5 text-amber-100"
                          )}>{paymentStatusLabel(payment.status)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <CreditCardIcon className="mx-auto h-7 w-7 text-slate-600" aria-hidden="true" />
                      <p className="mt-3 text-sm font-medium text-slate-300">Todavía no hay pagos registrados</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Cuando crees una orden de pago, aparecerá aquí su importe y estado.</p>
                    </div>
                  )}
                </div>
                {historyError && <p role="status" className="mt-3 text-xs leading-5 text-amber-100/80">{historyError}</p>}
                <button type="button" onClick={loadPaymentHistory} disabled={paymentActionLoading} className="jjx-button-secondary mt-4 w-full justify-center">Actualizar historial</button>
                <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
                  <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  El historial se actualiza desde el servidor; los usuarios no pueden marcar sus propios pagos como pagados.
                </div>
              </section>
            </div>
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
