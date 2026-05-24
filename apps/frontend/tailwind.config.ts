import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        background: "#f7f8f5",
        foreground: "#161816",
        panel: "#ffffff",
        muted: "#5d655f",
        border: "#d9ded8",
        accent: "#0f766e",
        signal: "#c2410c"
      }
    }
  },
  plugins: []
};

export default config;
