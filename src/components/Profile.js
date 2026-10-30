import React, { useEffect, useState } from "react";
import "./Profile.css";
import BinanceP2PSyncCard from "./BinanceP2PSyncCard";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, onSnapshot } from "firebase/firestore";
import { FREE_PLAN_LIMITS, getProfileExportCount, getLimitProgress, isProSubscriptionActive } from "../utils/planLimits";
import { getEffectivePaymentStatus, getVisiblePaymentHistory } from "../utils/paymentStatus";
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
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
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

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [actionError, setActionError] = useState("");
  const [orderCount, setOrderCount] = useState(null);
  const [arbitrageCount, setArbitrageCount] = useState(null);
  const [exportCount, setExportCount] = useState(null);
  const [retry, setRetry] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [payments, setPayments] = useState([]);
  const [paymentStatusNow, setPaymentStatusNow] = useState(() => Date.now());
  const [showExpiredPayments, setShowExpiredPayments] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [paymentAction, setPaymentAction] = useState("");
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [blockchainInvoice, setBlockchainInvoice] = useState(null);
  const [blockchainTxHash, setBlockchainTxHash] = useState("");

  useEffect(() => {
    const hasActiveExpiringPayment = payments.some((payment) => {
      const expiresAt = payment?.expiresAt?.toDate
        ? payment.expiresAt.toDate().getTime()
        : Date.parse(payment?.expiresAt || "");
      return String(payment?.status || "").toLowerCase() === "pending" &&
        Number.isFinite(expiresAt) &&
        expiresAt > paymentStatusNow;
    });

    if (!hasActiveExpiringPayment) return undefined;

    const timer = setInterval(() => setPaymentStatusNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [payments, paymentStatusNow]);

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
        setOrderCount(0);
        setArbitrageCount(0);
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
        if (!cancelled) setOrderCount(operationsSnapshot.size);
      } catch (error) {
        console.error("No se pudo contar el historial:", error);
        if (!cancelled) setProfileError("El perfil está disponible, pero no se pudo consultar el contador de movimientos.");
      }

      try {
        const sessionsSnapshot = await getDocs(collection(db, "users", user.uid, "sessions"));
        if (!cancelled) setArbitrageCount(sessionsSnapshot.size);
      } catch (error) {
        console.error("No se pudo contar los arbitrajes registrados:", error);
        if (!cancelled) setArbitrageCount(null);
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
  // Los contadores visibles se calculan desde sus colecciones reales para no mezclar
  // los campos históricos ordersUsed/movementsUsed, que tenían el significado invertido.
  const ordersAvailable = Number.isFinite(orderCount);
  const arbitragesAvailable = Number.isFinite(arbitrageCount);
  const ordersUsed = ordersAvailable ? orderCount : 0;
  const arbitragesUsed = arbitragesAvailable ? arbitrageCount : 0;
  const exports = Number.isFinite(exportCount) ? exportCount : countFromProfile(profileData);
  const memberSince = formatDate(profileData.createdAt, user?.metadata?.creationTime);
  const orderUsage = ordersAvailable ? getLimitProgress(ordersUsed, FREE_PLAN_LIMITS.orders) : null;
  const movementUsage = arbitragesAvailable ? getLimitProgress(arbitragesUsed, FREE_PLAN_LIMITS.movements) : null;
  const exportUsage = getLimitProgress(exports, FREE_PLAN_LIMITS.exports);
  const currentExpiryLabel = proActive ? formatPaymentDate(profileData.subscriptionExpiresAt) : "";
  const expiredPaymentCount = payments.filter(
    (payment) => getEffectivePaymentStatus(payment, paymentStatusNow) === "expired"
  ).length;
  const visiblePayments = getVisiblePaymentHistory(payments, paymentStatusNow, showExpiredPayments);

  return (
    <div className="jjx-page profile-page min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="profile-container mx-auto max-w-6xl space-y-6">
        <div className="profile-page-heading">
          <div>
            <span className="jjx-eyebrow">JJXCAPITAL · CUENTA</span>
            <h1 className="profile-page-title">Perfil y suscripción</h1>
            <p className="profile-page-subtitle">Administra tu cuenta, consulta tus límites y revisa las opciones de tu plan.</p>
          </div>
          <div className="profile-private-note">
            <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
            <span>Espacio privado</span>
          </div>
        </div>

        <header className="profile-hero jjx-panel overflow-hidden">
          <div className="profile-hero-accent" />
          <div className="profile-hero-content">
            <div className="profile-identity">
              {photoURL ? (
                <img src={photoURL} alt="" className="profile-avatar" referrerPolicy="no-referrer" />
              ) : (
                <div className="profile-avatar profile-avatar-fallback">{firstName.charAt(0).toUpperCase()}</div>
              )}
              <div className="profile-identity-copy">
                <div className="profile-label-row">
                  <span className="profile-account-label">CUENTA PERSONAL</span>
                  <span className={`profile-plan-status ${proActive ? "profile-plan-status-pro" : "profile-plan-status-free"}`}>
                    <span className="profile-status-dot" />
                    {planLabel}
                  </span>
                </div>
                <h2 className="profile-user-name">{fullName}</h2>
                <p className="profile-user-email">{asText(profileData.email, asText(user?.email))}</p>
                <p className="profile-member-since"><CalendarDaysIcon className="h-4 w-4" /> Miembro desde {memberSince}</p>
              </div>
            </div>
            <div className="profile-hero-actions">
              <div className="profile-hero-plan">
                <span className="profile-mini-label">PLAN ACTUAL</span>
                <strong>{proActive ? "Pro · Ilimitado" : "Gratuito"}</strong>
                <span>{proActive ? "Vence el " + currentExpiryLabel : "Hasta 300 órdenes · 150 arbitrajes registrados · 50 exportaciones"}</span>
              </div>
              <button type="button" onClick={handleSignOut} disabled={signingOut} className="jjx-button-secondary profile-signout" aria-label="Cerrar sesión">
                <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
              </button>
            </div>
          </div>
        </header>

        {profileError && <div role="status" className="profile-alert profile-alert-warning">{profileError}</div>}
        {actionError && <div role="alert" className="profile-alert profile-alert-error">{actionError}</div>}

        <section className="profile-account-section profile-surface jjx-panel p-6 sm:p-7" aria-labelledby="profile-account-heading">
          <div className="profile-card-heading">
            <span className="jjx-icon-chip"><UserCircleIcon className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <span className="jjx-eyebrow">DATOS PERSONALES</span>
              <h2 id="profile-account-heading">Información del perfil</h2>
              <p>Datos de contacto asociados a tu cuenta JJXCAPITAL.</p>
            </div>
          </div>
          <div className="profile-details-grid">
            <div className="jjx-inset">
              <p className="jjx-field-label">Nombre</p>
              <p className="mt-2 break-words text-sm text-slate-100">{firstName}</p>
            </div>
            <div className="jjx-inset">
              <p className="jjx-field-label">Apellidos</p>
              <p className="mt-2 break-words text-sm text-slate-100">{asText(profileData.apellido) || "No indicados"}</p>
            </div>
            <div className="jjx-inset profile-email-field">
              <p className="jjx-field-label"><EnvelopeIcon className="mr-1 inline h-4 w-4" /> Correo electrónico</p>
              <p className="mt-2 break-all text-sm text-slate-100">{asText(profileData.email, asText(user?.email, "No disponible"))}</p>
            </div>
          </div>
        </section>

        <BinanceP2PSyncCard />

        <section aria-labelledby="profile-usage-heading" className="profile-section space-y-4">
          <div className="profile-section-heading">
            <div>
              <span className="jjx-eyebrow">TIPO DE PLAN ACTUAL</span>
              <h2 id="profile-usage-heading">{proActive ? "JJXCAPITAL Pro · Acceso ilimitado" : "Uso de tu cuenta y límites"}</h2>
              <p>{proActive
                ? "Todas las funciones están ilimitadas hasta " + currentExpiryLabel + "."
                : "Consulta tu consumo y el número de acciones que todavía tienes disponibles."}</p>
            </div>
            <span className={`profile-billing-status ${proActive ? "profile-billing-status-active" : "profile-billing-status-free"}`}>
              <span className="profile-status-dot" />
              {proActive ? "Pro activo" : "Gratuito"}
            </span>
          </div>

          <div className="profile-usage-grid grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="profile-usage-card jjx-panel p-5">
              <div className="profile-usage-card-heading">
                <span className="profile-usage-icon profile-usage-icon-orders"><BoltIcon className="h-5 w-5" aria-hidden="true" /></span>
                <div><p>Órdenes realizadas</p><span>{proActive ? "Sin límite" : "Máximo 300"}</span></div>
              </div>
              <p className="profile-usage-value">{proActive ? "Ilimitado" : ordersAvailable ? ordersUsed : "—"}</p>
              {!proActive && <p className="profile-usage-caption">{ordersAvailable ? `de ${FREE_PLAN_LIMITS.orders} · ${orderUsage.remaining} disponibles` : "No se pudo cargar el contador"}</p>}
              {!proActive && <div className="profile-progress-track"><span style={{ width: `${orderUsage?.percent || 0}%` }} /></div>}
              {proActive && <p className="profile-usage-caption profile-usage-positive">Incluido durante tu suscripción</p>}
            </article>

            <article className="profile-usage-card jjx-panel p-5">
              <div className="profile-usage-card-heading">
                <span className="profile-usage-icon profile-usage-icon-movements"><ChartBarIcon className="h-5 w-5" aria-hidden="true" /></span>
                <div><p>Arbitrajes Registrados</p><span>{proActive ? "Sin límite" : "Máximo 150"}</span></div>
              </div>
              <p className="profile-usage-value">{proActive ? "Ilimitado" : arbitragesAvailable ? arbitragesUsed : "—"}</p>
              {!proActive && <p className="profile-usage-caption">{arbitragesAvailable ? `de ${FREE_PLAN_LIMITS.movements} · ${movementUsage.remaining} disponibles` : "No se pudo cargar el contador"}</p>}
              {!proActive && <div className="profile-progress-track"><span style={{ width: `${movementUsage?.percent || 0}%` }} /></div>}
              {proActive && <p className="profile-usage-caption profile-usage-positive">Incluido durante tu suscripción</p>}
            </article>

            <article className="profile-usage-card jjx-panel p-5">
              <div className="profile-usage-card-heading">
                <span className="profile-usage-icon profile-usage-icon-exports"><SparklesIcon className="h-5 w-5" aria-hidden="true" /></span>
                <div><p>Exportaciones</p><span>{proActive ? "Sin límite" : "Máximo 50"}</span></div>
              </div>
              <p className="profile-usage-value">{proActive ? "Ilimitadas" : exports}</p>
              {!proActive && <p className="profile-usage-caption">{`de ${FREE_PLAN_LIMITS.exports} · ${exportUsage.remaining} disponibles`}</p>}
              {!proActive && <div className="profile-progress-track"><span style={{ width: `${exportUsage.percent}%` }} /></div>}
              {proActive && <p className="profile-usage-caption profile-usage-positive">Incluido durante tu suscripción</p>}
            </article>
          </div>
          <p className="profile-usage-footnote"><ShieldCheckIcon className="h-4 w-4" /> Los contadores se comprueban en el servidor. Tus operaciones e historial se conservan aunque cambies de plan.</p>
        </section>

        <section aria-labelledby="billing-heading" className="profile-section space-y-4">
          <div className="profile-section-heading">
            <div>
              <span className="jjx-eyebrow">PLANES Y FACTURACIÓN</span>
              <h2 id="billing-heading">Elige cómo quieres trabajar</h2>
              <p>Empieza gratis o amplía el acceso con JJXCAPITAL Pro por 15 USDT durante 30 días.</p>
            </div>
            <span className={`profile-billing-status ${proActive ? "profile-billing-status-active" : "profile-billing-status-pending"}`}>
              <span className="profile-status-dot" />
              {proActive ? "Suscripción activa" : "Activación tras confirmar el pago"}
            </span>
          </div>

                        <section className="profile-plan-grid grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Planes disponibles">
                <article className="profile-plan-card profile-plan-card-free jjx-panel p-5 sm:p-6">
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

                <article className="profile-plan-card profile-plan-card-pro relative overflow-hidden rounded-2xl border p-5 sm:p-6">
                  <div className={"absolute right-0 top-0 rounded-bl-xl border-b border-l px-3 py-1.5 text-[10px] font-bold tracking-wide " + (proActive ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-violet-300/20 bg-violet-300/10 text-violet-200")}>{proActive ? "PLAN ACTIVO" : "PLAN PRO"}</div>
                  <span className="jjx-eyebrow">PLAN AMPLIADO</span>
                  <h3 className="mt-4 text-xl font-semibold text-white">JJXCAPITAL Pro</h3>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-white">15 USDT <span className="text-xs font-medium text-slate-500">/ 30 días</span></p>
                  <p className="mt-3 min-h-[42px] text-sm leading-5 text-slate-400">Pago de 15 USDT por 30 días. Órdenes/arbitrajes, movimientos y exportaciones ilimitados durante la suscripción activa.</p>
                  <ul className="mt-5 space-y-3 text-sm text-slate-300">
                    <li className="flex items-start gap-2"><BoltIcon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /> Órdenes y arbitrajes ilimitados</li>
                    <li className="flex items-start gap-2"><CreditCardIcon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /> Movimientos y exportaciones ilimitados</li>
                    <li className="flex items-start gap-2"><ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /> Acceso ilimitado durante 30 días desde la confirmación</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => document.getElementById("payment-method-heading")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    disabled={proActive}
                    className={"jjx-button-primary mt-6 w-full justify-center" + (proActive ? " opacity-60" : "")}
                    title={proActive ? "Tu suscripción ya está activa" : "Ir al pago seguro mediante blockchain"}
                  >
                    {proActive ? "Pro activo · vence " + currentExpiryLabel : "Elegir Pro y pagar con blockchain"}
                  </button>
                </article>
              </section>

          <div className="profile-payment-heading">
            <div>
              <h3>Pagos y comprobantes</h3>
              <p>Paga JJXCAPITAL Pro mediante USDT en BNB Smart Chain (BEP20), con verificación automática.</p>
            </div>
          </div>
          <div className="profile-payment-grid">
            <section className="profile-surface jjx-panel p-5 sm:p-6" aria-labelledby="payment-method-heading">
                <div className="flex items-center gap-3">
                  <span className="jjx-icon-chip"><CreditCardIcon className="h-5 w-5" aria-hidden="true" /></span>
                  <div>
                    <h3 id="payment-method-heading" className="text-lg font-semibold text-white">Método de pago</h3>
                    <p className="mt-0.5 text-sm text-slate-400">JJXCAPITAL Pro · 15 USDT por 30 días</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">USDT por blockchain · BEP20</p>
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
                          <div className="blockchain-amount-card">
                            <div className="blockchain-amount-heading">
                              <span className="blockchain-amount-icon" aria-hidden="true">
                                <ShieldCheckIcon className="h-4 w-4" />
                              </span>
                              <div className="blockchain-amount-heading-copy">
                                <p>Importe exacto que debes enviar</p>
                                <span>Importe de esta orden</span>
                              </div>
                              <span className="blockchain-amount-required">Obligatorio</span>
                            </div>

                            <div className="blockchain-amount-value-wrap">
                              <p aria-label={`Importe exacto ${Number(blockchainInvoice.amount).toFixed(4)} USDT`} className="blockchain-amount-value">
                                {Number(blockchainInvoice.amount).toFixed(4)}
                              </p>
                              <span className="blockchain-amount-currency">USDT</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => copyPaymentDetail(Number(blockchainInvoice.amount).toFixed(4), "Importe exacto")}
                              className="blockchain-copy-amount-button"
                            >
                              <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
                              Copiar importe exacto
                            </button>

                            <div className="blockchain-amount-warning" role="note">
                              <ExclamationTriangleIcon className="blockchain-amount-warning-icon h-4 w-4" aria-hidden="true" />
                              <p><strong>Importante:</strong> no envíes 15 USDT exactos si el total de arriba es distinto. Envía exactamente el importe que aparece, con sus cuatro decimales.</p>
                            </div>
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
                  <p className="text-xs leading-5 text-slate-400">La verificación consulta la blockchain y comprueba el token, la red, el destinatario, el importe exacto y las 12 confirmaciones antes de activar Pro.</p>
                </div>
              </section>

            <section className="profile-surface jjx-panel p-5 sm:p-6" aria-labelledby="payment-history-heading">
                <div className="flex items-center gap-3">
                  <span className="jjx-icon-chip"><ClockIcon className="h-5 w-5" aria-hidden="true" /></span>
                  <div>
                    <h3 id="payment-history-heading" className="text-lg font-semibold text-white">Historial de pagos</h3>
                    <p className="mt-0.5 text-sm text-slate-400">Órdenes y comprobantes vinculados a tu cuenta</p>
                    <p className="mt-1 text-xs text-slate-500">Las órdenes tienen 30 minutos de validez; si transferiste dentro del plazo, aún puedes verificar el pago después.</p>
                  </div>
                </div>
                {expiredPaymentCount > 0 && (
                  <div className="payment-history-tools">
                    <span>{showExpiredPayments ? "Mostrando también órdenes caducadas" : `${expiredPaymentCount} ${expiredPaymentCount === 1 ? "orden caducada oculta" : "órdenes caducadas ocultas"}`}</span>
                    <button
                      type="button"
                      className="payment-history-toggle"
                      onClick={() => setShowExpiredPayments((visible) => !visible)}
                      aria-expanded={showExpiredPayments}
                    >
                      {showExpiredPayments ? "Ocultar caducados" : `Ver caducados (${expiredPaymentCount})`}
                    </button>
                  </div>
                )}
                <div className="payment-history-scroll mt-4 rounded-xl border border-white/[0.08]">
                  {visiblePayments.length ? (
                    <div className="payment-history-list divide-y divide-white/[0.07]">
                      {visiblePayments.map((payment) => {
                        const effectiveStatus = getEffectivePaymentStatus(payment, paymentStatusNow);
                        return (
                        <div key={payment.id || payment.paymentId} className="payment-history-row flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
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
                            effectiveStatus === "paid"
                              ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-200"
                              : ["failed", "expired"].includes(effectiveStatus)
                                ? "border-rose-300/20 bg-rose-300/5 text-rose-200"
                                : "border-amber-300/20 bg-amber-300/5 text-amber-100"
                          )}>{paymentStatusLabel(effectiveStatus)}</span>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <CreditCardIcon className="mx-auto h-7 w-7 text-slate-600" aria-hidden="true" />
                      <p className="mt-3 text-sm font-medium text-slate-300">{payments.length > 0 && expiredPaymentCount > 0 && !showExpiredPayments ? "No hay pagos activos o confirmados" : "Todavía no hay pagos registrados"}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{payments.length > 0 && expiredPaymentCount > 0 && !showExpiredPayments ? "Las órdenes caducadas se han ocultado para mantener el historial compacto. Puedes mostrarlas con el botón de arriba." : "Cuando crees una orden de pago, aparecerá aquí su importe y estado."}</p>
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
        </section>

        <section className="profile-support-grid" aria-label="Privacidad y ayuda">
          <aside className="profile-help-stack">
            <section className="profile-surface jjx-panel p-6">
              <div className="profile-card-heading">
                <span className="jjx-icon-chip"><ShieldCheckIcon className="h-5 w-5" aria-hidden="true" /></span>
                <div><h2>Privacidad y acceso</h2><p>Tu cuenta está protegida.</p></div>
              </div>
              <p className="profile-body-copy">Tu historial está separado del de otras cuentas. No compartas tu contraseña y cierra la sesión si utilizas un equipo compartido.</p>
            </section>
            <section className="profile-surface jjx-panel p-6">
              <div className="profile-card-heading">
                <span className="jjx-icon-chip"><LifebuoyIcon className="h-5 w-5" aria-hidden="true" /></span>
                <div><h2>¿Necesitas ayuda?</h2><p>Estamos aquí para ayudarte.</p></div>
              </div>
              <p className="profile-body-copy">Contacta con soporte si tienes problemas para acceder a tu cuenta o registrar una operación.</p>
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=soportejjxcapital%40gmail.com&su=Soporte%20JJXCAPITAL"
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir un correo nuevo en Gmail"
                className="jjx-button-secondary mt-5 w-full justify-center"
              >
                Contactar con soporte
              </a>
              <p className="mt-2 text-center text-xs leading-5 text-slate-500">
                Se abrirá un borrador de correo en una pestaña nueva.
              </p>
            </section>
          </aside>
        </section>

        <footer className="profile-footer-note">
          <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
          <p>Los pagos solo se consideran válidos cuando el servidor confirma la transacción y registra el estado de la suscripción.</p>
        </footer>
      </div>
    </div>
  );
}
