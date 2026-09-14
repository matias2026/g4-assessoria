import Image from "next/image";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f1115] px-6 py-12">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#161b22] p-6 shadow-2xl shadow-black/50 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo-g4-full.png"
            alt="G4 Assessoria Esportiva"
            width={1254}
            height={1254}
            priority
            className="h-20 w-20 rounded-2xl shadow-lg shadow-black/40 sm:h-24 sm:w-24"
          />
          <h1 className="mt-4 text-xl font-bold text-white">G4 Assessoria Esportiva</h1>
          <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-gray-400">
            Ciclismo, corrida e academia: treinos prescritos e dados do Strava em um só lugar.
          </p>
        </div>

        <LoginForm next={next ?? ""} />
      </div>
    </main>
  );
}
