import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        panel: "var(--panel)",
        muted: "var(--muted)",
        border: "var(--border)",
        accent: "var(--accent)",
        signal: "#c2410c"
      }
    }
  },
  plugins: []
};

export default config;
