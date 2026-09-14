import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Cada tom aqui é uma custom property (ver globals.css) com um valor
        // claro em :root e um valor escuro em [data-theme="dark"] — trocar
        // o tema no ThemeToggle não muda nenhuma classe Tailwind, só o
        // atributo data-theme na <html>, então todo componente que já usa
        // esses tokens (bg-g4-bg, text-g4-ink etc.) fica escuro-compatível
        // de graça, sem precisar de variante dark: espalhada pelo código.
        g4: {
          bg: "var(--color-g4-bg)",
          surface: "var(--color-g4-surface)",
          "surface-alt": "var(--color-g4-surface-alt)",
          border: "var(--color-g4-border)",
          muted: "var(--color-g4-muted)",
          ink: "var(--color-g4-ink)",
        },
        // Verde neon/lima esportivo, reservado para ações, status e barras
        // de progresso. `deep` é a variante com contraste suficiente para
        // texto/ícones — no escuro fica mais clara pra continuar legível.
        lime: {
          DEFAULT: "#c6ff1e",
          soft: "#e4ff8f",
          dim: "#8fb814",
          deep: "var(--color-lime-deep)",
        },
        status: {
          done: "var(--color-status-done)",
          pending: "var(--color-status-pending)",
          missed: "var(--color-status-missed)",
          "done-dot": "#84cc16",
          "pending-dot": "#f59e0b",
          "missed-dot": "#ef4444",
        },
        // Texto sobre um fundo `bg-lime` sólido (abas ativas, botão
        // primário) — sempre escuro nos dois temas, porque o próprio lime
        // não muda de tom: usar text-g4-ink aqui ficaria ilegível no tema
        // escuro (texto quase branco em cima de verde limão).
        "ink-on-lime": "#14161a",
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
