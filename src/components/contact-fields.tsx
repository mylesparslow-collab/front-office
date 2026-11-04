"use client";

import { useState } from "react";
import type { Contact } from "@/lib/types";

/** Pick an existing customer or type a new one. Posts contact_id or contact_name/email/phone. */
export function ContactFields({ contacts, defaultId }: { contacts: Contact[]; defaultId?: string }) {
  const [mode, setMode] = useState<"existing" | "new">(contacts.length ? "existing" : "new");
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label mb-0">Customer</span>
        {contacts.length > 0 && (
          <button type="button" className="text-[12px] font-semibold text-red hover:underline" onClick={() => setMode(mode === "existing" ? "new" : "existing")}>
            {mode === "existing" ? "+ New customer" : "Pick existing"}
          </button>
        )}
      </div>
      {mode === "existing" ? (
        <select name="contact_id" className="field" defaultValue={defaultId}>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.company ? ` (${c.company})` : ""}
            </option>
          ))}
        </select>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          <input name="contact_name" className="field" placeholder="Full name" required />
          <input name="contact_email" type="email" className="field" placeholder="Email" />
          <input name="contact_phone" className="field" placeholder="Mobile" />
        </div>
      )}
    </div>
  );
}
