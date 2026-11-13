"use client";

import { useActionState } from "react";
import { signUp } from "@/app/actions";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, null);
  if (state && "ok" in state && state.ok) return <p className="rounded-xl bg-sun-soft p-4 text-[14px] ring-1 ring-sun-line">{state.ok}</p>;
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" autoComplete="email" className="field" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" className="field" minLength={8} required />
      </div>
      {state && "error" in state && <p className="text-[13px] font-medium text-red">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>
        Create workspace
      </button>
    </form>
  );
}
