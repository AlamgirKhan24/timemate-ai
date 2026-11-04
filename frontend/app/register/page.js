"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser, registerUser } from "@/services/api";

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

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2";
  const label = "mb-1 block text-sm font-medium";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">Create your account</h1>

        <div>
          <label htmlFor="name" className={label}>Name</label>
          <input id="name" required minLength={2} value={form.name} onChange={(e) => update("name", e.target.value)} className={input} />
        </div>

        <div>
          <label htmlFor="email" className={label}>Email</label>
          <input id="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className={input} />
        </div>

        <div>
          <label htmlFor="password" className={label}>Password (at least 8 characters)</label>
          <input id="password" type="password" required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} className={input} />
        </div>

        <div>
          <label htmlFor="timezone" className={label}>Time zone</label>
          <select id="timezone" value={form.timezone} onChange={(e) => update("timezone", e.target.value)} className={input}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white disabled:opacity-60">
          {loading ? "Creating account..." : "Sign up"}
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 underline">Log in</Link>
        </p>
      </form>
    </main>
  );
}
