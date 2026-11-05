"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken, getMe, getNotifications } from "@/services/api";

const resultStyle = {
  sent: "bg-green-100 text-green-700",
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

  useEffect(() => {
    Promise.all([getMe(), getNotifications()])
      .then(([me, list]) => {
        setUser(me);
        setLogs(list);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  if (!logs || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notification history</h1>
        <Link href="/dashboard" className="text-sm text-blue-600 underline">
          Back to dashboard
        </Link>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-500">No reminders have been processed yet.</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="flex items-start justify-between gap-3 rounded-xl bg-white p-4 shadow">
              <div>
                <p className="font-medium">{log.task_title}</p>
                <p className="text-sm text-gray-600">{formatTime(log.created_at, user.timezone)}</p>
                {log.error && <p className="mt-1 text-sm text-gray-500">{log.error}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${resultStyle[log.result] || "bg-gray-100 text-gray-700"}`}>
                {log.result}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
