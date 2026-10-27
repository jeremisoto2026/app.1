const {
  HttpError,
  sendJson,
  requirePost,
  requireFirebaseUser,
  getDocument,
  commitWrites,
  createWrite,
  errorResponse,
} = require("../../lib/payments");
const { getExportCount, assertPlanAllows } = require("../../lib/plans");

module.exports = async function recordExport(req, res) {
  if (!requirePost(req, res)) return;
  try {
    const claims = await requireFirebaseUser(req);
    const userPath = "users/" + claims.sub;
    const profileDocument = await getDocument(userPath);
    if (!profileDocument) throw new HttpError(409, "No se encontró el perfil de tu cuenta.");

    const currentCount = getExportCount(profileDocument.data || {});
    assertPlanAllows(profileDocument.data || {}, "exports", currentCount);

    const nextCount = currentCount + 1;
    const previousUsage = profileDocument.data.usage && typeof profileDocument.data.usage === "object"
      ? profileDocument.data.usage
      : {};
    const previousExports = previousUsage.exportaciones && typeof previousUsage.exportaciones === "object"
      ? previousUsage.exportaciones
      : {};
    const usage = {
      ...previousUsage,
      exportaciones: {
        ...previousExports,
        usadas: nextCount,
      },
    };
    const update = {
      exportsUsed: nextCount,
      usage,
    };

    await commitWrites([createWrite(
      userPath,
      update,
      profileDocument.updateTime ? { updateTime: profileDocument.updateTime } : { exists: true }
    )]);

    return sendJson(res, 200, {
      success: true,
      exportsUsed: nextCount,
      unlimited: require("../../lib/plans").isProSubscriptionActive(profileDocument.data || {}),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};
