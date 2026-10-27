const crypto = require("crypto");
const {
  HttpError,
  sendJson,
  getDocument,
  activateProWithPayment,
  errorResponse,
} = require("../../../lib/payments");

module.exports.config = { api: { bodyParser: false } };

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  if (typeof req.body === "string") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

module.exports = async function binancePayWebhook(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { returnCode: "FAIL", returnMessage: "Method not allowed" });
  }

  try {
    const rawBody = await readRawBody(req);
    const timestamp = String(req.headers["binancepay-timestamp"] || "");
    const nonce = String(req.headers["binancepay-nonce"] || "");
    const signature = String(req.headers["binancepay-signature"] || "");
    const certificateSn = String(req.headers["binancepay-certificate-sn"] || "");
    const expectedSn = String(process.env.BINANCE_PAY_WEBHOOK_CERTIFICATE_SN || process.env.BINANCE_PAY_CERTIFICATE_SN || "");
    const publicKey = String(process.env.BINANCE_PAY_WEBHOOK_PUBLIC_KEY || "").replace(/\\n/g, "\n");

    if (!timestamp || !nonce || !signature || !certificateSn || !publicKey) {
      throw new HttpError(503, "El webhook de Binance Pay aún no está configurado con su certificado público.");
    }
    if (expectedSn && certificateSn !== expectedSn) {
      throw new HttpError(401, "El certificado de firma del webhook no coincide.");
    }
    if (!Number.isFinite(Number(timestamp)) || Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) {
      throw new HttpError(401, "El webhook está fuera de la ventana de tiempo permitida.");
    }

    const payload = timestamp + "\n" + nonce + "\n" + rawBody + "\n";
    let isValid = false;
    try {
      isValid = crypto.verify(
        "RSA-SHA256",
        Buffer.from(payload, "utf8"),
        publicKey,
        Buffer.from(signature, "base64")
      );
    } catch {
      isValid = false;
    }
    if (!isValid) throw new HttpError(401, "La firma del webhook no es válida.");

    let notification;
    try {
      notification = JSON.parse(rawBody);
    } catch {
      throw new HttpError(400, "El JSON del webhook no es válido.");
    }

    if (notification.bizType !== "PAY" || notification.bizStatus !== "PAY_SUCCESS") {
      return sendJson(res, 200, { returnCode: "SUCCESS", returnMessage: null });
    }

    let data;
    try {
      data = typeof notification.data === "string" ? JSON.parse(notification.data) : notification.data;
    } catch {
      throw new HttpError(400, "Los datos de la notificación de Binance Pay no son válidos.");
    }

    const paymentId = String(data?.merchantTradeNo || "").trim();
    const transactionId = String(data?.transactionId || "").trim();
    const currency = String(data?.currency || "").toUpperCase();
    const paidAmount = Number(data?.totalFee);
    if (!/^[a-f0-9]{32}$/i.test(paymentId) || !transactionId ||
        currency !== "USDT" || !Number.isFinite(paidAmount) || Math.abs(paidAmount - 15) > 0.000001) {
      console.error("Binance Pay webhook did not match expected monthly amount/currency/order format.");
      return sendJson(res, 200, { returnCode: "SUCCESS", returnMessage: null });
    }

    const paymentPath = "users/*/payments/" + paymentId;
    // The payment path is resolved through the private payment index created at order time.
    const index = await getDocument("paymentOrderIndex/" + paymentId);
    if (!index?.data?.uid) {
      console.error("Binance Pay webhook order was not found:", paymentId);
      return sendJson(res, 200, { returnCode: "SUCCESS", returnMessage: null });
    }

    const uid = String(index.data.uid);
    const resolvedPaymentPath = "users/" + uid + "/payments/" + paymentId;
    const paymentDocument = await getDocument(resolvedPaymentPath);
    if (!paymentDocument || paymentDocument.data.provider !== "binance_pay") {
      console.error("Binance Pay webhook did not match a stored payment:", paymentId);
      return sendJson(res, 200, { returnCode: "SUCCESS", returnMessage: null });
    }
    if (paymentDocument.data.status === "paid") {
      return sendJson(res, 200, { returnCode: "SUCCESS", returnMessage: null });
    }
    if (paymentDocument.data.status !== "pending" ||
        Number(paymentDocument.data.amount) !== 15 ||
        String(paymentDocument.data.currency).toUpperCase() !== "USDT") {
      return sendJson(res, 200, { returnCode: "SUCCESS", returnMessage: null });
    }

    const transactionPath = "paymentTransactions/binance_" + transactionId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const existingTransaction = await getDocument(transactionPath);
    if (existingTransaction) {
      const existing = existingTransaction.data || {};
      if (existing.uid === uid && existing.paymentId === paymentId) {
        return sendJson(res, 200, { returnCode: "SUCCESS", returnMessage: null });
      }
      console.error("Binance transaction ID was already claimed:", transactionId);
      return sendJson(res, 200, { returnCode: "SUCCESS", returnMessage: null });
    }

    const now = new Date();
    await activateProWithPayment({
      uid,
      paymentPath: resolvedPaymentPath,
      paymentDocument,
      paymentUpdate: {
        ...paymentDocument.data,
        paymentId,
        provider: "binance_pay",
        status: "paid",
        transactionId,
        paidAmount,
        currency,
        verifiedAt: now,
        updatedAt: now,
      },
      transactionPath,
      transactionData: {
        uid,
        paymentId,
        provider: "binance_pay",
        transactionId,
        amount: paidAmount,
        currency,
        verifiedAt: now,
      },
    });

    return sendJson(res, 200, { returnCode: "SUCCESS", returnMessage: null });
  } catch (error) {
    if (error instanceof HttpError && (error.statusCode === 401 || error.statusCode === 400)) {
      console.error("Rejected Binance Pay webhook:", error.message);
    }
    return errorResponse(res, error);
  }
};
