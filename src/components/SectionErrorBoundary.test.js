import React from "react";
import ReactDOM from "react-dom/client";
import { act } from "react-dom/test-utils";
import SectionErrorBoundary from "./SectionErrorBoundary";

describe("SectionErrorBoundary", () => {
  let container;
  let root;
  let consoleError;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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

  test("shows a recovery screen instead of allowing a section error to blank the app", () => {
    const onReturn = jest.fn();
    function BrokenSection() {
      throw new Error("test render error");
    }

    act(() => {
      root.render(
        <SectionErrorBoundary onReturn={onReturn}>
          <BrokenSection />
        </SectionErrorBoundary>
      );
    });

    expect(container.textContent).toContain("No se pudo abrir esta sección");
    expect(container.textContent).toContain("Tus operaciones guardadas no se eliminan");
    const returnButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Volver al resumen")
    );
    expect(returnButton).toBeTruthy();

    act(() => returnButton.click());
    expect(onReturn).toHaveBeenCalledTimes(1);
  });
});
