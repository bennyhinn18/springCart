/**
 * PostCSS configuration for the SpringCart frontend (Vite + Tailwind).
 *
 * This config enables:
 *  - postcss-import: allow using @import in CSS files
 *  - tailwindcss: process Tailwind directives and utilities (Tailwind v3+)
 *  - autoprefixer: add vendor prefixes for broader browser support
 *
 * Make sure the following devDependencies are installed:
 *  - postcss
 *  - tailwindcss (v3.x)
 *  - autoprefixer
 *  - postcss-import (optional but useful)
 *
 * Usage: Vite will pick this up automatically when running `npm run dev` or building.
 */

module.exports = {
  plugins: {
    "postcss-import": {},
    tailwindcss: {},
    autoprefixer: {},
  },
};
