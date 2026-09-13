import { AdminPreviewSwitcher } from "@/components/athlete/AdminPreviewSwitcher";
import { AthleteHeader } from "@/components/athlete/AthleteHeader";
import { AthleteProfileForm } from "@/components/athlete/AthleteProfileForm";
import { NoProfileCard } from "@/components/athlete/NoProfileCard";
import { DEFAULT_COACH_NAME, DEFAULT_COACH_PHONE } from "@/lib/mock-data";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { getOwnProfile } from "@/app/(athlete)/dashboard/profile-actions";

// Mesmo motivo do /dashboard: nunca prender a ficha do aluno num render
// anterior.
export const dynamic = "force-dynamic";

export default async function AthleteFichaPage({
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
        currentPath="/dashboard/ficha"
        previewDiscipline={isPreview ? student?.discipline : undefined}
      />

      {isPreview && student && <AdminPreviewSwitcher basePath="/dashboard/ficha" activeDiscipline={student.discipline} />}

      {student ? <AthleteProfileForm student={student} /> : <NoProfileCard />}
    </main>
  );
}
