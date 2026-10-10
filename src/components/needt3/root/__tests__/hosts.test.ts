/**
 * @jest-environment jsdom
 *
 * The four hosts both UIs open through the store (Settings sheet, composer,
 * Ask, paywall) are permanent: mounted on the phone and on the desktop, and
 * never remounted when the UI changes. The real V3Root + V3Shell + ShellFrame
 * run; their leaves are stand-ins that count mounts and unmounts.
 */
import { act, createElement as h } from "react";

import { type Root, createRoot } from "react-dom/client";

import type { PhoneUi } from "@/lib/needt3/phone-ui";

import { useNeedt3Ui } from "@/store/needt3-ui";

import { V3Root } from "../V3Root";

interface Log {
  mounts: Record<string, number>;
  unmounts: Record<string, number>;
}

const G = globalThis as {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
  __hostLog?: Log;
};
G.IS_REACT_ACT_ENVIRONMENT = true;

/** A leaf stand-in: a div with a marker that logs its mount and unmount. */
function stub(name: string, extra?: () => Record<string, unknown>) {
  const React = jest.requireActual<typeof import("react")>("react");
  return function Stub() {
    React.useEffect(() => {
      const log = G.__hostLog!;
      log.mounts[name] = (log.mounts[name] ?? 0) + 1;
      return () => {
        log.unmounts[name] = (log.unmounts[name] ?? 0) + 1;
      };
    }, []);
    return React.createElement("div", { "data-stub": name, ...extra?.() });
  };
}

jest.mock("@/styles/v3-entry.css", () => ({}), { virtual: true });
jest.mock("@/lib/needt3/fonts", () => ({ V3_FONT_CLASSES: "" }));
jest.mock("next/navigation", () => ({
  usePathname: () => "/today",
  useRouter: () => ({ push: () => {} }),
}));

jest.mock("../../composer/Composer", () => {
  const { useNeedt3Ui: store } = jest.requireActual("@/store/needt3-ui");
  const React = jest.requireActual<typeof import("react")>("react");
  const Base = stub("composer");
  return {
    ComposerHost() {
      const open = store((s: { composerOpen: boolean }) => s.composerOpen);
      return React.createElement(
        "div",
        { "data-host": "composer", "data-open": String(open) },
        React.createElement(Base)
      );
    },
  };
});
jest.mock("../../corner/CornerLayer", () => ({
  CornerLayer: stub("ask"),
}));
jest.mock("../../settings/SettingsSheet", () => ({
  SettingsSheet: stub("settings"),
}));
jest.mock("../../paywall/PaywallHost", () => ({
  PaywallHost: stub("paywall"),
}));
jest.mock("../../ctx/CtxLayer", () => ({ CtxLayer: stub("ctx") }));
jest.mock("../../palette/CommandPalette", () => ({
  CommandPalette: stub("palette"),
}));
jest.mock("../../phone/shell/PhoneShell", () => ({
  PhoneShell: stub("phone-shell"),
}));
jest.mock("../../shell/CustomizeSidebar", () => ({
  CustomizeSidebar: stub("customize"),
}));
jest.mock("../../shell/KeySheet", () => ({ KeySheet: stub("keys") }));
jest.mock("../../shell/Sidebar", () => ({ Sidebar: stub("sidebar") }));
jest.mock("../../shell/TopIcons", () => ({ WhatsNew: stub("news") }));
jest.mock("../../shell/Topbar", () => ({ Topbar: stub("topbar") }));

let host: HTMLDivElement;
let root: Root;

const render = (ui: PhoneUi) =>
  act(() =>
    root.render(
      h(V3Root, { initialUi: ui, uiForced: true }, h("section", { id: "page" }))
    )
  );

const q = (name: string) => host.querySelector(`[data-stub="${name}"]`);

beforeEach(() => {
  G.__hostLog = { mounts: {}, unmounts: {} };
  useNeedt3Ui.setState({ composerOpen: false });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("permanent hosts", () => {
  it("on the phone the Settings sheet, composer, Ask and paywall are mounted", () => {
    render("phone");
    for (const name of ["settings", "composer", "ask", "paywall"])
      expect(q(name)).not.toBeNull();
    // and the phone chrome is the phone's, not the desktop's layers
    expect(q("phone-shell")).not.toBeNull();
    expect(q("palette")).toBeNull();
    expect(q("ctx")).toBeNull();
  });

  it("on the desktop all four are mounted too, beside the desktop layers", () => {
    render("desktop");
    for (const name of ["settings", "composer", "ask", "paywall"])
      expect(q(name)).not.toBeNull();
    expect(q("palette")).not.toBeNull();
    expect(q("phone-shell")).toBeNull();
  });

  it("the hosts sit inside the portal scope's frame, not in the UI-dependent slot", () => {
    render("phone");
    const frame = host.querySelector("[data-v2p-frame]")!;
    for (const name of ["settings", "composer", "ask"])
      expect(frame.contains(q(name))).toBe(true);
  });

  it("switching phone -> desktop with the composer open never remounts a host", () => {
    render("phone");
    act(() => useNeedt3Ui.getState().setComposerOpen(true));
    const composer = host.querySelector('[data-host="composer"]');
    const nodes = ["settings", "ask", "paywall"].map((n) => q(n));
    expect(composer?.getAttribute("data-open")).toBe("true");

    render("desktop");
    expect(host.querySelector('[data-host="composer"]')).toBe(composer);
    expect(composer?.getAttribute("data-open")).toBe("true");
    ["settings", "ask", "paywall"].forEach((n, i) =>
      expect(q(n)).toBe(nodes[i])
    );

    render("phone");
    expect(host.querySelector('[data-host="composer"]')).toBe(composer);

    for (const name of ["settings", "composer", "ask", "paywall"]) {
      expect(G.__hostLog!.mounts[name]).toBe(1);
      expect(G.__hostLog!.unmounts[name] ?? 0).toBe(0);
    }
    // while the UI-dependent layers did swap
    expect(G.__hostLog!.unmounts["phone-shell"]).toBe(1);
  });
});
