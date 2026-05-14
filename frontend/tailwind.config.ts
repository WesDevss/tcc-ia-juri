import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jud: {
          ink: "#0f172a",
          paper: "#f8fafc",
          gold: "#b45309",
          muted: "#64748b",
          accent: "#1e3a5f",
        },
      },
      fontFamily: {
        sans: ["var(--font-app)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 6px -1px rgb(15 23 42 / 0.06), 0 12px 24px -6px rgb(15 23 42 / 0.08)",
        "card-lg":
          "0 8px 10px -4px rgb(15 23 42 / 0.06), 0 20px 40px -12px rgb(15 23 42 / 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
