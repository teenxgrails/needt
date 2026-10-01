/**
 * Deliberately empty.
 *
 * The repository root carries a postcss.config.mjs that loads Tailwind 3 for
 * the Next.js application. PostCSS resolves its config by walking up the tree,
 * so without this file the root config applies here too — and this folder runs
 * Tailwind 4 through @tailwindcss/vite, which needs no PostCSS plugin at all.
 * The result was `@layer base is used but no matching @tailwind base directive`
 * on every build.
 *
 * @type {import('postcss-load-config').Config}
 */
export default { plugins: {} }
