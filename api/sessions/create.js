const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  listAllDocuments,
  countDocuments,
  commitWrites,
  createWrite,
  documentName,
  toFields,
  errorResponse,
} = require("../../lib/payments");
const { assertPlanAllows } = require("../../lib/plans");

const FIAT_CURRENCIES = ["EUR", "USD", "VES", "COP", "ARS", "MXN", "BRL", "PEN", "CLP", "GBP"];
const CRYPTO_CURRENCIES = ["USDT", "USDC", "BTC", "ETH", "BNB", "DAI"];
const STRATEGIES = ["Comercio P2P", "P2P entre plataformas"];

module.exports = async function createSession(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const userPath = "users/" + claims.sub;
    const profile = await getDocument(userPath);
    if (!profile) throw new HttpError(409, "No se encontró el perfil de tu cuenta.");

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const name = String(body.name || "").trim().slice(0, 120);
    const strategy = String(body.strategy || "Comercio P2P");
    const fiat = String(body.fiat || "").toUpperCase();
    const cryptoCode = String(body.crypto || "").toUpperCase();
    const initialCapitalType = String(body.initialCapitalType || "");

    if (name.length > 120 || !STRATEGIES.includes(strategy) ||
        !FIAT_CURRENCIES.includes(fiat) || !CRYPTO_CURRENCIES.includes(cryptoCode) ||
        !["fiat", "crypto"].includes(initialCapitalType)) {
      throw new HttpError(400, "Revisa el nombre, la estrategia, el tipo de inicio y las monedas.");
    }

    const sessionsPath = userPath + "/sessions";
    const existingSessions = await listAllDocuments(sessionsPath, 100, 10);
    const duplicate = existingSessions.find((item) =>
      item.data?.status === "active" &&
      String(item.data?.fiat || "").toUpperCase() === fiat &&
      String(item.data?.crypto || "").toUpperCase() === cryptoCode
    );
    if (duplicate) {
      throw new HttpError(409, "Ya tienes un arbitraje activo para " + fiat + " / " + cryptoCode + ". Abre esa sesión o termínala antes de crear otra del mismo par.");
    }

    const storedOrders = Number(profile.data.ordersUsed);
    const savedOrders = Number.isFinite(storedOrders) && storedOrders >= 0 ? storedOrders : 0;
    const currentOrders = Math.max(savedOrders, await countDocuments(sessionsPath, 301));
    assertPlanAllows(profile.data, "orders", currentOrders);

    const id = crypto.randomUUID().replace(/-/g, "");
    const createdAt = new Date();
    const session = {
      name: name || (fiat + " / " + cryptoCode + " · " + createdAt.toLocaleDateString("es-ES")),
      strategy,
      fiat,
      crypto: cryptoCode,
      initialCapitalType,
      status: "active",
      createdAt,
      closedAt: null,
    };

    await commitWrites([
      {
        update: { name: documentName(sessionsPath + "/" + id), fields: toFields(session) },
        currentDocument: { exists: false },
      },
      createWrite(userPath, { ordersUsed: currentOrders + 1 },
        profile.updateTime ? { updateTime: profile.updateTime } : { exists: true }),
    ]);

    return sendJson(res, 201, {
      session: { ...session, id, createdAt: createdAt.toISOString() },
      usage: { orders: currentOrders + 1, limit: 300 },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
