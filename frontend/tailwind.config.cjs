module.exports = {
  content: [
    // Vite dev server root
    "./index.html",
    // Source files (React)
    "./src/**/*.{js,jsx,ts,tsx,mdx}",
    // Optional: components or packages
    "./node_modules/@shadcn/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class", // enable dark mode via .dark
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
      },
      boxShadow: {
        card: "0 6px 18px rgba(15, 23, 42, 0.08)",
        "card-focus": "0 8px 30px rgba(14, 165, 233, 0.12)",
      },
      spacing: {
        72: "18rem",
        84: "21rem",
        96: "24rem",
      },
      borderRadius: {
        "lg-2": "14px",
      },
    },
  },
  variants: {
    extend: {
      opacity: ["disabled"],
      cursor: ["disabled"],
    },
  },
  plugins: [
    // Forms plugin gives nice default styling for form elements (compatible with shadcn UI)
    require("@tailwindcss/forms"),
    // Optionally add typography, aspect-ratio, etc. if you need them:
    // require('@tailwindcss/typography'),
    // require('@tailwindcss/aspect-ratio'),
  ],
  safelist: [
    // useful for dynamic class names that JIT might miss
    "bg-brand-500",
    "text-brand-500",
    "shadow-card",
    "shadow-card-focus",
    "rounded-lg-2",
  ],
};
