"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearToken,
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppSettings,
  requestWhatsAppVerification,
  verifyWhatsAppCode,
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
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

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
      setCodeSent(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestCode() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await requestWhatsAppVerification();
      setCodeSent(true);
      setMessage("Verification code sent to your WhatsApp number.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const data = await verifyWhatsAppCode(verificationCode);
      setSaved(data);
      setVerificationCode("");
      setCodeSent(false);
      setMessage("WhatsApp number verified. Reminders can now be sent.");
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
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Loading your reminder settings…</p>
      </main>
    );
  }

  const connected = saved.opted_in && saved.whatsapp_number;

  return (
    <main className="app-page app-page-narrow space-y-5">
      <header className="app-page-header"><div><p className="app-page-eyebrow">A gentle nudge, when you need it</p><h1 className="app-page-title">WhatsApp reminders</h1><p className="app-page-description">Connect your number and choose to receive reminders for the tasks you schedule.</p></div><Link href="/dashboard" className="app-secondary-button shrink-0">Back to your day</Link></header>

      <div className="app-glass-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div><p className="app-page-eyebrow">Connection status</p>
        <p className="mt-1 font-medium text-gray-900">
          {connected ? `Connected: ${saved.whatsapp_number}` : "Not connected"}
        </p></div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${connected && saved.is_verified ? "border-green-300 bg-green-100 text-green-700" : "border-gray-300 bg-gray-100 text-gray-600"}`}>{connected && saved.is_verified ? "Ready for reminders" : connected ? "Verification needed" : "Not connected"}</span>
        {connected && !saved.is_verified && (
          <p className="mt-1 text-sm text-yellow-700">Number not verified yet</p>
        )}
        {connected && saved.is_verified && (
          <p className="mt-1 text-sm text-green-700">Verified and opted in for reminders</p>
        )}
      </div>

      {connected && !saved.is_verified && (
        <form onSubmit={handleVerify} className="app-glass-card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="font-semibold">Verify your number</h2>
            <p className="mt-1 text-sm text-gray-600">
              Send a one-time code to this WhatsApp number, then enter it below.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestCode}
            disabled={busy}
              className="app-secondary-button disabled:opacity-60"
          >
            {busy ? "Please wait..." : codeSent ? "Send another code" : "Send verification code"}
          </button>
          {codeSent && <p className="text-sm text-green-700">Code sent. It expires after a short time.</p>}
          <div>
            <label htmlFor="verification-code" className="mb-1.5 block text-xs font-medium text-gray-500">6-digit code</label>
            <input
              id="verification-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="app-field"
            />
          </div>
          <button
            type="submit"
            disabled={busy || verificationCode.length !== 6}
            className="app-primary-button disabled:opacity-60"
          >
            {busy ? "Verifying..." : "Verify number"}
          </button>
        </form>
      )}

      <form onSubmit={handleSave} className="app-glass-card space-y-4 p-5 sm:p-6">
        <div>
          <label htmlFor="number" className="mb-1.5 block text-xs font-medium text-gray-500">
            WhatsApp number
          </label>
          <input
            id="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="+923001234567"
            className="app-field"
          />
        </div>

        <label className="flex items-start gap-2.5 text-xs leading-5 text-gray-600">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5"
          />
          <span>I agree to receive task reminders on this WhatsApp number.</span>
        </label>

        {error && <p role="alert" className="app-message is-error">{error}</p>}
        {message && <p role="status" className="app-message is-success">{message}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="app-primary-button disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save"}
          </button>
          {connected && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={busy}
              className="app-danger-button disabled:opacity-60"
            >
              Disconnect
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
