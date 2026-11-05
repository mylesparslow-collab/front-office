"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next ?? "/app"} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" className="field" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" className="field" required />
      </div>
      {state?.error && <p className="text-[13px] font-medium text-red">{state.error}</p>}
      <button className="btn btn-dark w-full" disabled={pending}>
        Sign in
      </button>
    </form>
  );
}
