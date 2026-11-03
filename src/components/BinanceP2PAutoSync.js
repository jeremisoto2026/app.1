import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

const pollBybitP2P = async (user) => {
  if (!user?.getIdToken) return;
  const token = await user.getIdToken();
  const statusResponse = await fetch("/api/integrations/binance-p2p/status?provider=bybit", {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
    cache: "no-store",
  });
  if (!statusResponse.ok) return;
  const status = await statusResponse.json().catch(() => ({}));
  if (!status.connected || !status.encryptionConfigured) return;
  await fetch("/api/integrations/binance-p2p/sync?provider=bybit", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
};

const pollBinanceP2P = async (user) => {
  if (!user?.getIdToken) return;
  const token = await user.getIdToken();
  const statusResponse = await fetch("/api/integrations/binance-p2p/status", {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
    cache: "no-store",
  });
  if (!statusResponse.ok) return;
  const status = await statusResponse.json().catch(() => ({}));
  if (!status.connected || !status.encryptionConfigured) return;
  await fetch("/api/integrations/binance-p2p/sync", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
};

export default function BinanceP2PAutoSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return undefined;
    let stopped = false;
    let inFlight = false;

    const run = async () => {
      if (stopped || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try { await pollBinanceP2P(user); } catch {
        // Keep the other provider independent if Binance is temporarily unavailable.
      }
      try { await pollBybitP2P(user); } catch {
        // Background sync is best-effort; each provider has its own manual status.
      } finally {
        inFlight = false;
      }
    };

    void run();
    const interval = window.setInterval(run, 5 * 60 * 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user?.uid]);

  return null;
}
