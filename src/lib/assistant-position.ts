export const ASSISTANT_POSITION_KEY = "needt-ai-companion-position-v1";
export const ASSISTANT_POSITION_RESET_EVENT =
  "needt:assistant-position-reset";

export type Point = {
  x: number;
  y: number;
};

export type PositionBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type NormalizedAssistantPosition = {
  x: number;
  y: number;
};

export function clampPoint(point: Point, bounds: PositionBounds): Point {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, point.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, point.y)),
  };
}

export function companionBounds({
  viewportWidth,
  viewportHeight,
  size,
  sidebarWidth,
  mobileDockHeight,
  safeTop = 0,
  safeBottom = 0,
}: {
  viewportWidth: number;
  viewportHeight: number;
  size: number;
  sidebarWidth: number;
  mobileDockHeight: number;
  safeTop?: number;
  safeBottom?: number;
}): PositionBounds {
  const desktop = viewportWidth >= 1024;
  const edge = desktop ? 20 : 12;
  const minX = desktop ? sidebarWidth + edge : edge;
  const maxX = Math.max(minX, viewportWidth - size - edge);
  const minY = safeTop + edge;
  const bottomClearance = desktop
    ? edge
    : mobileDockHeight + safeBottom + edge;

  return {
    minX,
    maxX,
    minY,
    maxY: Math.max(minY, viewportHeight - size - bottomClearance),
  };
}

export function toNormalized(
  point: Point,
  bounds: PositionBounds
): NormalizedAssistantPosition {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const clamped = clampPoint(point, bounds);
  return {
    x: (clamped.x - bounds.minX) / width,
    y: (clamped.y - bounds.minY) / height,
  };
}

export function fromNormalized(
  position: NormalizedAssistantPosition,
  bounds: PositionBounds
): Point {
  return clampPoint(
    {
      x:
        bounds.minX +
        Math.min(1, Math.max(0, position.x)) *
          (bounds.maxX - bounds.minX),
      y:
        bounds.minY +
        Math.min(1, Math.max(0, position.y)) *
          (bounds.maxY - bounds.minY),
    },
    bounds
  );
}

export function isNormalizedAssistantPosition(
  value: unknown
): value is NormalizedAssistantPosition {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<NormalizedAssistantPosition>;
  return (
    typeof candidate.x === "number" &&
    Number.isFinite(candidate.x) &&
    candidate.x >= 0 &&
    candidate.x <= 1 &&
    typeof candidate.y === "number" &&
    Number.isFinite(candidate.y) &&
    candidate.y >= 0 &&
    candidate.y <= 1
  );
}
