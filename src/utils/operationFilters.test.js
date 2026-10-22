import { filterOperations } from "./operationFilters";

const operations = [
  { id: "1", order_id: "ABC-100", crypto: "BTC", fiat: "USDT", exchange: "Binance" },
  { id: "2", order_id: "XYZ-200", crypto: "ETH", fiat: "USD", exchange: "Bybit" },
  { id: "3", order_id: "ABC-300", crypto: "BTC", fiat: "USD", exchange: "Bybit" },
];

describe("filterOperations", () => {
  test("combines selected filters and search instead of letting search override filters", () => {
    expect(filterOperations(operations, {
      crypto: "BTC",
      fiat: "",
      exchange: "",
      search: "XYZ",
    })).toEqual([]);
  });

  test("combines crypto, quote currency, platform and search", () => {
    expect(filterOperations(operations, {
      crypto: "btc",
      fiat: "USD",
      exchange: "Bybit",
      search: "abc-300",
    }).map((operation) => operation.id)).toEqual(["3"]);
  });

  test("search is case-insensitive and ignores empty filter values", () => {
    expect(filterOperations(operations, {
      crypto: "",
      fiat: "",
      exchange: "",
      search: "binANCE",
    }).map((operation) => operation.id)).toEqual(["1"]);
  });

  test("returns all operations when no filters are active", () => {
    expect(filterOperations(operations, {})).toEqual(operations);
  });

  test("handles malformed input safely", () => {
    expect(filterOperations(null, {})).toEqual([]);
    expect(filterOperations(operations, { search: " " })).toEqual(operations);
  });
});
