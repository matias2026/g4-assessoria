import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/supabase/types";

const LINKS = [
  { href: "/cockpit", label: "Cockpit" },
  { href: "/dashboard", label: "Área do atleta" },
  { href: "/admin", label: "Painel admin" },
];

// Admin tem acesso de verdade às três áreas (permitido no proxy e no RLS) —
// esse nav é só a porta visível pra alternar entre elas. Coach/atleta nunca
// veem isso: cada um só acessa a própria área.
export async function RoleNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = data as { role: ProfileRole } | null;
  if (profile?.role !== "admin") return null;

  return (
    <nav className="flex flex-wrap gap-1.5 rounded-xl bg-g4-surface-alt p-1 text-xs">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-lg px-2.5 py-1.5 font-medium text-g4-muted transition-colors hover:bg-white hover:text-g4-ink"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
