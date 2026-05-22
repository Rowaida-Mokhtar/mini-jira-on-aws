"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "@/lib/auth";
import { syncUserProfile } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const session = await signIn(email.trim(), password);
      await syncUserProfile(session);
      router.replace("/");
    } catch (nextError) {
      setError(readError(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-4 text-[#17202a]">
      <section className="w-full max-w-md rounded-md border border-[#d8dee7] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f80ed]">
          Mini-Jira
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
          Sign in
        </h1>

        {error ? (
          <div className="mt-4 rounded-md border border-[#f2c6b4] bg-[#fff4ef] p-3 text-sm text-[#9a3412]">
            {error}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button
            className="h-11 w-full rounded-md bg-[#1f6feb] px-3 text-sm font-semibold text-white transition hover:bg-[#1a5fcc] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#697586]">
          Need an account?{" "}
          <Link className="font-semibold text-[#1f6feb]" href="/register">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : "Could not sign in.";
}
