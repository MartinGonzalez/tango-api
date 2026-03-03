import { describe, expect, test } from "bun:test";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { parseHTML } from "linkedom";
import { keyValue } from "../src/ui/index.ts";
import { el } from "../src/ui/dom.ts";

// --- DOM setup via linkedom ---
const { document, window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
(globalThis as any).document = document;
(globalThis as any).window = window;
(globalThis as any).navigator = window.navigator;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("UIKeyValue", () => {
  describe("React", () => {
    test("renders a container with class tui-kv", async () => {
      const { UIKeyValue } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(UIKeyValue, {
          items: [{ label: "Author", value: "alice" }],
        }));
      });

      const kv = container.querySelector(".tui-kv");
      expect(kv).not.toBeNull();

      await act(() => root.unmount());
      container.remove();
    });

    test("renders one row per item", async () => {
      const { UIKeyValue } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(UIKeyValue, {
          items: [
            { label: "Repository", value: "tango-api" },
            { label: "Branch", value: "main" },
            { label: "Author", value: "alice" },
          ],
        }));
      });

      const rows = container.querySelectorAll(".tui-kv-row");
      expect(rows.length).toBe(3);

      await act(() => root.unmount());
      container.remove();
    });

    test("renders label and value text", async () => {
      const { UIKeyValue } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(UIKeyValue, {
          items: [{ label: "Status", value: "open" }],
        }));
      });

      const label = container.querySelector(".tui-kv-label");
      const value = container.querySelector(".tui-kv-value");
      expect(label!.textContent).toBe("Status");
      expect(value!.textContent).toBe("open");

      await act(() => root.unmount());
      container.remove();
    });

    test("value accepts ReactNode children", async () => {
      const { UIKeyValue } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(UIKeyValue, {
          items: [{
            label: "Checks",
            value: React.createElement("span", { className: "custom-badge" }, "passing"),
          }],
        }));
      });

      const badge = container.querySelector(".custom-badge");
      expect(badge).not.toBeNull();
      expect(badge!.textContent).toBe("passing");

      await act(() => root.unmount());
      container.remove();
    });

    test("labelWidth sets width on label elements", async () => {
      const { UIKeyValue } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(UIKeyValue, {
          items: [{ label: "Repo", value: "tango" }],
          labelWidth: "120px",
        }));
      });

      const label = container.querySelector(".tui-kv-label") as HTMLElement;
      expect(label.style.width).toBe("120px");

      await act(() => root.unmount());
      container.remove();
    });

    test("empty items renders empty container", async () => {
      const { UIKeyValue } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(UIKeyValue, { items: [] }));
      });

      const kv = container.querySelector(".tui-kv");
      expect(kv).not.toBeNull();
      expect(kv!.children.length).toBe(0);

      await act(() => root.unmount());
      container.remove();
    });
  });

  describe("DOM", () => {
    test("renders container with class tui-kv", () => {
      const node = keyValue({
        items: [{ label: "Author", value: "alice" }],
      });
      expect(node.className).toBe("tui-kv");
    });

    test("renders one row per item", () => {
      const node = keyValue({
        items: [
          { label: "Repository", value: "tango-api" },
          { label: "Branch", value: "main" },
        ],
      });
      const rows = node.querySelectorAll(".tui-kv-row");
      expect(rows.length).toBe(2);
    });

    test("renders label and value text", () => {
      const node = keyValue({
        items: [{ label: "Status", value: "open" }],
      });
      const label = node.querySelector(".tui-kv-label");
      const value = node.querySelector(".tui-kv-value");
      expect(label!.textContent).toBe("Status");
      expect(value!.textContent).toBe("open");
    });

    test("value accepts HTMLElement child", () => {
      const badge = el("span", { className: "custom-badge", text: "passing" });
      const node = keyValue({
        items: [{ label: "Checks", value: badge }],
      });
      const found = node.querySelector(".custom-badge");
      expect(found).not.toBeNull();
      expect(found!.textContent).toBe("passing");
    });

    test("labelWidth sets width on labels", () => {
      const node = keyValue({
        items: [{ label: "Repo", value: "tango" }],
        labelWidth: "100px",
      });
      const label = node.querySelector(".tui-kv-label") as HTMLElement;
      expect(label.style.width).toBe("100px");
    });

    test("empty items renders empty container", () => {
      const node = keyValue({ items: [] });
      expect(node.className).toBe("tui-kv");
      expect(node.children.length).toBe(0);
    });
  });
});
