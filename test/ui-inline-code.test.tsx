import { describe, expect, test } from "bun:test";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { parseHTML } from "linkedom";
import { inlineCode } from "../src/ui/index.ts";

// --- DOM setup via linkedom ---
const { document, window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
(globalThis as any).document = document;
(globalThis as any).window = window;
(globalThis as any).navigator = window.navigator;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Lazy import React component to avoid circular issues with DOM globals
let UIInlineCode: (props: { code: string }) => JSX.Element;

describe("UIInlineCode", () => {
  describe("React", () => {
    test("renders a <code> element with class tui-inline-code", async () => {
      const { UIInlineCode: Component } = await import("../src/ui/react.tsx");
      UIInlineCode = Component;

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(UIInlineCode, { code: "purchase-connector" }));
      });

      const code = container.querySelector("code");
      expect(code).not.toBeNull();
      expect(code!.className).toBe("tui-inline-code");
      expect(code!.textContent).toBe("purchase-connector");

      await act(() => root.unmount());
      container.remove();
    });

    test("does not apply badge classes", async () => {
      const { UIInlineCode: Component } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(Component, { code: "2.1.1" }));
      });

      const code = container.querySelector("code");
      expect(code!.className).not.toContain("tui-badge");

      await act(() => root.unmount());
      container.remove();
    });
  });

  describe("DOM", () => {
    test("renders a <code> element with class tui-inline-code", () => {
      const node = inlineCode({ code: "v2.1.1" });
      expect(node.tagName).toBe("CODE");
      expect(node.className).toBe("tui-inline-code");
      expect(node.textContent).toBe("v2.1.1");
    });
  });
});
