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

export default func¶»§q«^