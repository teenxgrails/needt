/**
 * Feature flag keys. Client-safe: no Prisma, no `crypto`. The evaluation
 * itself (`isFeatureEnabled`) is server-only and lives in `feature-flags.ts`.
 */
export const DESIGN_V3 = "design_v3";
