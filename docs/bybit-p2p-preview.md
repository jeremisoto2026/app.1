# Bybit P2P integration â€” Preview and Production

The feature is developed on feat/bybit-p2p-preview-isolated and remains behind the open draft PR until Preview validation is complete. The runtime selects a separate integration and operations path based on VERCEL_ENV.

## Environment isolation

| Environment | Connection and sync state | Imported operations |
| --- | --- | --- |
| Vercel Preview | users/{uid}/previewIntegrations/bybitP2P | users/{uid}/previewOperations |
| Vercel Production | users/{uid}/privateIntegrations/bybitP2P | users/{uid}/operations |

The connection-attempt guard follows the same environment split. Preview financial screens load sanitized Bybit records through the authenticated server endpoint when REACT_APP_BYBIT_P2P_PREVIEW_MODE=true; they do not read the protected Preview collection directly. Preview records are read-only in History. Production Bybit operations use the same operations collection as Binance, so Dashboard, Operations, History, Arbitrage Sessions and profile counters use the normal application paths.

The connector reads users/{uid}/sessions for unique pair-and-time session matching. It does not modify Binance integration documents, Binance operations, Firestore rules or the existing Cloudflare Binance Worker.

## Automatic synchronization

- The Profile card offers manual connect, status, sync and disconnect.
- The authenticated app performs a best-effort background sync every five minutes while a user is active.
- The existing pr¶»§q«^