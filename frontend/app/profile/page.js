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
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Loading your profile…</p>
      </main>
    );
  }

  const input = "app-field mt-1.5";
  const label = "block text-xs font-medium text-gray-500";

  return (
    <main className="app-page app-page-narrow space-y-5">
      <header className="app-page-header"><div><p className="app-page-eyebrow">Your personal settings</p><h1 className="app-page-title">Make TimeMate yours.</h1><p className="app-page-description">Keep your name and local time up to date so your schedule feels right wherever you are.</p></div></header>

      <form onSubmit={handleSubmit} className="app-glass-card max-w-2xl space-y-5 p-5 sm:p-7">
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
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">Local time right now</p><p className="mt-1 text-base font-medium text-gray-900">{previewTime(timezone)}</p><p className="mt-2 text-xs leading-5 text-gray-500">Changing your time zone updates how dates appear. Existing tasks keep their scheduled moment; new tasks use this time zone.</p></div>
        </div>

        {error && <p role="alert" className="app-message is-error">{error}</p>}
        {notice && <p role="status" className="app-message is-success">{notice}</p>}

        <button type="submit" disabled={saving} className="app-primary-button">
          {saving ? "Saving your settings…" : "Save my settings"}
        </button>
      </form>
    </main>
  );
}
