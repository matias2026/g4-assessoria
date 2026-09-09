import { LinkButton } from "@/components/ui/LinkButton";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-lime">G4</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Assessoria Esportiva</h1>
        <p className="mt-2 max-w-sm text-sm text-g4-muted">
          Ciclismo, corrida e academia: treinos prescritos e dados do Strava em um só lugar.
        </p>
      </div>

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
