import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react-dom/test-utils";

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      uid: "dashboard-test-user",
      displayName: "Persona Prueba",
      photoURL: "",
    },
  }),
}));

jest.mock("../firebase", () => ({ db: {} }));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((...parts) => ({ path: parts.join("/") })),
  doc: jest.fn((...parts) => ({ path: parts.join("/") })),
  getDocs: jest.fn(async () => ({ docs: [] })),
  getDoc: jest.fn(async () => ({
    exists: () => true,
    data: () => ({ plan: "free" }),
  })),
}));

jest.mock("../utils/financialCalculations", () => ({
  calculateDashboardSummaryMetrics: jest.fn(() => ({
    totalOperations: 0,
    profitByCurrency: {},
    monthlyProfitByCurrency: {},
    successRate: 0,
    closedSales: 0,
    winningSales: 0,
  })),
}));

const firestoreMocks = jest.requireMock("firebase/firestore");
const financialMocks = jest.requireMock("../utils/financialCalculations");

const emptySummaryMetrics = {
  totalOperations: 0,
  profitByCurrency: {},
  monthlyProfitByCurrency: {},
  successRate: 0,
  closedSales: 0,
  winningSales: 0,
};

describe("Dashboard Pro promotion", () => {
  let Dashboard;
  let container;
  let root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    Dashboard = require("./Dashboard").default;
  });

  afterAll(() => {
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  beforeEach(() => {
    financialMocks.calculateDashboardSummaryMetrics.mockReset();
    financialMocks.calculateDashboardSummaryMetrics.mockReturnValue(emptySummaryMetrics);
    firestoreMocks.getDocs.mockReset();
    firestoreMocks.getDocs.mockResolvedValue({ docs: [] });
    firestoreMocks.getDoc.mockReset();
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ plan: "free" }),
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
  });

  const renderDashboard = async (onOpenProfile = jest.fn()) => {
    await act(async () => {
      root.render(
        <Dashboard
          onOpenProfile={onOpenProfile}
          onOpenOperations={jest.fn()}
          onOpenHistory={jest.fn()}
          onOpenArbitrages={jest.fn()}
        />
      );
    });
    return onOpenProfile;
  };

  test("shows the Pro promotion for free accounts and opens the profile from its CTA", async () => {
    const onOpenProfile = jest.fn();

    await renderDashboard(onOpenProfile);

    expect(container.textContent).toContain("JJXCAPITAL PRO");
    expect(container.textContent).toContain("15 USDT");
    expect(container.textContent).toContain("Arbitrajes ilimitados");

    const cta = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Ver plan Pro")
    );
    expect(cta).toBeTruthy();

    act(() => {
      cta.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  });

  test("does not show the Pro promotion when the subscription is active", async () => {
    firestoreMocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        plan: "pro",
        subscriptionExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }),
    });

    await renderDashboard();

    expect(container.textContent).not.toContain("JJXCAPITAL PRO");
    expect(container.textContent).not.toContain("Ver plan Pro");
  });
});
