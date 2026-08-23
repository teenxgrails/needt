export const GIT_BUILD_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function resolveBuildSha(
  env: Partial<NodeJS.ProcessEnv> = process.env
): string {
  return (
    env.NEEDT_BUILD_SHA ||
    env.VERCEL_GIT_COMMIT_SHA ||
    env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    "local"
  );
}

export function isGitBuildSha(value: string): boolean {
  return GIT_BUILD_SHA_PATTERN.test(value);
}

export function isBuildShaAllowed(
  buildSha: string,
  nodeEnv = process.env.NODE_ENV
): boolean {
  return nodeEnv !== "production" || isGitBuildSha(buildSha);
}

export function requireProductionBuildSha(
  buildSha = resolveBuildSha(),
  nodeEnv = process.env.NODE_ENV
): string {
  if (!isBuildShaAllowed(buildSha, nodeEnv)) {
    throw new Error(
      "NEEDT_BUILD_SHA must be a 40-character Git commit SHA in production"
    );
  }
  return buildSha;
}
