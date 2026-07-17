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

  // Standalone output is for Docker only. On Vercel it breaks the build
  // (missing route_client-reference-manifest.js for route-group API routes),
  // so skip it when building on Vercel.
  output: process.env.VERCEL ? undefined : "standalone",

  // Needt has one unified build with the standard Next.js extensions.
  pageExtensions: ["ts", "tsx", "js", "jsx"],
};

module.exports = nextConfig;
