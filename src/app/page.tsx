import Image from "next/image";
import { LinkButton } from "@/components/ui/LinkButton";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Image
        src="/logo-g4-full.png"
        alt="G4 Assessoria Esportiva — Treine com propósito. Supere seus limites."
        width={1254}
        height={1254}
        priority
        className="h-52 w-52 rounded-3xl shadow-lg sm:h-60 sm:w-60"
      />

      <p className="max-w-sm text-sm text-g4-muted">
        Ciclismo, corrida e academia: treinos prescritos e dados do Strava em um só lugar.
      </p>

      <div className="flex gap-3">
        <LinkButton href="/dashboard" variant="primary">
          Área do atleta
        </LinkButton>
        <LinkButton href="/cockpit" variant="secondary">
          Cockpit do treinador
        </LinkButton>
      </div>
    </main>
  );
}
