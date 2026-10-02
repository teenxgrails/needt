import {
  type ReactNode,
  createElement,
  createElement as mockCreateElement,
} from "react";

import { renderToStaticMarkup } from "react-dom/server";

import { SystemSettings } from "@/components/settings/SystemSettings";

jest.mock("@/components/auth/AdminOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) =>
    mockCreateElement("div", null, children),
}));

jest.mock("@/components/auth/AccessDeniedMessage", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/settings/SettingsSection", () => ({
  SettingRow: ({ children }: { children: ReactNode }) =>
    mockCreateElement("div", null, children),
  SettingsSection: ({ children }: { children: ReactNode }) =>
    mockCreateElement("section", null, children),
}));

jest.mock("@/components/ui/input", () => ({ Input: () => null }));
jest.mock("@/components/ui/label", () => ({ Label: () => null }));
jest.mock("@/components/ui/needt-picker", () => ({ NeedtPicker: () => null }));
jest.mock("@/lib/email/resend", () => ({ clearResendInstance: jest.fn() }));
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }));
jest.mock("@/store/settings", () => ({
  useSettingsStore: () => ({
    system: {},
    updateSystemSettings: jest.fn(),
  }),
}));

describe("SystemSettings server rendering", () => {
  it("does not read window while the client component is prerendered", () => {
    expect(() =>
      renderToStaticMarkup(createElement(SystemSettings))
    ).not.toThrow();
  });
});
