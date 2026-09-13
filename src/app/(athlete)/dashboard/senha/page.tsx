import { AdminPreviewSwitcher } from "@/components/athlete/AdminPreviewSwitcher";
import { AthleteHeader } from "@/components/athlete/AthleteHeader";
import { ChangePasswordForm } from "@/components/athlete/ChangePasswordForm";
import { NoProfileCard } from "@/components/athlete/NoProfileCard";
import { DEFAULT_COACH_NAME, DEFAULT_COACH_PHONE } from "@/lib/mock-data";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { getOwnProfile } from "@/app/(athlete)/dashboard/profile-actions";

export const dynamic = "force-dynamic";

export default async function AthletePasswordPage({
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
        currentPath="/dashboard/senha"
        previewDiscipline={isPreview ? student?.discipline : undefined}
      />

      {isPreview && student && <AdminPreviewSwitcher basePath="/dashboard/senha" activeDiscipline={student.discipline} />}

      {/* Trocar a senha não depende de qual modalidade está sendo pré-visualizada
          — o formulário aparece mesmo em prévia, mas salvar de verdade exige
          uma conta de aluno real (mesma trava de todo autoatendimento). */}
      {student ? <ChangePasswordForm /> : <NoProfileCard />}
    </main>
  );
}
