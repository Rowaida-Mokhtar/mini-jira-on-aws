"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { syncUserProfile } from "@/lib/api";
import { confirmRegistration, registerUser, Role, signIn } from "@/lib/auth";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [teamId, setTeamId] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      await registerUser({
        email: email.trim(),
        password,
        role,
        teamId: teamId.trim() || undefined,
      });
      setIsConfirming(true);
      setMessage("Check your email for a Cognito confirmation code.");
    } catch (nextError) {
      setError(readError(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await confirmRegistration(email.trim(), confirmationCode.trim());
      const session = await signIn(email.trim(), password);
      await syncUserProfile(session);
      window.location.href = "/";
    } catch (nextError) {
      setError(readError(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-4 py-8 text-[#17202a]">
      <section className="w-full max-w-md rounded-md border border-[#d8dee7] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f80ed]">
          Mini-Jira
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
          {isConfirming ? "Confirm account" : "Create account"}
        </h1>

        {message ? (
          <div className="mt-4 rounded-md border border-[#bfdbfe] bg-[#eff6ff] p-3 text-sm text-[#1d4ed8]">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-md border border-[#f2c6b4] bg-[#fff4ef] p-3 text-sm text-[#9a3412]">
            {error}
          </div>
        ) : null}

        {isConfirming ? (
          <form className="mt-6 space-y-4" onSubmit={handleConfirm}>
            <label className="block text-sm font-medium text-[#344054]">
              Confirmation code
              <input
                className="mt-1 h-11 w-full rounded border border-[#cfd7e3] px-3 text-sm outline-none focus:border-[#2f80ed]"
                value={confirmationCode}
                required
                inputMode="numeric"
                onChange={(event) => setConfirmationCode(event.target.value)}
              />
            </label>
            <button
              className="h-11 w-full rounded-md bg-[#1f6feb] px-3 text-sm font-semibold text-white transition hover:bg-[#1a5fcc] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Confirming..." : "Confirm account"}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleRegister}>
            <label className="block text-sm font-medium text-[#344054]">
              Email
              <input
                className="mt-1 h-11 w-full rounded border border-[#cfd7e3] px-3 text-sm outline-none focus:border-[#2f80ed]"
                type="email"
                value={email}
                required
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-[#344054]">
              Password
              <input
                className="mt-1 h-11 w-full rounded border border-[#cfd7e3] px-3 text-sm outline-none focus:border-[#2f80ed]"
                type="password"
                value={password}
                required
                minLength={8}
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-[#344054]">
              Role
              <select
                className="mt-1 h-11 w-full rounded border border-[#cfd7e3] bg-white px-3 text-sm outline-none focus:border-[#2f80ed]"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-[#344054]">
              Team ID
              <input
                className="mt-1 h-11 w-full rounded border border-[#cfd7e3] px-3 text-sm outline-none focus:border-[#2f80ed]"
                value={teamId}
                placeholder={role === "EMPLOYEE" ? "Required for employees" : ""}
                required={role === "EMPLOYEE"}
                onChange={(event) => setTeamId(event.target.value)}
              />
            </label>
            <button
              className="h-11 w-full rounded-md bg-[#1f6feb] px-3 text-sm font-semibold text-white transition hover:bg-[#1a5fcc] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create account"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-[#697586]">
          Already registered?{" "}
          <Link className="font-semibold text-[#1f6feb]" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : "Could not register.";
}
