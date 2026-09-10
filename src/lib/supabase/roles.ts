import type { ProfileRole } from "./types";

// Admin cai no Cockpit por padrão (área operacional do dia a dia) — dali dá
// pra ir pro painel admin ou pra área do atleta pelo RoleNav.
export function homePathForRole(role: ProfileRole): string {
  if (role === "athlete") return "/dashboard";
  return "/cockpit";
}
