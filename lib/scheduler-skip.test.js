const { getSchedulerSkipReason } = require("./scheduler-skip");

describe("getSchedulerSkipReason", () => {
  test.each([
    [409, "Ya hay una sincronización de Binance en curso. Espera unos segundos.", "sync_in_progress"],
    [409, "Ya hay una sincronización de Bybit en curso. Espera unos segundos.", "sync_in_progress"],
    [429, "Has solicitado una sincronización hace muy poco. Espera unos segundos antes de volver a intentarlo.", "recent_sync_cooldown"],
  ])("treats expected sync contention as a skip", (statusCode, error, expected) => {
    expect(getSchedulerSkipReason({ statusCode, body: { error } })).toBe(expected);
  });

  test.each([
    [429, "Bybit ha limitado las consultas. Espera antes de volver a sincronizar."],
    [500, "No se pudo acceder al historial."],
    [503, "Firestore no está disponible."],
  ])("keeps real integration and server failures as errors", (statusCode, error) => {
    expect(getSchedulerSkipReason({ statusCode, body: { error } })).toBe("");
  });
});
