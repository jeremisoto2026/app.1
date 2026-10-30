const crypto = require("crypto");
const {
  HttpError, sendJson, requirePost, requireFirebaseUser, getDocument,
  listAllDocuments, countDocuments, hasDocumentsMatchingField,
  commitWrites, createWrite, documentName, toFields, errorResponse,
} = require("./payments");
const { assertPlanAllows } = require("./plans");

const FIAT_CURRENCIES = ["EUR", "USD", "VES", "COP", "ARS", "MXN", "BRL", "PEN", "CLP", "GBP"];
const CRYPTO_CURRENCIES = ["USDT", "USDC", "BTC", "ETH", "BNB", "DAI"];
const STRATEGIES = ["Comercio P2P", "P2P entre plataformas"];

async function createSession(req, res) {
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
    const pairPath = userPath + "/sessionPairs/" + fiat + "_" + cryptoCode;
    const existingSessions = await listAllDocuments(sessionsPath, 100, 10);
    const duplicate = existingSessions.find((item) =>
      item.data?.status === "active" &&
      String(item.data?.fiat || "").trim().toUpperCase() === fiat &&
      String(item.data?.crypto || "").trim().toUpperCase() === cryptoCode
    );
    if (duplicate) {
      throw new HttpError(409, "Ya tienes un arbitraje activo para " + fiat + " / " + cryptoCode + ". Abre la sesión " + (duplicate.data?.name || "existente") + " o termínala antes de crear otra del mismo par.");
    }
    const pairIndex = await getDocument(pairPath);
    if (pairIndex?.data?.activeSessionId) {
      throw new HttpError(409, "Ya tienes un arbitraje activo para " + fiat + " / " + cryptoCode + ". Abre esa sesión o termínala antes de crear otra del mismo par.");
    }

    // Los arbitrajes creados consumen el límite de arbitrajes registrados (150).
    // No reutilizamos movementsUsed/ ordersUsed heredados: sus significados antiguos estaban invertidos.
    const currentArbitrages = await countDocuments(sessionsPath, 151);
    assertPlanAllows(profile.data, "movements", currentArbitrages);

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
      createWrite(pairPath, { activeSessionId: id, fiat, crypto: cryptoCode },
        pairIndex?.updateTime ? { updateTime: pairIndex.updateTime } : { exists: false }),
      createWrite(userPath, { movementsUsed: currentArbitrages + 1 },
        profile.updateTime ? { updateTime: profile.updateTime } : { exists: true }),
    ]);

    return sendJson(res, 201, {
      session: { ...session, id, createdAt: createdAt.toISOString() },
      usage: { movements: currentArbitrages + 1, limit: 150 },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

async function updateSessionStatus(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const sessionId = String(req.body?.sessionId || "").trim();
    const status = String(req.body?.status || "");
    if (!/^[a-f0-9]{32}$/i.test(sessionId) || !["active", "closed"].includes(status)) {
      throw new HttpError(400, "La sesión o el estado no son válidos.");
    }

    const userPath = "users/" + claims.sub;
    const sessionPath = userPath + "/sessions/" + sessionId;
    const pairPath = userPath + "/sessionPairs/";
    const [target, sessions] = await Promise.all([
      getDocument(sessionPath),
      status === "active" ? listAllDocuments(userPath + "/sessions", 100, 10) : Promise.resolve([]),
    ]);
    if (!target) throw new HttpError(404, "No se encontró el arbitraje.");
    const current = target.data || {};
    const fiat = String(current.fiat || "").toUpperCase();
    const cryptoCode = String(current.crypto || "").toUpperCase();
    if (!fiat || !cryptoCode) throw new HttpError(409, "El arbitraje no tiene un par de monedas válido.");
    const pairIndexPath = pairPath + fiat + "_" + cryptoCode;
    const pairIndex = await getDocument(pairIndexPath);

    if (status === "active") {
      const duplicate = sessions.find((item) => item.id !== sessionId &&
        item.data?.status === "active" &&
        String(item.data?.fiat || "").trim().toUpperCase() === fiat &&
        String(item.data?.crypto || "").trim().toUpperCase() === cryptoCode);
      if (duplicate) {
        throw new HttpError(409, "Ya tienes un arbitraje activo para " + current.fiat + " / " + cryptoCode + ". Abre la sesión " + (duplicate.data?.name || "existente") + " o termínala antes de reabrir esta.");
      }
      if (pairIndex?.data?.activeSessionId && pairIndex.data.activeSessionId !== sessionId) {
        throw new HttpError(409, "Ya existe otra sesión activa para " + fiat + " / " + cryptoCode + ". Termínala antes de reabrir esta.");
      }
    }

    const updatedAt = new Date();
    const writes = [createWrite(sessionPath, {
      status,
      closedAt: status === "closed" ? updatedAt : null,
    }, target.updateTime ? { updateTime: target.updateTime } : { exists: true })];
    if (status === "active" || !pairIndex?.data?.activeSessionId || pairIndex.data.activeSessionId === sessionId) {
      writes.push(createWrite(pairIndexPath, {
        activeSessionId: status === "active" ? sessionId : null,
        fiat,
        crypto: cryptoCode,
      }, pairIndex?.updateTime ? { updateTime: pairIndex.updateTime } : { exists: false }));
    }
    await commitWrites(writes);

    return sendJson(res, 200, { success: true, session: { id: sessionId, status, closedAt: status === "closed" ? updatedAt.toISOString() : null } });
  } catch (error) {
    return errorResponse(res, error);
  }
}

async function deleteSession(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const sessionId = String(req.body?.sessionId || "").trim();
    if (!/^[a-f0-9]{32}$/i.test(sessionId)) throw new HttpError(400, "La sesión no es válida.");

    const userPath = "users/" + claims.sub;
    const sessionPath = userPath + "/sessions/" + sessionId;
    const session = await getDocument(sessionPath);
    if (!session) throw new HttpError(404, "No se encontró el arbitraje.");

    if (await hasDocumentsMatchingField(userPath + "/operations", "sessionId", sessionId)) {
      throw new HttpError(409, "Este arbitraje ya tiene operaciones y no se puede eliminar.");
    }

    const writes = [{
      delete: documentName(sessionPath),
      currentDocument: session.updateTime ? { updateTime: session.updateTime } : { exists: true },
    }];
    const fiat = String(session.data?.fiat || "").toUpperCase();
    const cryptoCode = String(session.data?.crypto || "").toUpperCase();
    if (fiat && cryptoCode) {
      const pairPath = userPath + "/sessionPairs/" + fiat + "_" + cryptoCode;
      const pairIndex = await getDocument(pairPath);
      if (pairIndex?.data?.activeSessionId === sessionId) {
        writes.push(createWrite(pairPath, { activeSessionId: null, fiat, crypto: cryptoCode },
          pairIndex.updateTime ? { updateTime: pairIndex.updateTime } : { exists: true }));
      }
    }
    await commitWrites(writes);
    return sendJson(res, 200, { success: true, deletedSessionId: sessionId });
  } catch (error) {
    return errorResponse(res, error);
  }
}

module.exports = { create: createSession, status: updateSessionStatus, delete: deleteSession };
