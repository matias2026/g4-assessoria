import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Painel claro estilo TrainingPeaks: fundo branco/cinza-claro,
        // texto em preto fosco. Nada de fundo escuro.
        g4: {
          bg: "#f4f5f7",
          surface: "#ffffff",
          "surface-alt": "#eef0f3",
          border: "#e2e5ea",
          muted: "#68707b",
          ink: "#14161a",
        },
        // Verde neon/lima esportivo, reservado para ações, status e barras
        // de progresso. `deep` é a variante com contraste suficiente para
        // texto/ícones sobre fundo claro.
        lime: {
          DEFAULT: "#c6ff1e",
          soft: "#e4ff8f",
          dim: "#8fb814",
          deep: "#3f6212",
        },
        status: {
          done: "#4d7c0f",
          pending: "#b45309",
          missed: "#b91c1c",
          "done-dot": "#84cc16",
          "pending-dot": "#f59e0b",
          "missed-dot": "#ef4444",
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
