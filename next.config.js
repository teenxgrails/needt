/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // Determine which file extensions to use based on SAAS enablement
  pageExtensions: (() => {
    const isSaasEnabled =
      process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true";

    // Base extensions
    const baseExtensions = ["js", "jsx", "ts", "tsx"];

    if (isSaasEnabled) {
      // For SAAS version, include .saas. files and exclude .open. files
      return [
        ...baseExtensions.map((ext) => ext),
        ...baseExtensions.map((ext) => `saas.${ext}`),
      ].filter((ext) => !ext.includes(".open."));
    } else {
      // For open source version, include .open. files and exclude .saas. files
      return [
        ...baseExtensions.map((ext) => ext),
        ...baseExtensions.map((ext) => `open.${ext}`),
      ].filter((ext) => !ext.includes(".saas."));
    }
  })(),
};

module.exports = nextConfig;
