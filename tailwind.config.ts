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
        echo: {
          bg: "#070b12",
          surface: "#0c1322",
          border: "#182642",
          cyan: "#00e5ff",
          cyanGlow: "rgba(0, 229, 255, 0.35)",
          amber: "#ffb300",
          emerald: "#10b981",
          rose: "#f43f5e",
          purple: "#a855f7",
          text: "#e2e8f0",
          muted: "#64748b",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { opacity: "0.6", filter: "drop-shadow(0 0 8px rgba(0,229,255,0.4))" },
          "100%": { opacity: "1", filter: "drop-shadow(0 0 20px rgba(0,229,255,0.8))" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
