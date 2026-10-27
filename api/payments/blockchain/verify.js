const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  activateProWithPayment,
  assertPaymentConfiguration,
  BSC_USDT_CONTRACT,
  TRANSFER_TOPIC,
  USDT_DECIMALS,
  REQUIRED_BSC_CONFIRMATIONS,
  rpc,
  errorResponse,
} = require("../../../lib/payments");

const parseTopicAddress = (topic) => {
  const value = String(topic || "").toLowerCase();
  return /^0x[0-9a-f]{64}$/.test(value) ? "0x" + value.slice(-40) : "";
};

module.exports = async function verifyBlockchainPayment(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    assertPaymentConfiguration();

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const paymentId = String(body.paymentId || "").trim();
    const txHash = String(body.txHash || "").trim().toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(paymentId)) {
      throw new HttpError(400, "La orden de pago no es válida. Crea una nueva orden.");
    }
    if (!/^0x[a-f0-9]{64}$/.test(txHash)) {
      throw new HttpError(400, "Introduce un TxID válido de 66 caracteres que empiece por 0x.");
    }

    const userPath = "users/" + claims.sub;
    const paymentPath = userPath + "/payments/" + paymentId;
    const paymentDocument = await getDocument(paymentPath);
    if (!paymentDocument || paymentDocument.data.uid !== claims.sub ||
        paymentDocument.data.provider !== "blockchain_bep20") {
      throw new HttpError(404, "No se encontró esta orden de pago.");
    }
    if (paymentDocument.data.status === "paid") {
      if (paymentDocument.data.txHash === txHash) {
        return sendJson(res, 200, { success: true, alreadyVerified: true, message: "Este pago ya estaba verificado." });
      }
      throw new HttpError(409, "Esta orden ya se ha pagado con otra transacción.");
    }
    if (paymentDocument.data.status !== "pending") {
      throw new HttpError(409, "Esta orden ya no está disponible. Crea una nueva orden.");
    }
    const invoiceCreatedAt = Date.parse(paymentDocument.data.createdAt || "");
    const invoiceExpiresAt = Date.parse(paymentDocument.data.expiresAt || "");
    if (!Number.isFinite(invoiceCreatedAt) || !Number.isFinite(invoiceExpiresAt) ||
        invoiceExpiresAt <= invoiceCreatedAt) {
      throw new HttpError(409, "La orden no contiene una ventana de pago válida. Crea una nueva orden.");
    }

    const constants = {
      recipient: String(paymentDocument.data.recipient || "").toLowerCase(),
      tokenContract: String(paymentDocument.data.tokenContract || "").toLowerCase(),
      amount: Number(paymentDocument.data.amount),
      amountUnits8: Number(paymentDocument.data.amountUnits8),
      chainId: Number(paymentDocument.data.chainId),
    };
    if (constants.recipient !== process.env.BLOCKCHAIN_RECEIVER_ADDRESS?.toLowerCase() &&
        constants.recipient !== "0x4c64b783f1babc0a2fe62f174873f415393c2269") {
      throw new HttpError(503, "La dirección de recepción configurada no coincide con esta orden. Contacta con soporte.");
    }
    if (constants.tokenContract !== BSC_USDT_CONTRACT || constants.chainId !== 56 ||
        !Number.isSafeInteger(constants.amountUnits8) ||
        constants.amountUnits8 < 1500000001 || constants.amountUnits8 > 1500999999 ||
        Math.round(constants.amount * 100000000) !== constants.amountUnits8) {
      throw new HttpError(503, "La orden no coincide con la configuración de USDT BEP20 esperada.");
    }

    const claimedPath = "paymentTransactions/bep20_" + txHash.slice(2);
    const previouslyClaimed = await getDocument(claimedPath);
    if (previouslyClaimed) {
      const prior = previouslyClaimed.data || {};
      if (prior.uid === claims.sub && prior.paymentId === paymentId) {
        return sendJson(res, 200, { success: true, alreadyVerified: true, message: "Este pago ya estaba verificado." });
      }
      throw new HttpError(409, "Esta transacción ya se ha utilizado para otro pago y no puede reutilizarse.");
    }

    const receipt = await rpc("eth_getTransactionReceipt", [txHash]);
    if (!receipt) {
      throw new HttpError(409, "La transacción todavía no aparece en BNB Smart Chain. Comprueba el TxID e inténtalo de nuevo.");
    }
    if (String(receipt.transactionHash || "").toLowerCase() !== txHash) {
      throw new HttpError(400, "La transacción consultada no coincide con el TxID.");
    }
    if (receipt.status !== "0x1") {
      throw new HttpError(400, "La transacción ha fallado en la blockchain. No se ha activado el plan.");
    }
    if (!receipt.blockNumber) {
      throw new HttpError(409, "La transacción todavía no está incluida en un bloque confirmado.");
    }

    const transactionBlock = await rpc("eth_getBlockByNumber", [receipt.blockNumber, false]);
    const blockTimestampSeconds = Number.parseInt(transactionBlock?.timestamp || "", 16);
    const blockTimestampMs = blockTimestampSeconds * 1000;
    if (!Number.isFinite(blockTimestampMs) ||
        blockTimestampMs < invoiceCreatedAt - 120_000 ||
        blockTimestampMs > invoiceExpiresAt) {
      throw new HttpError(410, "La transferencia se incluyó fuera del periodo de validez de esta orden. Contacta con soporte para revisar el ingreso.");
    }

    const [chainIdHex, currentBlockHex] = await Promise.all([
      rpc("eth_chainId", []),
      rpc("eth_blockNumber", []),
    ]);
    if (Number.parseInt(chainIdHex, 16) !== 56) {
      throw new HttpError(503, "El RPC configurado no está conectado a BNB Smart Chain Mainnet.");
    }

    const txBlock = Number.parseInt(receipt.blockNumber, 16);
    const currentBlock = Number.parseInt(currentBlockHex, 16);
    const confirmations = currentBlock - txBlock + 1;
    if (!Number.isFinite(confirmations) || confirmations < REQUIRED_BSC_CONFIRMATIONS) {
      throw new HttpError(409, "La transacción está localizada, pero aún necesita " +
        REQUIRED_BSC_CONFIRMATIONS + " confirmaciones. Ahora tiene " +
        Math.max(0, confirmations) + ". Vuelve a verificar en unos segundos.");
    }

    const recipient = constants.recipient;
    let receivedUnits = 0n;
    let transferCount = 0;
    for (const log of receipt.logs || []) {
      if (String(log.address || "").toLowerCase() !== constants.tokenContract) continue;
      if (!Array.isArray(log.topics) ||
          String(log.topics[0] || "").toLowerCase() !== TRANSFER_TOPIC ||
          parseTopicAddress(log.topics[2]) !== recipient) continue;
      if (!/^0x[0-9a-f]+$/i.test(String(log.data || ""))) continue;
      receivedUnits += BigInt(log.data);
      transferCount += 1;
    }

    const fractionalDigits = 8;
    const expectedUnits = BigInt(String(constants.amountUnits8)) *
      (10n ** BigInt(USDT_DECIMALS - fractionalDigits));
    if (!transferCount || receivedUnits !== expectedUnits) {
      throw new HttpError(400, "No se ha encontrado una transferencia exacta de 15 USDT del contrato BEP20 configurado a la dirección de recepción. Revisa la red, el token, el importe y el destinatario.");
    }

    const userDocument = await getDocument(userPath);
    if (!userDocument) throw new HttpError(409, "No se encontró el perfil para activar la suscripción.");
    const now = new Date();
    const transactionData = {
      uid: claims.sub,
      paymentId,
      provider: "blockchain_bep20",
      txHash,
      amount: constants.amount,
      amountUnits8: constants.amountUnits8,
      currency: "USDT",
      network: "BNB Smart Chain (BEP20)",
      tokenContract: constants.tokenContract,
      recipient,
      blockNumber: txBlock,
      confirmations,
      verifiedAt: now,
    };
    const paymentUpdate = {
      status: "paid",
      txHash,
      blockNumber: txBlock,
      confirmations,
      verifiedAt: now,
      updatedAt: now,
    };

    const activation = await activateProWithPayment({
      uid: claims.sub,
      paymentPath,
      paymentDocument,
      paymentUpdate: {
        ...paymentUpdate,
        paymentId,
        provider: "blockchain_bep20",
      },
      transactionPath: claimedPath,
      transactionData,
    });

    return sendJson(res, 200, {
      success: true,
      message: "Pago BEP20 confirmado. JJXCAPITAL Pro se ha activado.",
      plan: "pro",
      expiresAt: activation.expiresAt,
      txHash,
      network: "BNB Smart Chain (BEP20)",
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
