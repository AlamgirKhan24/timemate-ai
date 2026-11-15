"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser, registerUser } from "@/services/api";
import AuthShell from "@/components/AuthShell";

const timezones = ["Asia/Karachi", "Asia/Dubai", "Europe/London", "America/New_York", "UTC"];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    timezone: "Asia/Karachi",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerUser(form);
      await loginUser(form.email, form.password);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return <AuthShell eyebrow="Start with a clear slate" title="Make room for better days." description="Create your workspace and bring your schedule into focus.">
    <form onSubmit={handleSubmit} className="auth-form">
      <label className="auth-field" htmlFor="name">Your name<input id="name" autoComplete="name" required minLength={2} value={form.name} onChange={(e) => update("name", e.target.value)} className="auth-input" placeholder="Your name"/></label>
      <label className="auth-field" htmlFor="email">Email<input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="auth-input" placeholder="you@example.com"/></label>
      <label className="auth-field" htmlFor="password">Password <span>At least 8 characters</span><input id="password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} className="auth-input" placeholder="Create a password"/></label>
      <label className="auth-field" htmlFor="timezone">Time zone<select id="timezone" value={form.timezone} onChange={(e) => update("timezone", e.target.value)} className="auth-input">{timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}</select></label>
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button type="submit" disabled={loading} className="auth-submit">{loading ? "Creating account..." : "Create account"}<span aria-hidden="true">↗</span></button>
      <p className="auth-alt">Already have an account? <Link href="/login">Sign in</Link></p>
    </form>
  </AuthShell>;
}
