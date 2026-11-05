"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearToken,
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppSettings,
} from "@/services/api";

const numberPattern = /^\+[1-9]\d{7,14}$/;

export default function SettingsPage() {
  const router = useRouter();
  const [saved, setSaved] = useState(null);
  const [number, setNumber] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getWhatsAppSettings()
      .then((data) => {
        setSaved(data);
        setNumber(data.whatsapp_number || "");
        setAgreed(data.opted_in);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    const cleaned = number.replace(/[\s-]/g, "");
    if (!numberPattern.test(cleaned)) {
      setError("Enter the number with country code, for example +923001234567");
      return;
    }
    if (!agreed) {
      setError("Please tick the box to agree to receive WhatsApp reminders");
      return;
    }

    setBusy(true);
    try {
      const data = await connectWhatsApp({ whatsapp_number: cleaned, opted_in: true });
      setSaved(data);
      setNumber(data.whatsapp_number);
      setMessage("WhatsApp number saved");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect WhatsApp and stop all reminders?")) return;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await disconnectWhatsApp();
      setSaved({ whatsapp_number: null, is_verified: false, opted_in: false });
      setNumber("");
      setAgreed(false);
      setMessage("WhatsApp disconnected");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!saved) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  const connected = saved.opted_in && saved.whatsapp_number;

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">WhatsApp reminders</h1>
        <Link href="/dashboard" className="text-sm text-blue-600 underline">
          Back to dashboard
        </Link>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <p className="text-sm text-gray-600">Status</p>
        <p className="mt-1 font-medium">
          {connected ? `Connected: ${saved.whatsapp_number}` : "Not connected"}
        </p>
        {connected && !saved.is_verified && (
          <p className="mt-1 text-sm text-yellow-700">Number not verified yet</p>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-2xl bg-white p-5 shadow">
        <div>
          <label htmlFor="number" className="mb-1 block text-sm font-medium">
            WhatsApp number
          </label>
          <input
            id="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="+923001234567"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1"
          />
          <span>I agree to receive task reminders on this WhatsApp number.</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save"}
          </button>
          {connected && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={busy}
              className="rounded-lg border border-red-300 px-4 py-2 text-red-600 disabled:opacity-60"
            >
              Disconnect
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
