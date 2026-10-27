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

const firestoreMocks = jest.requireMock("firebase/firestore");

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
    firestoreMocks.getDoc.mockReset();
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        nombre: "Persona",
        apellido: "Prueba",
        email: "persona@example.com",
        plan: "free",
        exportsUsed: 0,
        createdAt: { toDate: () => new Date("2024-01-01T00:00:00.000Z") },
      }),
    });
    firestoreMocks.getDocs.mockReset();
    firestoreMocks.getDocs.mockResolvedValue({ size: 2 });
    firestoreMocks.onSnapshot.mockReset();
    firestoreMocks.onSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ exists: () => true, data: () => ({ exportsUsed: 0 }) });
      return () => {};
    });
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
    expect(container.textContent).toContain("Operaciones registradas");
    expect(container.textContent).toContain("2");
    expect(container.textContent).toContain("Planes y facturación");
    expect(container.textContent).toContain("TIPO DE PLAN ACTUAL");
    expect(container.textContent).toContain("Órdenes / arbitrajes");
    expect(container.textContent).toContain("300 máximo");
    expect(container.textContent).toContain("150 máximo");
    expect(container.textContent).toContain("50 máximo");
    expect(container.textContent).toContain("Métodos de pago");
    expect(container.textContent).toContain("Historial de pagos");
    expect(container.textContent).toContain("15 USDT");
    expect(container.textContent).toContain("807678814");
    expect(container.textContent).toContain("0x4c64b783f1babc0a2fe62f174873f415393c2269");
    expect(container.textContent).toContain("BNB Smart Chain (BEP20)");
    expect(container.textContent).toContain("La verificación no confía solo en el TxID");
    expect(container.textContent).toContain("Contactar con soporte");
  });

  test("keeps the profile visible when the operation counter cannot load", async () => {
    firestoreMocks.getDocs.mockRejectedValueOnce(new Error("Permission denied"));

    await act(async () => {
      root.render(<Profile />);
    });

    expect(container.textContent).toContain("Información del perfil");
    expect(container.textContent).toContain("No se pudo consultar el historial");
    expect(container.textContent).toContain("Planes y facturación");
    expect(container.textContent).toContain("Métodos de pago");
    expect(container.textContent).toContain("Historial de pagos");
  });
});
