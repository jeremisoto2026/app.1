import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";

const callApi = async (user, path, method = "GET", body) => {
  if (!user?.getIdToken) throw new Error("Vuelve a iniciar sesión para continuar.");
  const token = await user.getIdToken();
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "No se pudo completar la solicitud.");
  return payload;
};

const formatDate = (value) => {
  if (!value) return "Todavía no se ha sincronizado";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "Fecha no disponible";
};

const BINANCE_ENCRYPTION_KEY_ENV = process.env.REACT_APP_VERCEL_ENV === "preview"
  ? "BINANCE_P2P_PREVIEW_ENCRYPTION_KEY"
  : "BINANCE_P2P_ENCRYPTION_KEY";

export default function BinanceP2PSyncCard() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const refreshStatus = useCallback(async () => {
    const payload = await callApi(user, "/api/integrations/binance-p2p/status");
    setStatus(payload);
    return payload;
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      setLoadingStatus(true);
      try {
        const payload = await callApi(user, "/api/integrations/binance-p2p/status");
        if (!cancelled) setStatus(payload);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "No se pudo comprobar la conexión.");
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    };
    if (user) loadStatus();
    else setLoadingStatus(false);
    return () => { cancelled = true; };
  }, [user]);

  const handleConnect = async (event) => {
    event.preventDefault();
    setConnecting(true);
    setError("");
    setMessage("");
    setLastResult(null);
    try {
      const payload = await callApi(user, "/api/integrations/binance-p2p/connect", "POST", {
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      });
      setApiKey("");
      setApiSecret("");
      setMessage(payload.message || "Cuenta de Binance conectada en modo de solo lectura.");
      await refreshStatus();
    } catch (connectError) {
      setError(connectError.message || "No se pudo conectar Binance.");
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setMessage("");
    setLastResult(null);
    try {
      const payload = await callApi(user, "/api/integrations/binance-p2p/sync", "POST", {});
      setLastResult(payload);
      setMessage(payload.message || "Sincronización completada.");
      await refreshStatus();
    } catch (syncError) {
      setError(syncError.message || "No se pudo sincronizar el historial.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError("");
    setMessage("");
    try {
      await callApi(user, "/api/integrations/binance-p2p/disconnect", "POST", {});
      setStatus((current) => ({ ...(current || {}), connected: false, apiKeyHint: null }));
      setMessage("Cuenta de Binance desconectada y credenciales cifradas eliminadas.");
      setLastResult(null);
    } catch (disconnectError) {
      setError(disconnectError.message || "No se pudo desconectar Binance.");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <section className="profile-section jjx-panel p-6 sm:p-7 space-y-5 p2p-sync-card p2p-sync-card-binance" aria-labelledby="binance-p2p-sync-heading">
      <header className="p2p-sync-card-header">
        <span className="p2p-sync-provider-mark p2p-sync-provider-mark-binance" aria-hidden="true">BN</span>
        <div className="p2p-sync-card-heading">
          <span className="p2p-sync-card-eyebrow">EXCHANGE · INTEGRACIÓN P2P</span>
          <h2 id="binance-p2p-sync-heading" className="p2p-sync-card-title">Binance <span>P2P</span></h2>
          <p>Importa automáticamente tus compras y ventas P2P completadas a JJXCAPITAL.</p>
          <p className="p2p-sync-card-description">
            La importación comienza desde que conectas la API. Para vincular órdenes a un arbitraje, crea antes una sesión con el mismo par de monedas.
          </p>
        </div>
        <span className="p2p-sync-provider-badge p2p-sync-provider-badge-binance">
          <ShieldCheckIcon aria-hidden="true" /> Solo lectura
        </span>
      </header>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold">Acceso de solo lectura</p>
            <p className="text-sm text-slate-500">
              JJXCAPITAL solo consultará el historial. La API key no debe tener permisos de trading ni de retirada.
              La Secret Key se cifra en el servidor y no vuelve a mostrarse.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="profile-alert profile-alert-error flex items-start gap-2">
          <XCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div role="status" className="profile-alert profile-alert-success flex items-start gap-2">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {loadingStatus ? (
        <p className="text-sm text-slate-500" role="status">Comprobando conexión de Binance…</p>
      ) : !status ? (
        <p className="text-sm text-amber-600" role="status">
          No se ha podido verificar el estado de Binance. Por seguridad, los campos para introducir API Keys permanecen ocultos hasta recuperar la sesión de Firebase.
        </p>
      ) : status.connected ? (
        <div className="space-y-4">
          {!status.encryptionConfigured && (
            <div role="alert" className="profile-alert profile-alert-warning">
              La clave de cifrado del servidor no está disponible. La sincronización está desactivada hasta corregir BINANCE_P2P_ENCRYPTION_KEY en Vercel.
            </div>
          )}
          {status.orderQuotaBlocked && (
            <div role="status" className="profile-alert profile-alert-warning">
              Se alcanzó el límite gratuito de 300 órdenes. La sincronización está pausada y las órdenes pendientes se conservarán. Al activar Pro podrás reanudarla.
            </div>
          )}
          {status.lastSyncStatus === "error" && (
            <div role="status" className="profile-alert profile-alert-warning">
              La última sincronización no terminó correctamente. Pulsa «Sincronizar ahora» para reintentar; código interno: {status.lastSyncErrorCode || "no disponible"}.
            </div>
          )}
          <div className="rounded-xl border border-slate-200/70 bg-slate-500/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Binance conectado</p>
                <p className="text-sm text-slate-500">API key terminada en {status.apiKeyHint ? "••••" + status.apiKeyHint : "••••"}</p>
                <p className="mt-1 text-xs text-slate-500">Importación desde {formatDate(status.connectedAt)}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Solo lectura
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Última sincronización correcta</p>
                <p className="mt-1 text-sm font-medium">{formatDate(status.lastSyncAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Importadas en el último proceso</p>
                <p className="mt-1 text-sm font-medium">{Number(status.lastImportedCount) || 0}</p>
              </div>
            </div>
            {status.hasMoreHistory && (
              <p className="mt-3 text-sm text-amber-600">
                Hay operaciones pendientes desde la conexión de esta API. Vuelve a sincronizar para continuar.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSync}
              disabled={!status.encryptionConfigured || syncing || disconnecting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowPathIcon className={"h-4 w-4 " + (syncing ? "animate-spin" : "")} aria-hidden="true" />
              {syncing ? "Sincronizando…" : status.hasMoreHistory ? "Continuar sincronización" : "Sincronizar ahora"}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={syncing || disconnecting}
              className="jjx-button-secondary rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {disconnecting ? "Desconectando…" : "Desconectar"}
            </button>
          </div>
          {lastResult && (
            <div className="space-y-1" role="status" aria-live="polite">
              <p className="text-sm text-slate-500">
                Encontradas: {lastResult.completedOrdersFound}. Nuevas: {lastResult.imported}. Ya registradas: {lastResult.skipped}.
                {lastResult.hasMoreHistory ? " Hay más páginas pendientes." : ""}
              </p>
              {lastResult.sessionAssignments && (
                <p className="text-sm text-slate-500">
                  Vinculadas a una sesión: {lastResult.sessionAssignments.matched}. Sin sesión compatible: {lastResult.sessionAssignments.unmatched}.
                  {lastResult.sessionAssignments.relinkedExisting ? " Se vincularon " + lastResult.sessionAssignments.relinkedExisting + " operaciones que ya estaban importadas." : ""}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleConnect}>
          {!status?.encryptionConfigured && (
            <div role="alert" className="profile-alert profile-alert-warning flex items-start gap-2">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>
                Antes de conectar Binance, el administrador debe configurar el secreto de cifrado
                <code className="mx-1 rounded bg-slate-500/10 px-1 py-0.5">{BINANCE_ENCRYPTION_KEY_ENV}</code>
                en las variables de entorno de servidor de Vercel. No introduzcas tus claves hasta que este aviso desaparezca.
              </span>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium">API Key de Binance</span>
              <input
                type="text"
                autoComplete="off"
                spellCheck="false"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Pega la API Key"
                className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-3 text-sm outline-none focus:border-violet-500"
                required
                maxLength={256}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Secret Key de Binance</span>
              <input
                type="password"
                autoComplete="new-password"
                value={apiSecret}
                onChange={(event) => setApiSecret(event.target.value)}
                placeholder="Se cifra al conectar"
                className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-3 text-sm outline-none focus:border-violet-500"
                required
                maxLength={256}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={!status?.encryptionConfigured || !apiKey.trim() || !apiSecret.trim() || connecting || syncing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
            {connecting ? "Verificando conexión…" : "Conectar Binance en modo de solo lectura"}
          </button>
          <p className="text-xs text-slate-500">
            Crea una clave únicamente para leer el historial P2P. No habilites Spot, Margin, Futures, transferencias o retiradas.
            Una vez conectada, la clave secreta se borra del formulario y solo se conserva cifrada en el backend.
          </p>
        </form>
      )}
    </section>
  );
}

