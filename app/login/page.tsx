"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "signup" && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      // ─────────────────────────────────────────────────────
      // TODO: Replace with your auth provider
      //
      // Supabase example:
      //   import { createClient } from '@supabase/supabase-js'
      //   const supabase = createClient(URL, ANON_KEY)
      //
      //   if (mode === "login") {
      //     const { error } = await supabase.auth.signInWithPassword({ email, password })
      //     if (error) throw error
      //   } else {
      //     const { error } = await supabase.auth.signUp({ email, password })
      //     if (error) throw error
      //   }
      //
      // NextAuth example:
      //   import { signIn } from "next-auth/react"
      //   await signIn("credentials", { email, password, redirect: false })
      //
      // ─────────────────────────────────────────────────────

      // Simulated delay for demo
      await new Promise((r) => setTimeout(r, 1000));

      if (mode === "signup") {
        setSuccess("Account created. Check your email to confirm, then log in.");
        setMode("login");
        setPassword("");
        setConfirm("");
      } else {
        // On successful login, redirect to screener
        // window.location.href = "/screener";
        setError("Auth not connected yet. Wire up Supabase or NextAuth to enable login.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 pt-14">
      {/* Background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 800px 400px at 50% 10%, rgba(59,130,246,0.08), transparent 60%)",
        }}
      />

      <div className="relative flex items-center justify-center px-5 py-20">
        <div className="w-full max-w-[400px]">

          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-xl border border-zinc-800 bg-zinc-950/70 flex items-center justify-center">
                <div
                  className="h-3.5 w-3.5 rounded-sm"
                  style={{ background: "linear-gradient(135deg, rgba(59,130,246,1), rgba(99,102,241,1))" }}
                />
              </div>
              <span className="text-sm font-semibold text-zinc-100">AlphaPanel</span>
            </Link>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {mode === "login"
                ? "Log in to access your watchlists and portfolio."
                : "Start screening 1,000+ stocks with Smart Score."}
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              {/* Confirm password (signup only) */}
              {mode === "signup" && (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
              )}

              {/* Error / Success */}
              {error && (
                <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2.5 text-xs text-red-300">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-3 py-2.5 text-xs text-emerald-300">
                  {success}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
              >
                {loading
                  ? "..."
                  : mode === "login"
                  ? "Log in"
                  : "Create account"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[11px] text-zinc-600">or</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            {/* Google button (placeholder — wire up with your auth provider) */}
            <button
              type="button"
              onClick={() => {
                // TODO: supabase.auth.signInWithOAuth({ provider: 'google' })
                // or: signIn("google")
                setError("Google sign-in not connected yet.");
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            {/* Toggle mode */}
            <div className="mt-5 text-center text-sm text-zinc-500">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setError(null); setSuccess(null); }}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Log in
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-[11px] text-zinc-600">
            By continuing, you agree that this is not financial advice
            and past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
}