import { describe, expect, test, mock } from "bun:test";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { parseHTML } from "linkedom";
import { link } from "../src/ui/index.ts";
import { InstrumentApiProvider } from "../src/sdk/react.tsx";
import type { InstrumentFrontendAPI, HostEventMap } from "../src/sdk/types/instrument-sdk.ts";

// --- DOM setup via linkedom ---
const { document, window } = parseHTML("<!DOCTYPE html><html><body></body></html>");
(globalThis as any).document = document;
(globalThis as any).window = window;
(globalThis as any).navigator = window.navigator;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function createMockApi(overrides: Partial<InstrumentFrontendAPI> = {}): InstrumentFrontendAPI {
  return {
    instrumentId: "test",
    permissions: [],
    storage: {} as any,
    sessions: {} as any,
    connectors: {} as any,
    stages: {} as any,
    events: { subscribe: mock(() => () => {}) },
    actions: {} as any,
    settings: {} as any,
    ui: {
      renderMarkdown: mock((text: string) => text),
      openUrl: mock(() => {}),
    },
    registerShortcut: mock(() => {}),
    emit: mock(() => {}),
    ...overrides,
  } as InstrumentFrontendAPI;
}

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

    test("external link with API provider calls openUrl on click", async () => {
      const { UILink } = await import("../src/ui/react.tsx");
      const mockApi = createMockApi();

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(
          React.createElement(InstrumentApiProvider, {
            api: mockApi,
            children: React.createElement(UILink, {
              href: "https://github.com/org/repo",
              label: "Repo",
            }),
          })
        );
      });

      const anchor = container.querySelector("a")!;
      await act(() => {
        anchor.click();
      });

      expect(mockApi.ui.openUrl).toHaveBeenCalledWith("https://github.com/org/repo");

      await act(() => root.unmount());
      container.remove();
    });

    test("internal link does NOT call openUrl on click", async () => {
      const { UILink } = await import("../src/ui/react.tsx");
      const mockApi = createMockApi();

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(
          React.createElement(InstrumentApiProvider, {
            api: mockApi,
            children: React.createElement(UILink, { href: "/settings", label: "Settings" }),
          })
        );
      });

      const anchor = container.querySelector("a")!;
      await act(() => {
        anchor.click();
      });

      expect(mockApi.ui.openUrl).not.toHaveBeenCalled();

      await act(() => root.unmount());
      container.remove();
    });

    test("works without API provider (graceful fallback)", async () => {
      const { UILink } = await import("../src/ui/react.tsx");

      const container = document.createElement("div");
      document.body.appendChild(container);
      let root: Root;
      await act(() => {
        root = createRoot(container);
        root.render(React.createElement(UILink, {
          href: "https://example.com",
          label: "Example",
        }));
      });

      const anchor = container.querySelector("a");
      expect(anchor).not.toBeNull();
      expect(anchor!.textContent).toBe("Example");
      // Should not throw when clicking without provider
      await act(() => {
        anchor!.click();
      });

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

    test("external link with openUrl calls it on click", () => {
      const openUrl = mock(() => {});
      const node = link({
        href: "https://github.com/org/repo",
        label: "Repo",
        openUrl,
      });

      node.click();

      expect(openUrl).toHaveBeenCalledWith("https://github.com/org/repo");
    });

    test("internal link with openUrl does NOT call it", () => {
      const openUrl = mock(() => {});
      const node = link({
        href: "/dashboard",
        label: "Dashboard",
        openUrl,
      });

      node.click();

      expect(openUrl).not.toHaveBeenCalled();
    });
  });
});
