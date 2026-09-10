import type { ProfileRole } from "./types";

export function homePathForRole(role: ProfileRole): string {
  if (role === "admin") return "/admin";
  if (role === "coach") return "/cockpit";
  return "/dashboard";
}
