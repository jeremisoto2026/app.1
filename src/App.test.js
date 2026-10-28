import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react-dom/test-utils";

let mockUser = null;

jest.mock("./contexts/AuthContext", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: mockUser }),
}));

jest.mock("./components/AuthForms", () => {
  const ReactForMock = jest.requireActual("react");
  return function MockAuthForms({ mode }) {
    return ReactForMock.createElement("div", { "data-testid": "auth-dialog" }, mode);
  };
});
jest.mock("./components/NavigationBar", () => () => null);
jest.mock("./components/Dashboard", () => {
  const ReactForMock = jest.requireActual("react");
  return () => ReactForMock.createElement("div", null, "dashboard");
});
jest.mock("./components/UnifiedSimulator", () => () => null);
jest.mock("./components/ArbitrageSessions", () => () => null);
jest.mock("./components/Operations", () => () => null);
jest.mock("./components/History", () => () => null);
jest.mock("./components/Profile", () => () => null);
jest.mock("./components/SectionErrorBoundary", () => ({ children }) => children);

import App from "./App";

describe("authentication dialog lifecycle", () => {
  let container;
  let root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  beforeEach(() => {
    mockUser = null;
    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      root = ReactDOM.createRoot(container);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("closes the create-account dialog when Firebase confirms Google authentication", async () => {
    await act(async () => {
      root.render(<App />);
    });

    const createAccountButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Crear cuenta gratis")
    );
    expect(createAccountButton).toBeTruthy();

    await act(async () => {
      createAccountButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="auth-dialog"]')).toBeTruthy();

    mockUser = {
      uid: "google-user-confirmed",
      displayName: "Persona Prueba",
      email: "persona@example.com",
      photoURL: "",
    };

    await act(async () => {
      root.render(<App />);
    });

    expect(container.querySelector('[data-testid="auth-dialog"]')).toBeNull();
    expect(container.textContent).toContain("dashboard");
  });
});
