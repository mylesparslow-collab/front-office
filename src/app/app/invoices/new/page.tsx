import { loadWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/ui";
import { NewInvoiceForm } from "./form";

export const metadata = { title: "New invoice" };

export default async function NewInvoice() {
  const ws = await loadWorkspace();
  return (
    <div className="rise mx-auto max-w-2xl">
      <PageHeader title="New invoice" sub="Front Office follows up until it's paid." />
      <NewInvoiceForm contacts={ws.contacts} />
    </div>
  );
}
