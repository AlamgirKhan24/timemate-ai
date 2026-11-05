"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getMe, getTasks } from "@/services/api";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(date, timeZone) {
  return new Date(date).toLocaleDateString("en-CA", { timeZone });
}

function timeOnly(iso, timeZone) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
}

function addDays(key, n) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildGrid(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const firstKey = first.toISOString().slice(0, 10);
  const start = addDays(firstKey, -first.getUTCDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function chipStyle(task, now) {
  if (task.status === "completed") return "bg-gray-100 text-gray-500 line-through";
  if (new Date(task.start_at) < now) return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState(null); // { year, month }
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMe()
      .then((me) => {
        setUser(me);
        const today = dayKey(new Date(), me.timezone);
        const [y, m] = today.split("-").map(Number);
        setView({ year: y, month: m - 1 });
        setSelected(today);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  const grid = useMemo(() => (view ? buildGrid(view.year, view.month) : []), [view]);

  useEffect(() => {
    if (!user || grid.length === 0) return;
    const start = `${grid[0]}T00:00:00`;
    const end = `${grid[grid.length - 1]}T23:59:59`;
    getTasks(start, end)
      .then((list) => {
        setTasks(list);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [user, grid]);

  const byDay = useMemo(() => {
    const map = {};
    if (!user) return map;
    tasks.forEach((t) => {
      const key = dayKey(t.start_at, user.timezone);
      (map[key] = map[key] || []).push(t);
    });
    return map;
  }, [tasks, user]);

  if (!user || !view) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  const now = new Date();
  const todayKey = dayKey(now, user.timezone);
  const monthLabel = new Date(Date.UTC(view.year, view.month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  function shiftMonth(delta) {
    const d = new Date(Date.UTC(view.year, view.month + delta, 1));
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  }

  function goToday() {
    const [y, m] = todayKey.split("-").map(Number);
    setView({ year: y, month: m - 1 });
    setSelected(todayKey);
  }

  const selectedTasks = selected ? byDay[selected] || [] : [];

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{monthLabel}</h1>
        <div className="flex gap-2 text-sm">
          <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="rounded-lg border border-gray-300 px-3 py-1">&larr;</button>
          <button onClick={goToday} className="rounded-lg border border-gray-300 px-3 py-1">Today</button>
          <button onClick={() => shiftMonth(1)} aria-label="Next month" className="rounded-lg border border-gray-300 px-3 py-1">&rarr;</button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <div className="min-w-[640px] rounded-2xl bg-white p-2 shadow">
          <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {grid.map((key) => {
              const inMonth = Number(key.slice(5, 7)) - 1 === view.month;
              const list = byDay[key] || [];
              const isToday = key === todayKey;
              const isSelected = key === selected;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`min-h-24 bg-white p-1 text-left align-top ${inMonth ? "" : "bg-gray-50 text-gray-400"} ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-blue-600 text-white" : ""}`}>
                    {Number(key.slice(8, 10))}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {list.slice(0, 3).map((t) => (
                      <div key={t.id} className={`truncate rounded px-1 text-xs ${chipStyle(t, now)}`}>
                        {timeOnly(t.start_at, user.timezone)} {t.title}
                      </div>
                    ))}
                    {list.length > 3 && (
                      <div className="text-xs text-gray-500">+{list.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">
          {new Date(`${selected}T00:00:00Z`).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })}
        </h2>
        {selectedTasks.length === 0 ? (
          <p className="text-sm text-gray-500">No tasks on this day.</p>
        ) : (
          <ul className="space-y-2">
            {selectedTasks.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3">
                <div>
                  <p className={`font-medium ${t.status === "completed" ? "line-through text-gray-400" : ""}`}>{t.title}</p>
                  <p className="text-sm text-gray-600">
                    {timeOnly(t.start_at, user.timezone)}
                    {t.duration_minutes ? ` · ${t.duration_minutes} min` : ""}
                  </p>
                  {t.description && <p className="mt-1 text-sm text-gray-500">{t.description}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${chipStyle(t, now)}`}>
                  {t.status === "completed" ? "completed" : new Date(t.start_at) < now ? "overdue" : "pending"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}