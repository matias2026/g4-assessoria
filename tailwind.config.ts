import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Fundo grafite/preto fosco da identidade G4.
        g4: {
          bg: "#0a0b0d",
          surface: "#141619",
          "surface-alt": "#1c1f23",
          border: "#2a2d32",
          muted: "#8b9096",
        },
        // Verde neon/lima esportivo para ações, status e destaques.
        lime: {
          DEFAULT: "#c6ff1e",
          soft: "#e4ff8f",
          dim: "#8fb814",
        },
        status: {
          done: "#c6ff1e",
          pending: "#f5a623",
          missed: "#ff4d4f",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
