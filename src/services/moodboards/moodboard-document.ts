import { Yjs as Y } from "@/lib/collaboration/yjs";

export type MoodboardScene = {
  elements: Array<Record<string, unknown>>;
  appState: Record<string, unknown>;
  files: Record<string, Record<string, unknown>>;
};

export const EMPTY_MOODBOARD_SCENE: MoodboardScene = {
  elements: [],
  appState: { viewBackgroundColor: "#ffffff" },
  files: {},
};

function parseObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function childMap(root: Y.Map<unknown>, name: string) {
  const existing = root.get(name);
  if (existing instanceof Y.Map) return existing as Y.Map<unknown>;
  const created = new Y.Map<unknown>();
  root.set(name, created);
  return created;
}

function existingChildMap(root: Y.Map<unknown>, name: string) {
  const existing = root.get(name);
  return existing instanceof Y.Map ? (existing as Y.Map<unknown>) : null;
}

function compactAppState(appState: Record<string, unknown>) {
  return {
    viewBackgroundColor:
      typeof appState.viewBackgroundColor === "string"
        ? appState.viewBackgroundColor
        : "#ffffff",
    gridSize: typeof appState.gridSize === "number" ? appState.gridSize : null,
  };
}

export function readMoodboardScene(document: Y.Doc): MoodboardScene {
  const root = document.getMap<unknown>("moodboard");
  const elements = existingChildMap(root, "elements");
  const files = existingChildMap(root, "files");
  const storedAppState = parseObject(root.get("appState"));
  return {
    elements: Array.from(elements?.values() ?? [])
      .map(parseObject)
      .filter((value): value is Record<string, unknown> => value !== null)
      .sort((left, right) =>
        String(left.index ?? left.id ?? "").localeCompare(
          String(right.index ?? right.id ?? "")
        )
      ),
    appState: compactAppState(storedAppState ?? {}),
    files: Object.fromEntries(
      Array.from(files?.entries() ?? []).flatMap(([id, value]) => {
        const file = parseObject(value);
        return file ? [[id, file]] : [];
      })
    ),
  };
}

export function writeMoodboardScene(
  document: Y.Doc,
  scene: MoodboardScene,
  origin?: unknown,
  includeAppState = true
) {
  const root = document.getMap<unknown>("moodboard");
  const elements = childMap(root, "elements");
  const files = childMap(root, "files");
  const normalizedAppState = JSON.stringify(compactAppState(scene.appState));
  let changed = false;
  document.transact(() => {
    if (includeAppState && root.get("appState") !== normalizedAppState) {
      root.set("appState", normalizedAppState);
      changed = true;
    }
    for (const element of scene.elements) {
      if (typeof element.id !== "string") continue;
      const serialized = JSON.stringify(element);
      if (elements.get(element.id) !== serialized) {
        elements.set(element.id, serialized);
        changed = true;
      }
    }
    for (const [id, file] of Object.entries(scene.files)) {
      const serialized = JSON.stringify(file);
      if (files.get(id) !== serialized) {
        files.set(id, serialized);
        changed = true;
      }
    }
  }, origin);
  return changed;
}

export function writeMoodboardSceneChanges(
  document: Y.Doc,
  previous: MoodboardScene,
  next: MoodboardScene,
  origin?: unknown
) {
  const previousElements = new Map(
    previous.elements.flatMap((element) =>
      typeof element.id === "string"
        ? [[element.id, JSON.stringify(element)] as const]
        : []
    )
  );
  const changedElements = next.elements.filter(
    (element) =>
      typeof element.id === "string" &&
      previousElements.get(element.id) !== JSON.stringify(element)
  );
  const changedFiles = Object.fromEntries(
    Object.entries(next.files).filter(
      ([id, file]) =>
        JSON.stringify(previous.files[id]) !== JSON.stringify(file)
    )
  );
  const appStateChanged =
    JSON.stringify(compactAppState(previous.appState)) !==
    JSON.stringify(compactAppState(next.appState));

  if (
    changedElements.length === 0 &&
    Object.keys(changedFiles).length === 0 &&
    !appStateChanged
  )
    return false;

  return writeMoodboardScene(
    document,
    {
      elements: changedElements,
      appState: next.appState,
      files: changedFiles,
    },
    origin,
    appStateChanged
  );
}

export function replaceMoodboardScene(
  document: Y.Doc,
  scene: MoodboardScene,
  origin?: unknown
) {
  const root = document.getMap<unknown>("moodboard");
  const elements = childMap(root, "elements");
  const files = childMap(root, "files");
  document.transact(() => {
    elements.clear();
    files.clear();
    root.set("appState", JSON.stringify(compactAppState(scene.appState)));
    for (const element of scene.elements) {
      if (typeof element.id === "string") {
        elements.set(element.id, JSON.stringify(element));
      }
    }
    for (const [id, file] of Object.entries(scene.files)) {
      files.set(id, JSON.stringify(file));
    }
  }, origin);
}
