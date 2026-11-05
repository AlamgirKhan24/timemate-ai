"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getMe, updateMe } from "@/services/api";

function zoneList(current) {
  let zones = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = ["Asia/Karachi", "Asia/Dubai", "Asia/Kolkata", "Europe/London", "America/New_York"];
  }
  if (!zones.includes("UTC")) zones = ["UTC", ...zones];
  if (current && !zones.includes(current)) zones = [current, ...zones];
  return zones;
}

function previewTime(timeZone) {
  try {
    return new Date().toLocaleString("en-US", { timeZone, dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMe()
      .then((me) => {
        setUser(me);
        setName(me.name);
        setTimezone(me.timezone);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const me = await updateMe({ name: name.trim(), timezone });
      setUser(me);
      setName(me.name);
      setTimezone(me.timezone);
      setNotice("Profile saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2";
  const label = "mb-1 block text-sm font-medium";

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow">
        <div>
          <label htmlFor="email" className={label}>Email</label>
          <input id="email" value={user.email} disabled className={`${input} bg-gray-100 text-gray-500`} />
        </div>

        <div>
          <label htmlFor="name" className={label}>Name</label>
          <input id="name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </div>

        <div>
          <label htmlFor="timezone" className={label}>Time zone</label>
          <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={input}>
            {zoneList(user.timezone).map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-600">Current time in this zone: {previewTime(timezone)}</p>
          <p className="mt-1 text-xs text-gray-500">
            Pakistan users should choose Asia/Karachi. Your existing tasks and reminders keep the same moment in time;
            only the times shown on screen change. New tasks use the time zone selected here.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-green-700">{notice}</p>}

        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60">
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </main>
  );
}