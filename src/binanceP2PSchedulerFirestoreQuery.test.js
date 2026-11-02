const { buildConnectedBinanceP2PQuery } = require("../lib/payments");

describe("Binance P2P scheduler Firestore query", () => {
  test("uses a bounded collection-group scan without a field filter", () => {
    const query = buildConnectedBinanceP2PQuery({ limit: 25 });

    expect(query.from).toEqual([
      { collectionId: "privateIntegrations", allDescendants: true },
    ]);
    expect(query.orderBy).toEqual([
      { field: { fieldPath: "__name__" }, direction: "ASCENDING" },
    ]);
    expect(query.limit).toBe(25);
    expect(query.where).toBeUndefined();
    expect(query.startAt).toBeUndefined();
  });

  test("continues after the last document when a cursor is supplied", () => {
    const name = "projects/jjxcapital-2/databases/(default)/documents/users/user-1/privateIntegrations/binanceP2P";
    const query = buildConnectedBinanceP2PQuery({ startAfter: name, limit: 8 });

    expect(query.limit).toBe(8);
    expect(query.startAt).toEqual({
      values: [{ referenceValue: name }],
      before: false,
    });
  });

  test("clamps unsafe page sizes", () => {
    expect(buildConnectedBinanceP2PQuery({ limit: 1000 }).limit).toBe(100);
    expect(buildConnectedBinanceP2PQuery({ limit: 0 }).limit).toBe(25);
  });
});
