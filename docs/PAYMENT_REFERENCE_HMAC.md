# Payment transaction reference HMAC

JJXCAPITAL stores the global duplicate-payment marker under a deterministic HMAC document ID instead of embedding a raw blockchain TxID or Binance Pay transaction ID in the Firestore document name.

## Environment secrets

- Preview uses `FIREBASE_PREVIEW_PAYMENT_REFERENCE_HMAC_KEY`.
- Production uses `PAYMENT_REFERENCE_HMAC_KEY`.
- Each value must contain at least 32 bytes. Preview never falls back to the Production key.
- Keep each key stable. Rotating a key without a migration would generate a different document ID and could allow an already-used payment reference to be claimed again.

The secret is server-only. It must never use a `REACT_APP_` prefix or be sent to the browser.

## Duplicate checks and legacy data

New BEP20 and Binance Pay transactions use an HMAC reference ID. Both payment handlers also check their former raw-ID path while older records may still exist.

During account deletion, a legacy raw-ID marker is copied to its HMAC path with a Firestore `exists:false` precondition, then the old raw-ID document is deleted in the same commit. If the HMAC marker already exists, it is retained and only the old document is deleted. Before migration, the recovered reference is checked against the exact legacy document ID. Deletion stops safely when a historical provider, reference, or matching ID cannot be verified.

After the account is deleted, the retained HMAC marker contains only the provider, the pseudonymization flag, the duplicate-prevention purpose, and the timestamp. It contains no UID, payment ID, raw TxID, raw Binance transaction ID, or amount.

## Privacy meaning

HMAC is pseudonymization, not irreversible anonymization: the server can derive the same reference while it holds the secret. Before account deletion, the user's private payment-history document can still contain the original transaction reference; deleting the account removes that document and retains only the HMAC duplicate-prevention marker.

Account deletion remains disabled until lock-aware Firestore rules are published and verified in the Preview Firebase project. The HMAC Preview secret is a separate prerequisite; this change does not enable account deletion or modify Production.
