"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <div className="rounded-card bg-keep-soft p-5" role="status">
        <p className="text-lg font-bold">Check your inbox.</p>
        <p className="mt-1">
          If <strong>{state.email}</strong> has access, a sign-in link is on its way. It works once,
          on this device.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <label htmlFor="email" className="font-bold">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
        aria-invalid={state.status === "error" || undefined}
        aria-describedby={state.status === "error" ? "email-error" : undefined}
        className="min-h-12 rounded-control border border-line bg-surface px-4 text-base"
      />
      {state.status === "error" && (
        <p id="email-error" className="text-warn">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-control bg-accent px-5 font-bold text-accent-ink disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
