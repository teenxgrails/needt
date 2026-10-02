export interface VisualBaselineUpdateEnvironment {
  ci: string | undefined;
  platform: NodeJS.Platform;
}

export function assertVisualBaselineUpdateEnvironment({
  ci,
  platform,
}: VisualBaselineUpdateEnvironment): void {
  if (ci === "true" && platform === "linux") {
    return;
  }

  throw new Error(
    `Visual baseline updates are CI-authoritative and may run only with CI === "true" on Linux (received CI=${JSON.stringify(ci)}, platform=${platform}). Use the manual GitHub Actions baseline workflow instead.`
  );
}
