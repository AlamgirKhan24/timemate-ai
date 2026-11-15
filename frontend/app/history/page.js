"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken, getMe, getNotifications, getReminders, retryReminder } from "@/services/api";

const resultStyle = {
  sent: "bg-green-100 text-green-700",
  accepted: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-700",
  read: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-gray-100 text-gray-700",
  missed: "bg-yellow-100 text-yellow-700",
};

function formatTime(iso, timeZone) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [action, setAction] = useState({ id: null, message: "", error: "" });

  async function reload() {
    const [me, history, reminderList] = await Promise.all([
      getMe(),
      getNotifications(),
      getReminders(),
    ]);
    setUser(me);
    setLogs(history);
    setReminders(reminderList);
  }

  useEffect(() => {
    reload().catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  async function handleRetry(reminderId) {
    setAction({ id: reminderId, message: "", error: "" });
    try {
      await retryReminder(reminderId);
      setReminders((items) => items.map((item) =>
        item.id === reminderId ? { ...item, status: "pending" } : item
      ));
      setAction({ id: null, message: "Retry queued. Refresh history in a moment for the result.", error: "" });
    } catch (err) {
      setAction({ id: null, message: "", error: err.message });
    }
  }

  if (!logs || !user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">Gathering your reminder history…</p>
      </main>
    );
  }

  return (
    <main className="app-page app-page-medium space-y-5">
      <header className="app-page-header">
        <div><p className="app-page-eyebrow">A record of every gentle nudge</p><h1 className="app-page-title">Reminder history</h1><p className="app-page-description">See what was sent and check the latest delivery status.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => reload().catch((err) => setAction({ id: null, message: "", error: err.message }))} className="app-secondary-button">Refresh history</button><Link href="/dashboard" className="app-secondary-button">Back to your day</Link></div>
      </header>

      {action.message && <p role="status" className="app-message is-success">{action.message}</p>}
      {action.error && <p role="alert" className="app-message is-error">{action.error}</p>}

      {logs.length === 0 ? (
        <div className="app-glass-card px-5 py-12 text-center"><p className="text-2xl" aria-hidden="true">◷</p><h2 className="mt-3 text-lg">Your history will show up here</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">Once a scheduled reminder is processed, you’ll find its delivery status here.</p></div>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="app-glass-card flex items-start justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="font-medium">{log.task_title}</p>
                <p className="text-sm text-gray-600">{formatTime(log.created_at, user.timezone)}</p>
                {log.error && <p className="mt-1 text-sm text-gray-500">{log.error}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${resultStyle[log.result] || "bg-gray-100 text-gray-700"}`}>
                  {log.result === "accepted" ? "accepted · waiting for delivery" : log.result}
                </span>
                {log.result === "failed" && log.retry_safe &&
                  reminders.find((reminder) => reminder.id === log.reminder_id)?.status === "failed" && (
                    <button
                      onClick={() => handleRetry(log.reminder_id)}
                      disabled={action.id === log.reminder_id}
                      className="app-secondary-button min-h-8 px-3 py-1 text-xs disabled:opacity-60"
                    >
                      {action.id === log.reminder_id ? "Queuing..." : "Retry"}
                    </button>
                  )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
