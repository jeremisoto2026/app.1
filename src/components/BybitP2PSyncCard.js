import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon,
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
    cache: "no-store",
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

export default function BybitP2PSyncCard() {
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
    const payload = await callApi(user, "/api/integrations/binance-p2p/status?provider=bybit");
    setStatus(payload);
    return payload;
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      if (!user?.getIdToken) {
        setLoadingStatus(false);
        return;
      }
      setLoadingStatus(true);
      try {
        const payload = await callApi(user, "/api/integrations/binance-p2p/status?provider=bybit");
        if (!cancelled) setStatus(payload);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "No se pudo comprobar la conexión de Bybit.");
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    };
    loadStatus();
    return () => { cancelled = true; };
  }, [user]);

  const handleConnect = async (event) => {
    event.preventDefault();
    setConnecting(true);
    setError("");
    setMessage("");
    setLastResult(null);
    try {
      const payload = await callApi(user, "/api/integrations/binance-p2p/connect?provider=bybit", "POST", {
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      });
      setApiKey("");
      setApiSecret("");
      setMessage(payload.message || "Cuenta de Bybit conectada en modo de solo lectura.");
      await refreshStatus();
    } catch (connectError) {
      setError(connectError.message || "No se pudo conectar Bybit.");
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
      const payload = await callApi(user, "/api/integrations/binance-p2p/sync?provider=bybit", "POST", {});
      setLastResult(payload);
      setMessage(payload.message || "Sincronización de Bybit completada.");
      await refreshStatus();
    } catch (syncError) {
      setError(syncError.message || "No se pudo sincronizar el historial P2P de Bybit.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError("");
    setMessage("");
    try {
      const payload = await callApi(user, "/api/integrations/binance-p2p/disconnect?provider=bybit", "POST", {});
      setStatus((current) => ({ ...(current || {}), connected: false, apiKeyHint: null }));
      setMessage(payload.message || "Bybit se ha desconectado en Preview.");
      setLastResult(null);
    } catch (disconnectError) {
      setError(disconnectError.message || "No se pudo desconectar Bybit.");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <section className="profile-section jjx-panel p-6 sm:p-7 space-y-5" aria-labelledby="bybit-p2p-sync-heading">
      <div className="profile-card-heading">
        <span className="jjx-icon-chip"><LinkIcon className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <span className="jjx-eyebrow">INTEGRACIONES · PREVIEW</span>
          <h2 id="bybit-p2p-sync-heading">Sincronización Bybit P2P</h2>
          <p>Conecta Bybit para consultar e importar compras y ventas P2P completadas.</p>
          <p className="mt-1 text-sm text-slate-500">
            Esta prueba guarda las conexiones y operaciones en colecciones aisladas de Preview. No modifica Binance ni el historial de Producción.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold">Acceso de solo lectura</p>
            <p className="text-sm text-slate-500">
              El conector solo consulta el historial P2P. No puede crear órdenes, marcar pagos, liberar activos ni retirar fondos.
              Utiliza una API Key generada por Bybit con permiso P2P de solo lectura; nunca habilites permisos de trading o retirada.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/10 bg-slate-500/5 p-4 text-sm text-slate-400">
        <p className="font-semibold text-slate-200">Requisitos de la cuenta</p>
        <p className="mt-1">Bybit exige ser anunciante general o superior. Esta primera versión utiliza el endpoint P2P de Bybit Global; la disponibilidad en cuentas de Bybit EU se comprobará por separado.</p>
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
        <p className="text-sm text-slate-500" role="status">Comprobando conexión de Bybit…</p>
      ) : status?.connected ? (
        <div className="space-y-4">
          {!status.encryptionConfigured && (
            <div role="alert" className="profile-alert profile-alert-warning">
              La clave de cifrado de Bybit no está disponible en este Preview. La sincronización está desactivada.
            </div>
          )}
          {status.lastSyncStatus === "error" && (
            <div role="status" className="profile-alert profile-alert-warning">
              La última sincronización no terminó correctamente. Pulsa «Sincronizar ahora» para reintentar. Código interno: {status.lastSyncErrorCode || "no disponible"}.
            </div>
          )}
          <div className="rounded-xl border border-slate-200/70 bg-slate-500/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Bybit conectado · Preview</p>
                <p className="text-sm text-slate-500">API Key terminada en {status.apiKeyHint ? "••••" + status.apiKeyHint : "••••"}</p>
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
                Hay más páginas pendientes desde que conectaste la API. Pulsa continuar para completar la importación inicial.
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
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm space-y-2">
              <p className="font-semibold text-white">Resultado de la sincronización</p>
              <p>Encontradas: <strong>{Number(lastResult.completedOrdersFound) || 0}</strong>. Nuevas: <strong>{Number(lastResult.imported) || 0}</strong>. Ya registradas: <strong>{Number(lastResult.skipped) || 0}</strong>.</p>
              <p>Vinculadas a una sesión: <strong>{Number(lastResult.sessionAssignments?.matched) || 0}</strong>. Sin sesión compatible: <strong>{Number(lastResult.sessionAssignments?.unmatched) || 0}</strong>.</p>
              {lastResult.hasMoreHistory && <p className="text-amber-500">Hay más páginas pendientes.</p>}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Bybit API Key</span>
              <input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none focus:border-violet-400/60"
                placeholder="Introduce tu API Key"
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Bybit API Secret</span>
              <input
                type="password"
                autoComplete="new-password"
                value={apiSecret}
                onChange={(event) => setApiSecret(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none focus:border-violet-400/60"
                placeholder="Introduce tu API Secret"
                required
              />
            </label>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Crea una clave generada por el sistema (HMAC) en Bybit. Activa únicamente el permiso P2P de solo lectura.
            Las claves se cifran en el servidor y la Secret no vuelve a mostrarse.
          </p>
          <button
            type="submit"
            disabled={connecting || !apiKey.trim() || !apiSecret.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LinkIcon className="h-4 w-4" aria-hidden="true" />
            {connecting ? "Verificando conexión…" : "Conectar Bybit"}
          </button>
        </form>
      )}

      <div className="flex items-start gap-2 text-xs text-slate-500">
        <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Las operaciones importadas aquí se guardan bajo el espacio de pruebas Bybit de JJXCAPITAL. No se transfieren a Producción al desconectar la cuenta.</p>
      </div>
    </section>
  );
}
