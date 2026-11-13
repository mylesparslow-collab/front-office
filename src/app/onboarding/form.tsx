"use client";

import { useActionState } from "react";
import { createWorkspace } from "@/app/actions";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(createWorkspace, null);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="name">Business name</label>
        <input id="name" name="name" className="field" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="industry">What you do</label>
          <input id="industry" name="industry" className="field" placeholder="e.g. Plumbing" />
        </div>
        <div>
          <label className="label" htmlFor="city">City</label>
          <input id="city" name="city" className="field" placeholder="e.g. Irvine, CA" />
        </div>
      </div>
      {state?.error && <p className="text-[13px] text-red">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>
        Open my front office
      </button>
    </form>
  );
}
