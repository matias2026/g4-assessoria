import { RequestAccessForm } from "./RequestAccessForm";

export default async function RequestAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <RequestAccessForm orgSlug={org} />
    </main>
  );
}
