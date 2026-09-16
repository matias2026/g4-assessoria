import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { RoleNav } from "@/components/auth/RoleNav";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { ToggleActiveButton } from "./ToggleActiveButton";
import { RequestActions } from "./RequestActions";
import { requireAdmin } from "./actions";
import { calculateAge } from "@/lib/workout-metrics";

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
  // Defesa em profundidade: o proxy (src/proxy.ts) já barra quem não é
  // admin antes de chegar aqui, mas essa página busca com a service role
  // (ignora RLS) — não pode depender só do middleware pra não virar um
  // dump de todos os perfis se o matcher algum dia mudar.
  const { organizationId } = await requireAdmin();

  const admin = createAdminClient();

  const { data: organization } = await admin.from("organizations").select("name, slug").eq("id", organizationId).single();

  // organization_id no filtro é o que garante que esse painel só mostra
  // contas/pedidos da própria assessoria — sem isso, virava um dump de
  // todas as organizações da plataforma pra qualquer admin.
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, full_name, active, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const list = profiles ?? [];
  const athleteCount = list.filter((p) => p.role === "athlete").length;

  const { data: pendingRequests } = await admin
    .from("access_requests")
    .select("id, full_name, email, phone, role_requested, message, created_at, birth_date, modalidade, training_experience")
    .eq("status", "pending")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  const requests = pendingRequests ?? [];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-g4-ink">Painel administrador</h1>
          <p className="text-sm text-g4-muted">
            Aprove ou negue pedidos de acesso — é o único jeito de entrar no site.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>

      <RoleNav currentPath="/admin" />

      {organization && (
        <Card className="p-5">
          <p className="text-sm font-medium text-g4-ink">Link de cadastro da {organization.name}</p>
          <p className="mt-1 text-xs text-g4-muted">
            Compartilhe com alunos e treinadores — pedidos enviados por ele caem direto nesta assessoria.
          </p>
          <p className="mt-2 break-all rounded-xl border border-g4-border bg-g4-surface-alt px-3 py-2 text-sm text-g4-ink">
            {`/login?org=${organization.slug}`}
          </p>
        </Card>
      )}

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
          <p className="mt-2 text-sm text-status-missed">Limite atingido — o banco recusa novos alunos até liberar vaga.</p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-bold text-g4-ink">Pedidos de acesso pendentes ({requests.length})</h2>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-g4-muted">Nenhum pedido novo.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-col gap-4 rounded-xl border border-g4-border p-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-g4-ink">
                    {r.full_name} <span className="font-normal text-g4-muted">· {r.email}</span>
                  </p>
                  <p className="text-xs text-g4-muted">
                    {r.role_requested === "coach" ? "Quer entrar como treinador" : "Quer entrar como aluno"}
                    {r.phone ? ` · ${r.phone}` : ""}
                    {r.birth_date ? ` · ${calculateAge(r.birth_date)} anos` : ""}
                    {r.modalidade ? ` · ${r.modalidade}` : ""}
                    {r.training_experience === "iniciante" ? " · novato(a)" : ""}
                    {r.training_experience === "experiente" ? " · já tem experiência" : ""}
                  </p>
                  {r.message && <p className="mt-1 text-sm text-g4-ink">&ldquo;{r.message}&rdquo;</p>}
                </div>
                <RequestActions requestId={r.id} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Celular: cards empilhados — nunca tabela rolando na horizontal.
          Mesmo padrão usado em RosterTab.tsx pra lista de alunos. */}
      <div className="flex flex-col gap-4 sm:hidden">
        {list.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-g4-ink">{p.full_name || "—"}</p>
                <p className="text-xs text-g4-muted">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <Badge tone={p.active ? "lime" : "danger"}>{p.active ? "Ativa" : "Suspensa"}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4">
              <Badge tone="neutral">{roleLabel[p.role] ?? p.role}</Badge>
              <div className="flex items-center gap-4">
                <ToggleActiveButton profileId={p.id} active={p.active} />
                <DeleteAccountButton profileId={p.id} />
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && <p className="text-sm text-g4-muted">Nenhuma conta criada ainda.</p>}
      </div>

      {/* Desktop/tablet: tabela completa, cabe sem rolagem no espaço disponível. */}
      <Card className="hidden overflow-hidden p-0 sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-g4-surface-alt text-g4-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Papel</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Criado em</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-g4-border">
            {list.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3 text-g4-ink">{p.full_name || "—"}</td>
                <td className="px-5 py-3">
                  <Badge tone="neutral">{roleLabel[p.role] ?? p.role}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone={p.active ? "lime" : "danger"}>{p.active ? "Ativa" : "Suspensa"}</Badge>
                </td>
                <td className="px-5 py-3 text-g4-muted">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <ToggleActiveButton profileId={p.id} active={p.active} />
                    <DeleteAccountButton profileId={p.id} />
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-g4-muted">
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
