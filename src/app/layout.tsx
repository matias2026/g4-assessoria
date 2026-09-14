import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const SITE_URL = "https://g4-assessoria.vercel.app";
const SITE_NAME = "G4 Assessoria Esportiva";
const SITE_DESCRIPTION = "Plataforma de acompanhamento de treinos para ciclismo, corrida e academia.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Aplica o tema salvo (ou a preferência do sistema, na primeira visita)
// antes da primeira pintura da página — sem isso, o app sempre renderiza
// claro primeiro e só troca pro escuro depois que o React hidrata,
// causando um flash visível. Roda como script inline (não em
// ThemeToggle.tsx) justamente pra executar antes de qualquer CSS/JS da
// aplicação. A tela de login é a única exceção: fica sempre escura por
// escolha de design, então nem lê o tema salvo (ver src/app/login/page.tsx).
const THEME_INIT_SCRIPT = `
try {
  var saved = localStorage.getItem("g4-theme");
  var isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (isDark) document.documentElement.setAttribute("data-theme", "dark");
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
