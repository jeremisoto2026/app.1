const {
  getPaymentReferenceSecret,
  getPaymentTransactionReferencePath,
  getLegacyPaymentTransactionPath,
  isHmacPaymentTransactionId,
} = require("../lib/payment-reference");

describe("Payment transaction HMAC references", () => {
  const previewSecret = "preview-reference-secret-".repeat(3);
  const productionSecret = "production-reference-secret-".repeat(3);
  const txHash = "0x" + "a".repeat(64);

  test("creates a stable HMAC ID that does not expose the raw reference", () => {
    const env = {
      VERCEL_ENV: "preview",
      FIREBASE_PREVIEW_PAYMENT_REFERENCE_HMAC_KEY: previewSecret,
      PAYMENT_REFERENCE_HMAC_KEY: productionSecret,
    };
    const first = getPaymentTransactionReferencePath("blockchain_bep20", txHash, env);
    const second = getPaymentTransactionReferencePath("blockchain_bep20", txHash.toUpperCase(), env);

    expect(first).toBe(second);
    expect(first).toMatch(/^paymentTransactions\/hmac_v1_blockchain_bep20_[a-f0-9]{64}$/);
    expect(first).not.toContain("a".repeat(64));
    expect(isHmacPaymentTransactionId(first.split("/").pop())).toBe(true);
  });

  test("uses separate secrets for Preview and Production", () => {
    const preview = getPaymentTransactionReferencePath("binance_pay", "binance-transaction-123", {
      VERCEL_ENV: "preview",
      FIREBASE_PREVIEW_PAYMENT_REFERENCE_HMAC_KEY: previewSecret,
      PAYMENT_REFERENCE_HMAC_KEY: productionSecret,
    });
    const production = getPaymentTransactionReferencePath("binance_pay", "binance-transaction-123", {
      VERCEL_ENV: "production",
      FIREBASE_PREVIEW_PAYMENT_REFERENCE_HMAC_KEY: previewSecret,
      PAYMENT_REFERENCE_HMAC_KEY: productionSecret,
    });

    expect(preview).not.toBe(production);
    expect(preview).not.toContain("binance-transaction-123");
    expect(production).not.toContain("binance-transaction-123");
  });

  test("fails closed when the correct environment-specific key is missing", () => {
    expect(() => getPaymentReferenceSecret({
      VERCEL_ENV: "preview",
      PAYMENT_REFERENCE_HMAC_KEY: productionSecret,
    })).toThrow(expect.objectContaining({
      statusCode: 503,
      code: "PAYMENT_REFERENCE_HMAC_KEY_MISSING",
    }));
  });

  test("keeps the exact legacy paths available for historical duplicate checks", () => {
    expect(getLegacyPaymentTransactionPath("blockchain_bep20", txHash))
      .toBe("paymentTransactions/bep20_" + "a".repeat(64));
    expect(getLegacyPaymentTransactionPath("binance_pay", "legacy:txn/123"))
      .toBe("paymentTransactions/binance_legacy_txn_123");
  });

  test("rejects malformed references and unsupported providers", () => {
    expect(() => getPaymentTransactionReferencePath("blockchain_bep20", "not-a-txid", {
      VERCEL_ENV: "preview",
      FIREBASE_PREVIEW_PAYMENT_REFERENCE_HMAC_KEY: previewSecret,
    })).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(() => getLegacyPaymentTransactionPath("unknown", "anything"))
      .toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});
