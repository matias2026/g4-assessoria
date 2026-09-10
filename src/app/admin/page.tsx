import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { CreateAccountForm } from "./CreateAccountForm";

// Sempre busca dados frescos (lista de contas, contagem de atletas) — sem
// isso o Next poderia pré-renderizar a página estaticamente no build e
// deixar a lista de contas presa no que existia naquele momento.
export const dynamic = "force-dynamic";

const ATHLETE_CAP = 50;

const roleLabel: Record<string, string> = {
  coach: "Treinador",
  athlete: "Aluno",
  admin: "Administrador",
};

export default async function AdminPage() {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, full_name, created_at")
    .order("created_at", { ascending: false });

  const list = profiles ?? [];
  const athleteCount = list.filter((p) => p.role === "athlete").length;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-g4-ink">Painel administrador</h1>
          <p className="text-sm text-g4-muted">Criação de contas — não há cadastro público no site.</p>
        </div>
        <LogoutButton />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-g4-ink">Atletas cadastrados</p>
          <p className="text-sm text-g4-muted">
            {athleteCount} / {ATHLETE_CAP}
          </p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-g4-surface-alt">
          <div
            className="h-full rounded-full bg-lime"
            style={{ width: `${Math.min(100, (athleteCount / ATHLETE_CAP) * 100)}%` }}
          />
        </div>
        {athleteCount >= ATHLETE_CAP && (
          <p className="mt-2 text-sm text-red-600">Limite atingido — o banco recusa novos alunos até liberar vaga.</p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-bold text-g4-ink">Criar conta</h2>
        <CreateAccountForm />
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-g4-surface-alt text-g4-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Papel</th>
              <th className="px-5 py-3 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-g4-border">
            {list.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3 text-g4-ink">{p.full_name || "—"}</td>
                <td className="px-5 py-3">
                  <Badge tone="neutral">{roleLabel[p.role] ?? p.role}</Badge>
                </td>
                <td className="px-5 py-3 text-g4-muted">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-g4-muted">
                  Nenhuma conta criada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
