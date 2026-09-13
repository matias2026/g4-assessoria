import { AdminPreviewSwitcher } from "@/components/athlete/AdminPreviewSwitcher";
import { AthleteHeader } from "@/components/athlete/AthleteHeader";
import { NoProfileCard } from "@/components/athlete/NoProfileCard";
import { ReportsPanel } from "@/components/athlete/ReportsPanel";
import { DEFAULT_COACH_NAME, DEFAULT_COACH_PHONE } from "@/lib/mock-data";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { getOwnProfile } from "@/app/(athlete)/dashboard/profile-actions";

export const dynamic = "force-dynamic";

export default async function AthleteReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;
  const { student, isPreview } = await getOwnProfile(preview);
  const talkToCoachLink = buildWhatsAppLink(DEFAULT_COACH_PHONE, `Oi ${DEFAULT_COACH_NAME}!`);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <AthleteHeader
        athleteName={student?.name ?? "Você"}
        talkToCoachLink={talkToCoachLink}
        currentPath="/dashboard/relatorio"
        previewDiscipline={isPreview ? student?.discipline : undefined}
      />

      {isPreview && student && (
        <AdminPreviewSwitcher basePath="/dashboard/relatorio" activeDiscipline={student.discipline} />
      )}

      {student ? (
        <ReportsPanel athleteReport={student.athleteReport} coachNotes={student.coachNotes} coachName={DEFAULT_COACH_NAME} />
      ) : (
        <NoProfileCard />
      )}
    </main>
  );
}
