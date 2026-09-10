import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/components/ui/LinkButton";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-6 pb-10 pt-16 text-center sm:pt-20">
      <Image
        src="/logo-g4-full.png"
        alt="G4 Assessoria Esportiva — Treine com propósito. Supere seus limites."
        width={1254}
        height={1254}
        priority
        className="h-auto w-[200px] rounded-2xl shadow-md sm:w-[240px]"
      />

      <p className="max-w-sm text-sm text-g4-muted">
        Ciclismo, corrida e academia: treinos prescritos e dados do Strava em um só lugar.
      </p>

      <div className="flex gap-3">
        <LinkButton href="/login" variant="primary">
          Entrar
        </LinkButton>
      </div>
      <p className="text-xs text-g4-muted">
        Ainda não tem conta?{" "}
        <Link href="/solicitar-acesso" className="font-medium text-g4-ink underline">
          Peça acesso
        </Link>
        . O treinador revisa antes de liberar o login.
      </p>
    </main>
  );
}
