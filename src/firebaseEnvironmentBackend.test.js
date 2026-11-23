const {
  PRODUCTION_FIREBASE_PROJECT_ID,
  isPreviewFirebaseEnvironment,
  getFirebaseProjectId,
  assertFirebaseProjectIsolation,
  getFirebaseServiceAccount,
} = require("../lib/firebase-environment");

describe("Firebase environment isolation", () => {
  test("Preview ignores the shared Production project and service-account variables", () => {
    const env = {
      VERCEL_ENV: "preview",
      FIREBASE_PROJECT_ID: PRODUCTION_FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: "production@example.iam.gserviceaccount.com",
      FIREBASE_PRIVATE_KEY: "production-private-key",
    };

    expect(isPreviewFirebaseEnvironment(env)).toBe(true);
    expect(getFirebaseProjectId(env)).toBe("");
    expect(() => assertFirebaseProjectIsolation(env))
      .toThrow("FIREBASE_PREVIEW_PROJECT_ID_MISSING");
    expect(() => getFirebaseServiceAccount(env, ""))
      .toThrow("FIREBASE_SERVICE_ACCOUNT_MISSING");
  });

  test("Preview rejects the Production project even when explicitly supplied", () => {
    const env = {
      VERCEL_ENV: "preview",
      FIREBASE_PREVIEW_PROJECT_ID: PRODUCTION_FIREBASE_PROJECT_ID,
    };

    expect(() => assertFirebaseProjectIsolation(env))
      .toThrow("FIREBASE_PREVIEW_MUST_NOT_USE_PRODUCTION");
  });

  test("Preview uses only its dedicated project and service-account variables", () => {
    const env = {
      VERCEL_ENV: "preview",
      FIREBASE_PROJECT_ID: PRODUCTION_FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: "production@example.iam.gserviceaccount.com",
      FIREBASE_PRIVATE_KEY: "production-private-key",
      FIREBASE_PREVIEW_PROJECT_ID: "jjxcapital-preview-test",
      FIREBASE_PREVIEW_CLIENT_EMAIL: "preview@example.iam.gserviceaccount.com",
      FIREBASE_PREVIEW_PRIVATE_KEY: "preview-private-key",
    };

    expect(assertFirebaseProjectIsolation(env)).toBe("jjxcapital-preview-test");
    expect(getFirebaseServiceAccount(env)).toEqual({
      projectId: "jjxcapital-preview-test",
      clientEmail: "preview@example.iam.gserviceaccount.com",
      privateKey: "preview-private-key",
    });
  });

  test("Production keeps its existing project and service-account behavior", () => {
    const env = {
      VERCEL_ENV: "production",
      FIREBASE_CLIENT_EMAIL: "production@example.iam.gserviceaccount.com",
      FIREBASE_PRIVATE_KEY: "line-1\\nline-2",
    };

    expect(isPreviewFirebaseEnvironment(env)).toBe(false);
    expect(getFirebaseProjectId(env)).toBe(PRODUCTION_FIREBASE_PROJECT_ID);
    expect(getFirebaseServiceAccount(env)).toEqual({
      projectId: PRODUCTION_FIREBASE_PROJECT_ID,
      clientEmail: "production@example.iam.gserviceaccount.com",
      privateKey: "line-1\nline-2",
    });
  });

  test("a Preview service account for another project is rejected", () => {
    const env = {
      VERCEL_ENV: "preview",
      FIREBASE_PREVIEW_PROJECT_ID: "jjxcapital-preview-test",
      FIREBASE_PREVIEW_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: "another-project",
        client_email: "preview@example.iam.gserviceaccount.com",
        private_key: "preview-private-key",
      }),
    };

    expect(() => getFirebaseServiceAccount(env))
      .toThrow("FIREBASE_SERVICE_ACCOUNT_PROJECT_MISMATCH");
  });
});
