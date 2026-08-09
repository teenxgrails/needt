const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    viewTransition: true,
  },

  // Expose the package version to the client so the UI can display it.
  // package.json stays the single source of truth for the version.
  env: {
    NEXT_PUBLIC_APP_VERSION: require("./package.json").version,
  },

  // Disable all development indicators
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],

  // Lint and type-check are enforced pre-commit (husky/lint-staged) and in CI
  // via `npm run lint` / `npm run type-check`. Running them again inside
  // `next build` roughly doubles peak build memory and OOM-kills the Next build
  // worker on memory-constrained deploy hosts (Coolify). Skip them here so the
  // production image build only compiles.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Standalone output is for Docker only. On Vercel it breaks the build
  // (missing route_client-reference-manifest.js for route-group API routes),
  // so skip it when building on Vercel.
  output: process.env.VERCEL ? undefined : "standalone",

  // Needt has one unified build with the standard Next.js extensions.
  pageExtensions: ["ts", "tsx", "js", "jsx"],

  // Keep runtime-oriented CommonJS packages outside route bundles. jsdom needs
  // its runtime assets, while googleapis pulls in a constant-time comparison
  // helper that patches Node's SlowBuffer prototype and cannot run against
  // webpack's browser Buffer shim during route page-data collection.
  // Standalone output still traces these dependencies into the image.
  serverExternalPackages: [
    "isomorphic-dompurify",
    "jsdom",
    "googleapis",
    "gaxios",
    "bullmq",
    "ioredis",
  ],
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
