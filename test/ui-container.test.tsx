import { describe, expect, test } from "bun:test";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { parseHTML } from "linkedom";
import { container } from "../src/ui/index.ts";

// --- DOM setup via linkedom ---
const { document, window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
(globalThis as any).document = document;
(globalThis as any).window = window;
(globalThis as any).navigator = window.navigator;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("UIContainer", () => {
  describe("React", () => {
    test("renders a div with class tui-container", async () => {
      const { UIContainer } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(
          React.createElement(UIContainer, null,
            React.createElement("span", null, "Hello")
          )
        );
      });

      const el = container.querySelector(".tui-container");
      expect(el).not.toBeNull();
      expect(el!.querySelector("span")!.textContent).toBe("Hello");

      await act(() => root.unmount());
      container.remove();
    });

    test("renders multiple children", async () => {
      const { UIContainer } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(
          React.createElement(UIContainer, null,
            React.createElement("p", null, "First"),
            React.createElement("p", null, "Second")
          )
        );
      });

      const el = container.querySelector(".tui-container");
      const paragraphs = el!.querySelectorAll("p");
      expect(paragraphs.length).toBe(2);

      await act(() => root.unmount());
      container.remove();
    });

    test("applies additional className", async () => {
      const { UIContainer } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(
          React.createElement(UIContainer, { className: "my-panel" },
            React.createElement("span", null, "Content")
          )
        );
      });

      const el = container.querySelector(".tui-container");
      expect(el!.className).toContain("tui-container");
      expect(el!.className).toContain("my-panel");

      await act(() => root.unmount());
      container.remove();
    });
  });

  describe("DOM", () => {
    test("renders a div with class tui-container", () => {
      const child = document.createElement("span");
      child.textContent = "Hello";
      const node = container({ children: [child] });
      expect(node.className).toContain("tui-container");
      expect(node.querySelector("span")!.textContent).toBe("Hello");
    });

    test("applies additional className", () => {
      const node = container({ className: "my-panel", children: [] });
      expect(node.className).toContain("tui-container");
      expect(node.className).toContain("my-panel");
    });
  });
});
