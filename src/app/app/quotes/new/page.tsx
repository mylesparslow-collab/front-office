import { loadWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/ui";
import { QuoteBuilder } from "./builder";

export const metadata = { title: "New quote" };

export default async function NewQuote({ searchParams }: PageProps<"/app/quotes/new">) {
  const ws = await loadWorkspace();
  const leadId = (await searchParams).lead as string | undefined;
  const lead = leadId ? ws.leads.find((l) => l.id === leadId) : undefined;
  return (
    <div className="rise">
      <PageHeader title="New quote" sub={lead ? `For lead: ${lead.title}` : "Build it once. Front Office handles the follow-up."} />
      <QuoteBuilder contacts={ws.contacts} lead={lead ? { id: lead.id, title: lead.title, contact_id: lead.contact_id, value: lead.value } : undefined} />
    </div>
  );
}
