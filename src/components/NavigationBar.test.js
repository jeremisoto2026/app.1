import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react-dom/test-utils";
import NavigationBar from "./NavigationBar";

describe("NavigationBar", () => {
  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      root = ReactDOM.createRoot(container);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("all desktop navigation buttons select the expected section", () => {
    const onTabChange = jest.fn();
    act(() => {
      root.render(<NavigationBar activeTab="dashboard" onTabChange={onTabChange} />);
    });

    const expectedTabs = [
      ["Resumen", "dashboard"],
      ["Simulador P2P", "p2p"],
      ["Arbitraje", "arbitrage"],
      ["Operaciones", "operations"],
      ["Historial", "history"],
      ["Perfil", "profile"],
    ];

    expectedTabs.forEach(([label, tabId]) => {
      const button = container.querySelector(`button[aria-label="${label}"]`);
      expect(button).not.toBeNull();
      expect(button.getAttribute("type")).toBe("button");
      expect(button.disabled).toBe(false);

      act(() => {
        button.click();
      });

      expect(onTabChange).toHaveBeenLastCalledWith(tabId);
    });

    expect(onTabChange).toHaveBeenCalledTimes(expectedTabs.length);
  });

  test("marks the current section accessibly", () => {
    act(() => {
      root.render(<NavigationBar activeTab="history" onTabChange={jest.fn()} />);
    });

    const activeButton = container.querySelector('button[aria-label="Historial"]');
    const inactiveButton = container.querySelector('button[aria-label="Resumen"]');

    expect(activeButton.getAttribute("aria-current")).toBe("page");
    expect(inactiveButton.hasAttribute("aria-current")).toBe(false);
  });
});
