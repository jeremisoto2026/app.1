const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  errorResponse,
} = require("./payments");
const {
  acquireAccountDeletionLock,
  markAccountDeletionRetryable,
  releaseAccountDeletionLock,
  deleteUserAccountData,
} = require("./account-deletion");
const { deleteFirebaseAuthAccount } = require("./firebase-session");

const RECENT_LOGIN_WINDOW_SECONDS = 5 * 60;

function getBearerToken(req) {
  const value = req.headers?.authorization || req.headers?.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(value));
  return match ? match[1].trim() : "";
}

module.exports = async function deleteAccount(req, res) {
  if (!requirePost(req, res)) return;
  if (process.env.FIRESTORE_ACCOUNT_DELETION_LOCKS_ACTIVE !== "true") {
    return sendJson(res, 503, {
      error: "La eliminación de cuentas está desactivada hasta publicar y verificar las reglas de bloqueo de Firestore en este entorno Preview.",
    });
  }

  let uid = "";
  let lockAcquired = false;
  let authAccountDeleted = false;

  try {
    const claims = await requireFirebaseUser(req, { allowDeletionPending: true });
    uid = claims.sub;

    if (req.body?.confirmation !== "DELETE_MY_ACCOUNT") {
      throw new HttpError(400, "Confirma la eliminación escribiendo la frase requerida.");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const authAge = nowSeconds - Number(claims.auth_time);
    if (!Number.isFinite(authAge) || authAge < -60 || authAge > RECENT_LOGIN_WINDOW_SECONDS) {
      throw new HttpError(401, "Por seguridad, vuelve a confirmar tu identidad antes de eliminar la cuenta.");
    }

    const idToken = getBearerToken(req);
    if (!idToken) throw new HttpError(401, "Inicia sesión de nuevo antes de eliminar la cuenta.");

    await acquireAccountDeletionLock(uid);
    lockAcquired = true;

    const deletionSummary = await deleteUserAccountData(uid);

    try {
      await deleteFirebaseAuthAccount({ idToken, env: process.env });
      authAccountDeleted = true;
    } catch (error) {
      throw new HttpError(
        Number(error?.statusCode) || 503,
        error?.message || "Firebase no pudo eliminar la cuenta. Inténtalo de nuevo."
      );
    }

    try {
      await releaseAccountDeletionLock(uid);
      lockAcquired = false;
    } catch (error) {
      // Auth and user data have already been deleted. Keep the minimal lock rather
      // than returning a false failure; an administrator can remove this orphan later.
      console.error("Account deletion lock cleanup failed:", error?.code || error?.message || "unknown_error");
    }

    return sendJson(res, 200, {
      success: true,
      deleted: true,
      retainedPseudonymizedPaymentReferences: deletionSummary.pseudonymizedPaymentTransactions,
      message: "La cuenta y sus datos personales se han eliminado. Se han conservado referencias de pago pseudonimizadas con HMAC para evitar reutilizaciones.",
    });
  } catch (error) {
    if (lockAcquired && !authAccountDeleted) {
      try {
        await markAccountDeletionRetryable(uid);
      } catch (lockError) {
        console.error("Account deletion retry marker failed:", lockError?.code || lockError?.message || "unknown_error");
      }
    }
    if (error instanceof HttpError) return errorResponse(res, error);
    console.error("Account deletion failed:", error?.code || error?.message || "unknown_error");
    return sendJson(res, 500, { error: "No se pudo completar la eliminación de la cuenta. No vuelvas a registrarte; inicia sesión e inténtalo de nuevo." });
  }
};
