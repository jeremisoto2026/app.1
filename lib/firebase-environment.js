const PRODUCTION_FIREBASE_PROJECT_ID = "jjxcapital-2";

function isPreviewFirebaseEnvironment(env = process.env) {
  return String(env.VERCEL_ENV || "").trim().toLowerCase() === "preview";
}

function getFirebaseProjectId(env = process.env) {
  if (isPreviewFirebaseEnvironment(env)) {
    // Preview must never inherit the general Firebase project variables.
    return String(env.FIREBASE_PREVIEW_PROJECT_ID || "").trim();
  }

  return String(
    env.FIREBASE_PROJECT_ID ||
    env.REACT_APP_FIREBASE_PROJECT_ID ||
    PRODUCTION_FIREBASE_PROJECT_ID
  ).trim();
}

function assertFirebaseProjectIsolation(env = process.env) {
  const projectId = getFirebaseProjectId(env);

  if (isPreviewFirebaseEnvironment(env)) {
    if (!projectId) {
      throw new Error("FIREBASE_PREVIEW_PROJECT_ID_MISSING");
    }
    if (projectId === PRODUCTION_FIREBASE_PROJECT_ID) {
      throw new Error("FIREBASE_PREVIEW_MUST_NOT_USE_PRODUCTION");
    }
  }

  if (!projectId) throw new Error("FIREBASE_PROJECT_ID_MISSING");
  return projectId;
}

function getFirebaseServiceAccount(env = process.env, projectId = getFirebaseProjectId(env)) {
  const preview = isPreviewFirebaseEnvironment(env);
  const jsonKey = preview ? "FIREBASE_PREVIEW_SERVICE_ACCOUNT_JSON" : "FIREBASE_SERVICE_ACCOUNT_JSON";
  const emailKey = preview ? "FIREBASE_PREVIEW_CLIENT_EMAIL" : "FIREBASE_CLIENT_EMAIL";
  const privateKeyKey = preview ? "FIREBASE_PREVIEW_PRIVATE_KEY" : "FIREBASE_PRIVATE_KEY";

  let account = null;
  if (env[jsonKey]) {
    try {
      account = JSON.parse(env[jsonKey]);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_INVALID");
    }
  } else if (env[emailKey] && env[privateKeyKey]) {
    account = {
      project_id: projectId,
      client_email: env[emailKey],
      private_key: env[privateKeyKey],
    };
  }

  if (!account?.client_email || !account?.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_MISSING");
  }

  const accountProjectId = String(account.project_id || projectId || "").trim();
  if (!projectId || accountProjectId !== projectId) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_PROJECT_MISMATCH");
  }

  return {
    projectId: accountProjectId,
    clientEmail: String(account.client_email),
    privateKey: String(account.private_key).replace(/\\n/g, "\n"),
  };
}

module.exports = {
  PRODUCTION_FIREBASE_PROJECT_ID,
  isPreviewFirebaseEnvironment,
  getFirebaseProjectId,
  assertFirebaseProjectIsolation,
  getFirebaseServiceAccount,
};
