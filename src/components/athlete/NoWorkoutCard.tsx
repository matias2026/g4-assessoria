import { Card, CardTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/LinkButton";

interface NoWorkoutCardProps {
  talkToCoachLink: string;
  coachName: string;
}

/**
 * Estado de "sem treino de hoje" na Home do aluno — aparece quando ele tem
 * ficha real mas o treinador ainda não enviou (`sendPrescription`) nenhum
 * treino pra data de hoje. Antes disso, a tela caía num treino de exemplo
 * genérico igual ao de verdade, dando a entender que ele já tinha recebido
 * uma prescrição que na verdade não existe.
 */
export function NoWorkoutCard({ talkToCoachLink, coachName }: NoWorkoutCardProps) {
  return (
    <Card>
      <CardTitle>Nenhum treino para hoje</CardTitle>
      <p className="mt-2 text-sm text-g4-muted">
        Novos treinos aparecerão aqui assim que {coachName} enviar sua prescrição.
      </p>
      <LinkButton href={talkToCoachLink} target="_blank" rel="noreferrer" variant="ghost" className="mt-3">
        💬 Falar com {coachName} no WhatsApp
      </LinkButton>
    </Card>
  );
}
