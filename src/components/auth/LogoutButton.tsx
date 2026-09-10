import { Button } from "@/components/ui/Button";
import { signOutAction } from "@/lib/supabase/auth-actions";

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" className="px-3 text-sm">
        Sair
      </Button>
    </form>
  );
}
