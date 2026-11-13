import { RotateCcw } from "lucide-react";
import { loadWorkspace } from "@/lib/workspace";
import { resetDemo } from "@/app/actions";
import { PageHeader, Pill } from "@/components/ui";
import { BusinessForm, CadenceEditor } from "./client";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const ws = await loadWorkspace();
  return (
    <div className="rise">
      <PageHeader title="Settings" sub="Your business details and the words Front Office uses when it follows up." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <CadenceEditor kind="invoice" initial={ws.cadences.invoice} />
          <CadenceEditor kind="quote" initial={ws.cadences.quote} />
          <CadenceEditor kind="lead" initial={ws.cadences.lead} />
        </div>
        <div className="space-y-6">
          <BusinessForm b={ws.business} />
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Delivery</h2>
              <Pill tone={ws.business.sending_enabled ? "ink" : "line"}>{ws.business.sending_enabled ? "On" : "Review mode"}</Pill>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Every follow-up waits for your approval and is logged on the customer&apos;s record. Email and text delivery connect to your own business email and number during setup, so replies come straight back to you.
            </p>
          </section>
          <section className="card p-5">
            <h2 className="text-[15px] font-semibold">Signed in</h2>
            <p className="mt-1 truncate text-[13px] text-muted">{ws.userEmail}</p>
            {ws.business.is_demo && (
              <form action={resetDemo} className="mt-4">
                <button className="btn btn-ghost btn-sm">
                  <RotateCcw size={13} /> Reset sample data
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
