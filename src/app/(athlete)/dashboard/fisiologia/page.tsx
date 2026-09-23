import { AdminPreviewSwitcher } from "@/components/athlete/AdminPreviewSwitcher";
import { AthleteHeader } from "@/components/athlete/AthleteHeader";
import { NoProfileCard } from "@/components/athlete/NoProfileCard";
import { PhysiologyHistoryView } from "@/components/athlete/PhysiologyHistoryView";
import { Card } from "@/components/ui/Card";
import { DEFAULT_COACH_NAME, DEFAULT_COACH_PHONE } from "@/lib/mock-data";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { getOwnProfile } from "@/app/(athlete)/dashboard/profile-actions";
import { listOwnPhysiologyAssessments } from "@/app/(athlete)/dashboard/physiology-actions";

export const dynamic = "force-dynamic";

export default async function AthletePhysiologyPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;
  const { student, isPreview } = await getOwnProfile(preview);
  const talkToCoachLink = buildWhatsAppLink(DEFAULT_COACH_PHONE, `Oi ${DEFAULT_COACH_NAME}!`);

  // Prévia do admin (student de exemplo, sem ficha real em `alunos`) nunca
  // tem avaliação de verdade pra buscar — mesma ressalva de resolveWorkout
  // em dashboard/page.tsx.
  const assessments = student && !isPreview ? await listOwnPhysiologyAssessments() : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <AthleteHeader
        athleteName={student?.name ?? "Você"}
        talkToCoachLink={talkToCoachLink}
        currentPath="/dashboard/fisiologia"
        previewDiscipline={isPreview ? student?.discipline : undefined}
      />

      {isPreview && student && <AdminPreviewSwitcher basePath="/dashboard/fisiologia" activeDiscipline={student.discipline} />}

      {!student ? (
        <NoProfileCard />
      ) : assessments.length === 0 ? (
        <Card>
          <p className="text-sm text-g4-muted">
            Nenhuma avaliação fisiológica publicada pelo seu treinador ainda.
          </p>
        </Card>
      ) : (
        <PhysiologyHistoryView assessments={assessments} />
      )}
    </main>
  );
}
