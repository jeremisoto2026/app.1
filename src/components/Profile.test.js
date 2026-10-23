import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react-dom/test-utils";

jest.mock("../contexts/AuthContext", () => {
  const user = {
    uid: "profile-test-user",
    email: "persona@example.com",
    displayName: "Persona Prueba",
    photoURL: "",
    metadata: { creationTime: "2024-01-01T00:00:00.000Z" },
  };
  return { useAuth: () => ({ user, signOut: jest.fn() }) };
});

jest.mock("../firebase", () => ({ db: {} }));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  getDoc: jest.fn(async () => ({
    exists: () => true,
    data: () => ({
      nombre: "Persona",
      apellido: "Prueba",
      email: "persona@example.com",
      plan: "free",
      exportsUsed: 0,
      createdAt: { toDate: () => new Date("2024-01-01T00:00:00.000Z") },
    }),
  })),
  getDocs: jest.fn(async () => ({ size: 2 })),
  onSnapshot: jest.fn((_ref, onNext) => {
    onNext({ exists: () => true, data: () => ({ exportsUsed: 0 }) });
    return () => {};
  }),
}));

describe("Profile", () => {
  let Profile;
  let container;
  let root;
  let consoleError;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    Profile = require("./Profile").default;
  });

  afterAll(() => {
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      root = ReactDOM.createRoot(container);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    consoleError.mockRestore();
  });

  test("renders the profile and subscriptions section without crashing", async () => {
    await act(async () => {
      root.render(<Profile />);
    });

    expect(container.textContent).toContain("Información del perfil");
    expect(container.textContent).toContain("Uso de tu cuenta");
    expect(container.textContent).toContain("Suscripciones");
    expect(container.textContent).toContain("Contactar con soporte");
  });
});
