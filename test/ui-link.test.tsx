import { describe, expect, test } from "bun:test";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { parseHTML } from "linkedom";
import { link } from "../src/ui/index.ts";

// --- DOM setup via linkedom ---
const { document, window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
(globalThis as any).document = document;
(globalThis as any).window = window;
(globalThis as any).navigator = window.navigator;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("UILink", () => {
  describe("React", () => {
    test("renders an <a> with class tui-link and correct href/label", async () => {
      const { UILink } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(UILink, { href: "/settings", label: "Settings" }));
      });

      const anchor = container.querySelector("a");
      expect(anchor).not.toBeNull();
      expect(anchor!.className).toBe("tui-link");
      expect(anchor!.getAttribute("href")).toBe("/settings");
      expect(anchor!.textContent).toBe("Settings");

      await act(() => root.unmount());
      container.remove();
    });

    test("external URLs get target=_blank and rel=noopener noreferrer", async () => {
      const { UILink } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(UILink, {
          href: "https://github.com/org/repo",
          label: "Repo",
        }));
      });

      const anchor = container.querySelector("a");
      expect(anchor!.getAttribute("target")).toBe("_blank");
      expect(anchor!.getAttribute("rel")).toBe("noopener noreferrer");

      await act(() => root.unmount());
      container.remove();
    });

    test("relative URLs do not get target=_blank", async () => {
      const { UILink } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(UILink, { href: "/local", label: "Local" }));
      });

      const anchor = container.querySelector("a");
      expect(anchor!.getAttribute("target")).toBeNull();
      expect(anchor!.getAttribute("rel")).toBeNull();

      await act(() => root.unmount());
      container.remove();
    });

    test("external prop overrides auto-detection", async () => {
      const { UILink } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(UILink, {
          href: "/local",
          label: "Forced external",
          external: true,
        }));
      });

      const anchor = container.querySelector("a");
      expect(anchor!.getAttribute("target")).toBe("_blank");

      await act(() => root.unmount());
      container.remove();
    });
  });

  describe("DOM", () => {
    test("renders an <a> with class tui-link and correct href/label", () => {
      const node = link({ href: "https://example.com", label: "Example" });
      expect(node.tagName).toBe("A");
      expect(node.className).toBe("tui-link");
      expect(node.getAttribute("href")).toBe("https://example.com");
      expect(node.textContent).toBe("Example");
    });

    test("external URLs get target=_blank", () => {
      const node = link({ href: "https://jira.com/ticket/123", label: "JIRA-123" });
      expect(node.getAttribute("target")).toBe("_blank");
      expect(node.getAttribute("rel")).toBe("noopener noreferrer");
    });

    test("relative URLs do not get target=_blank", () => {
      const node = link({ href: "/dashboard", label: "Dashboard" });
      expect(node.getAttribute("target")).toBeNull();
    });

    test("external prop overrides auto-detection", () => {
      const node = link({ href: "/internal", label: "Open new", external: true });
      expect(node.getAttribute("target")).toBe("_blank");
    });
  });
});
