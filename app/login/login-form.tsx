"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <div role="status">
        <p className="t-lead">Check your inbox.</p>
        <p className="mt-(--s-2)">
          If <strong>{state.email}</strong> has access, a sign-in link is on its way. It works once,
          on this device.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-(--s-2)" noValidate>
      <label htmlFor="email" className="t-label">
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
        className="field"
      />
      {state.status === "error" && <p id="email-error">{state.message}</p>}
      <button type="submit" disabled={pending} className="btn mt-(--s-3) self-start">
        {pending ? "Sending…" : "Email me a sign-in link →"}
      </button>
    </form>
  );
}
