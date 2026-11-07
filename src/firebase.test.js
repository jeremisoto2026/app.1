jest.mock("firebase/app", () => ({
  initializeApp: jest.fn((options) => ({ name: "[DEFAULT]", options })),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ mockAuth: true })),
  GoogleAuthProvider: class GoogleAuthProvider {},
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({ mockFirestore: true })),
}));

const PREVIEW_KEYS = [
  "REACT_APP_VERCEL_ENV",
  "REACT_APP_FIREBASE_API_KEY",
  "REACT_APP_FIREBASE_PROJECT_ID",
  "REACT_APP_FIREBASE_AUTH_DOMAIN",
  "REACT_APP_FIREBASE_PREVIEW_API_KEY",
  "REACT_APP_FIREBASE_PREVIEW_AUTH_DOMAIN",
  "REACT_APP_FIREBASE_PREVIEW_PROJECT_ID",
  "REACT_APP_FIREBASE_PREVIEW_STORAGE_BUCKET",
  "REACT_APP_FIREBASE_PREVIEW_MESSAGING_SENDER_ID",
  "REACT_APP_FIREBASE_PREVIEW_APP_ID",
  "REACT_APP_FIREBASE_PREVIEW_MEASUREMENT_ID",
];

describe("Firebase browser configuration", () => {
  let originalEnvironment;

  beforeEach(() => {
    originalEnvironment = Object.fromEntries(
      PREVIEW_KEYS.map((key) => [key, process.env[key]])
    );
    PREVIEW_KEYS.forEach((key) => delete process.env[key]);
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    PREVIEW_KEYS.forEach((key) => {
      if (originalEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnvironment[key];
    });
  });

  test("blocks Preview instead of falling back to Production browser credentials", () => {
    process.env.REACT_APP_VERCEL_ENV = "preview";
    process.env.REACT_APP_FIREBASE_API_KEY = "production-browser-key";
    process.env.REACT_APP_FIREBASE_PROJECT_ID = "jjxcapital-2";

    const firebase = require("./firebase");
    const initializedConfig = require("firebase/app").initializeApp.mock.calls[0][0];

    expect(firebase.firebaseEnvironmentStatus).toMatchObject({
      isPreview: true,
      ready: false,
      reason: "preview-project-not-configured",
    });
    expect(initializedConfig.projectId).toBe("preview-not-configured");
    expect(initializedConfig.projectId).not.toBe("jjxcapital-2");
  });

  test("rejects an explicitly configured Production project in Preview", () => {
    process.env.REACT_APP_VERCEL_ENV = "preview";
    process.env.REACT_APP_FIREBASE_PREVIEW_API_KEY = "preview-browser-key";
    process.env.REACT_APP_FIREBASE_PREVIEW_AUTH_DOMAIN = "jjxcapital-2.firebaseapp.com";
    process.env.REACT_APP_FIREBASE_PREVIEW_PROJECT_ID = "jjxcapital-2";
    process.env.REACT_APP_FIREBASE_PREVIEW_STORAGE_BUCKET = "jjxcapital-2.appspot.com";
    process.env.REACT_APP_FIREBASE_PREVIEW_MESSAGING_SENDER_ID = "123";
    process.env.REACT_APP_FIREBASE_PREVIEW_APP_ID = "1:123:web:preview";

    const firebase = require("./firebase");
    const initializedConfig = require("firebase/app").initializeApp.mock.calls[0][0];

    expect(firebase.firebaseEnvironmentStatus.ready).toBe(false);
    expect(firebase.firebaseEnvironmentStatus.reason).toBe("production-project-rejected");
    expect(initializedConfig.projectId).toBe("preview-not-configured");
  });

  test("uses only dedicated Preview browser configuration when it is complete", () => {
    process.env.REACT_APP_VERCEL_ENV = "preview";
    process.env.REACT_APP_FIREBASE_API_KEY = "production-browser-key";
    process.env.REACT_APP_FIREBASE_PROJECT_ID = "jjxcapital-2";
    process.env.REACT_APP_FIREBASE_PREVIEW_API_KEY = "preview-browser-key";
    process.env.REACT_APP_FIREBASE_PREVIEW_AUTH_DOMAIN = "jjxcapital-preview-test.firebaseapp.com";
    process.env.REACT_APP_FIREBASE_PREVIEW_PROJECT_ID = "jjxcapital-preview-test";
    process.env.REACT_APP_FIREBASE_PREVIEW_STORAGE_BUCKET = "jjxcapital-preview-test.appspot.com";
    process.env.REACT_APP_FIREBASE_PREVIEW_MESSAGING_SENDER_ID = "987654";
    process.env.REACT_APP_FIREBASE_PREVIEW_APP_ID = "1:987654:web:preview";
    process.env.REACT_APP_FIREBASE_PREVIEW_MEASUREMENT_ID = "G-PREVIEW";

    const firebase = require("./firebase");
    const initializedConfig = require("firebase/app").initializeApp.mock.calls[0][0];

    expect(firebase.firebaseEnvironmentStatus.ready).toBe(true);
    expect(initializedConfig.projectId).toBe("jjxcapital-preview-test");
    expect(initializedConfig.apiKey).toBe("preview-browser-key");
  });

  test("keeps the current Production Firebase configuration unchanged", () => {
    process.env.REACT_APP_VERCEL_ENV = "production";

    const firebase = require("./firebase");
    const initializedConfig = require("firebase/app").initializeApp.mock.calls[0][0];

    expect(firebase.firebaseEnvironmentStatus.ready).toBe(true);
    expect(initializedConfig.projectId).toBe("jjxcapital-2");
    expect(initializedConfig.apiKey).toBe("AIzaSyBMHC2YuUO3mwHQORDDGZaQ84-k4tmJGjY");
  });
});
