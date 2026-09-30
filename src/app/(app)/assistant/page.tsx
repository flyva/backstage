import { requireUser } from "@/lib/auth";
import { SUGGESTIONS } from "@/lib/assistant";
import { AssistantChat } from "@/components/AssistantChat";

export const metadata = { title: "Assistant" };

export default async function AssistantPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Assistant</h1>
        <p className="text-sm text-muted">Un assistant sans intelligence artificielle : il retrouve la réponse dans la FAQ, le wiki, l&apos;annuaire, les liens, les actus, le matériel, et dans tes propres données (cours, tâches, prêts).</p>
      </header>
      <AssistantChat suggestions={SUGGESTIONS} />
    </div>
  );
}
