const {
  encryptCredentials,
  decryptCredentials,
  fetchHistory,
} = require("../lib/binance-p2p");

describe("Binance P2P read-only connector", () => {
  const originalEncryptionKey = process.env.BINANCE_P2P_ENCRYPTION_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.BINANCE_P2P_ENCRYPTION_KEY = "a".repeat(64);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEncryptionKey === undefined) delete process.env.BINANCE_P2P_ENCRYPTION_KEY;
    else process.env.BINANCE_P2P_ENCRYPTION_KEY = originalEncryptionKey;
    jest.restoreAllMocks();
  });

  test("encrypts credentials at rest and decrypts them only on the server", () => {
    const credentials = { apiKey: "example-api-key-value", apiSecret: "example-secret-value" };
    const encrypted = encryptCredentials(credentials);

    expect(JSON.stringify(encrypted)).not.toContain(credentials.apiSecret);
    expect(JSON.stringify(encrypted)).not.toContain(credentials.apiKey);
    expect(encryptCredentials(credentials).iv).not.toBe(encrypted.iv);
    expect(decryptCredentials(encrypted)).toEqual(credentials);
  });

  test("rejects an absent or malformed server encryption key", () => {
    delete process.env.BINANCE_P2P_ENCRYPTION_KEY;
    expect(() => encryptCredentials({ apiKey: "api", apiSecret: "secret" })).toThrow(
      "no está configurada de forma segura"
    );
  });

  test("signs and queries personal P2P history using only the supplied read-only API key", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: "000000",
        success: true,
        data: [{ orderNumber: "123456", tradeType: "BUY", orderStatus: "COMPLETED" }],
        total: 1,
      }),
    });

    const result = await fetchHistory({
      credentials: { apiKey: "example-api-key", apiSecret: "example-secret-value" },
      tradeType: "BUY",
      startTimestamp: 1700000000000,
      endTimestamp: 1700001000000,
      pageStart: 1,
      maxPages: 1,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].orderNumber).toBe("123456");
    expect(result.nextPage).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [requestUrl, requestOptions] = global.fetch.mock.calls[0];
    expect(requestUrl).toContain("/sapi/v1/c2c/orderMatch/listUserOrderHistory?");
    expect(requestUrl).toContain("signature=");
    expect(requestUrl).not.toContain("example-secret-value");
    expect(requestOptions.headers["X-MBX-APIKEY"]).toBe("example-api-key");
    expect(requestOptions.method).toBe("GET");
  });
});
