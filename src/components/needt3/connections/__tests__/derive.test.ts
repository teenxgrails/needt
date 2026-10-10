import type { CatalogEntry, IntegrationRow } from "@/lib/needt3/hooks/catalog";
import type { V3Connection } from "@/lib/needt3/hooks/connections";

import {
  type CnItem,
  aiToolsLocked,
  buildItems,
  categoriesOf,
  connectPlan,
  counts,
  disconnectKind,
  filterItems,
  pillOf,
  statusLine,
} from "../derive";

const entry = (
  slug: string,
  name: string,
  category: CatalogEntry["category"],
  extra: Partial<CatalogEntry> = {}
): CatalogEntry => ({
  slug,
  name,
  description: `${name} things`,
  category,
  native: false,
  configured: true,
  ...extra,
});

const catalog: CatalogEntry[] = [
  entry("google-calendar", "Google Calendar", "calendar", { native: true }),
  entry("icloud-calendar", "Apple / iCloud", "calendar", { native: true }),
  entry("needt-api", "Needt API", "developer", { native: true }),
  entry("notion", "Notion", "notes"),
  entry("linear", "Linear", "tasks"),
];
const acct = (over: Partial<V3Connection>): V3Connection => ({
  provider: "google",
  kind: "calendar",
  state: "connected",
  label: "me@example.com",
  detail: null,
  accountId: "a1",
  ...over,
});
const rows: IntegrationRow[] = [
  { id: "i1", toolkit: "NOTION", status: "CONNECTED" },
  { id: "i2", toolkit: "linear", status: "ERROR" },
  { id: "i3", toolkit: "slack", status: "DISCONNECTED" },
];

describe("buildItems", () => {
  const items = buildItems(catalog, rows, [
    acct({}),
    acct({
      provider: "google",
      kind: "mail",
      label: "me@gmail.com",
      accountId: "m1",
      state: "error",
      detail: "Needs reconnecting",
    }),
  ]);
  const by = (slug: string) => items.find((i) => i.slug === slug) as CnItem;

  it("a native calendar is connected when an account of its provider exists", () => {
    expect(by("google-calendar")).toMatchObject({
      state: "connected",
      account: "me@example.com",
      accountId: "a1",
      kind: "calendar",
    });
    expect(by("icloud-calendar").state).toBe("none");
  });
  it("adds the mailboxes and reads their health", () => {
    expect(by("gmail")).toMatchObject({
      kind: "mail",
      state: "disconnected",
      accountId: "m1",
      detail: "Needs reconnecting",
    });
    expect(by("outlook-mail").state).toBe("none");
  });
  it("a toolkit matches its integration row ignoring case, and ERROR needs attention", () => {
    expect(by("notion")).toMatchObject({ state: "connected", accountId: "i1" });
    expect(by("linear")).toMatchObject({
      state: "disconnected",
      accountId: "i2",
    });
  });
  it("a DISCONNECTED row is not a connection", () => {
    expect(
      buildItems([entry("slack", "Slack", "communication")], rows, [])[0].state
    ).toBe("none");
  });
});

describe("filterItems / counts", () => {
  const items = buildItems(catalog, rows, [acct({})]);
  it("Connected hides what is not connected", () => {
    const slugs = filterItems(items, {
      q: "",
      chip: "all",
      show: "connected",
    }).map((i) => i.slug);
    expect(slugs).toEqual(
      expect.arrayContaining(["google-calendar", "notion", "linear"])
    );
    expect(slugs).not.toContain("needt-api");
  });
  it("a chip keeps one category; search matches name and description", () => {
    expect(
      filterItems(items, { q: "", chip: "notes", show: "all" }).map(
        (i) => i.slug
      )
    ).toEqual(["notion"]);
    expect(
      filterItems(items, { q: "linear", chip: "all", show: "all" })
    ).toHaveLength(1);
    expect(
      filterItems(items, { q: "  CALENDAR ", chip: "all", show: "all" }).length
    ).toBeGreaterThan(0);
    expect(filterItems(items, { q: "zzz", chip: "all", show: "all" })).toEqual(
      []
    );
  });
  it("categories once, in order; counts and status line", () => {
    expect(categoriesOf(items)).toEqual([
      "calendar",
      "developer",
      "notes",
      "tasks",
      "communication",
    ]);
    const c = counts(items);
    expect(c).toEqual({ connected: 2, issues: 1 });
    expect(statusLine(c)).toBe("2 connected · 1 needs attention");
    expect(statusLine({ connected: 0, issues: 2 })).toBe(
      "0 connected · 2 need attention"
    );
    expect(statusLine({ connected: 3, issues: 0 })).toBe("3 connected");
  });
});

describe("connectPlan", () => {
  it("Google connect starts the real calendar OAuth", () => {
    expect(
      connectPlan({ slug: "google-calendar", configured: true, native: true })
    ).toEqual({ kind: "navigate", href: "/api/calendar/google/auth" });
    expect(
      connectPlan({ slug: "gmail", configured: true, native: true })
    ).toEqual({ kind: "navigate", href: "/api/mail/oauth/google/auth" });
  });
  it("Apple takes a CalDAV login, a toolkit goes through Composio", () => {
    expect(
      connectPlan({ slug: "icloud-calendar", configured: true, native: true })
    ).toEqual({ kind: "caldav" });
    expect(
      connectPlan({ slug: "notion", configured: true, native: false })
    ).toEqual({ kind: "toolkit", toolkit: "notion" });
  });
  it("is unavailable when the server cannot, and for the API card", () => {
    expect(
      connectPlan({ slug: "notion", configured: false, native: false }).kind
    ).toBe("unavailable");
    expect(
      connectPlan({ slug: "needt-api", configured: true, native: true }).kind
    ).toBe("unavailable");
  });
  it("disconnect route by kind, pill, AI gate", () => {
    expect(disconnectKind({ kind: "calendar" })).toBe("calendar");
    expect(disconnectKind({ kind: "mail" })).toBe("mailbox");
    expect(disconnectKind({ kind: "app" })).toBe("toolkit");
    expect(pillOf("connected", false).label).toBe("Connected");
    expect(pillOf("none", true).label).toBe("Connecting…");
    expect(pillOf("disconnected", false).tone).toBe("danger");
    expect(aiToolsLocked("free")).toBe(true);
    expect(aiToolsLocked(undefined)).toBe(true);
    expect(aiToolsLocked("trial")).toBe(false);
  });
});
