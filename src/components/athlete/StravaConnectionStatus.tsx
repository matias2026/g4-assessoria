import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";

interface StravaConnectionStatusProps {
  connected: boolean;
}

export function StravaConnectionStatus({ connected }: StravaConnectionStatusProps) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white">Strava</p>
        <Badge tone={connected ? "lime" : "neutral"} className="mt-1">
          {connected ? "Conectado" : "Não conectado"}
        </Badge>
      </div>

      {!connected && (
        <LinkButton href="/api/strava/connect" variant="secondary" className="px-4">
          Conectar
        </LinkButton>
      )}
    </Card>
  );
}
