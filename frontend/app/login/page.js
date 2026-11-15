"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { loginUser } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginUser(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return <AuthShell eyebrow="Welcome back" title="Pick up where you left off." description="Sign in to see your calendar, tasks, and reminders in one place.">
    <form onSubmit={handleSubmit} className="auth-form">
      <label className="auth-field" htmlFor="email">Email<input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="auth-input" placeholder="you@example.com"/></label>
      <label className="auth-field" htmlFor="password">Password<input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" placeholder="Your password"/></label>
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button type="submit" disabled={loading} className="auth-submit">{loading ? "Signing in..." : "Sign in"}<span aria-hidden="true">↗</span></button>
      <p className="auth-alt">New to TimeMate? <Link href="/register">Create an account</Link></p>
    </form>
  </AuthShell>;
}
