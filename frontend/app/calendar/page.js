"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getMe, getTasks } from "@/services/api";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MODES = ["month", "week", "day"];

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

function firstOfMonth(key, deltaMonths = 0) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + deltaMonths, 1)).toISOString().slice(0, 10);
}

function monthGrid(key) {
  const first = firstOfMonth(key);
  const dow = new Date(`${first}T00:00:00Z`).getUTCDay();
  const start = addDays(first, -dow);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function weekGrid(key) {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay();
  const start = addDays(key, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function fmt(key, options) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

function chipStyle(task, now) {
  if (task.status === "completed") return "bg-gray-100 text-gray-500 line-through";
  if (new Date(task.start_at) < now) return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

function statusLabel(task, now) {
  if (task.status === "completed") return "completed";
  return new Date(task.start_at) < now ? "overdue" : "pending";
}

function TaskList({ tasks, timeZone, now }) {
  if (tasks.length === 0) return <p className="text-sm text-gray-500">No tasks on this day.</p>;
  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3">
          <div>
            <p className={`font-medium ${t.status === "completed" ? "line-through text-gray-400" : ""}`}>{t.title}</p>
            <p className="text-sm text-gray-600">
              {timeOnly(t.start_at, timeZone)}
              {t.duration_minutes ? ` · ${t.duration_minutes} min` : ""}
              {` · ${t.category} · ${t.priority}`}
            </p>
            {t.description && <p className="mt-1 text-sm text-gray-500">{t.description}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${chipStyle(t, now)}`}>
            {statusLabel(t, now)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [mode, setMode] = useState("month");
  const [anchor, setAnchor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMe()
      .then((me) => {
        setUser(me);
        const today = dayKey(new Date(), me.timezone);
        setAnchor(today);
        setSelected(today);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  const days = useMemo(() => {
    if (!anchor) return [];
    if (mode === "month") return monthGrid(anchor);
    if (mode === "week") return weekGrid(anchor);
    return [anchor];
  }, [mode, anchor]);

  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];

  useEffect(() => {
    if (!user || !rangeStart) return;
    getTasks(`${rangeStart}T00:00:00`, `${rangeEnd}T23:59:59`)
      .then((list) => {
        setTasks(list);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [user, rangeStart, rangeEnd]);

  const byDay = useMemo(() => {
    const map = {};
    if (!user) return map;
    tasks.forEach((t) => {
      const key = dayKey(t.start_at, user.timezone);
      (map[key] = map[key] || []).push(t);
    });
    return map;
  }, [tasks, user]);

  if (!user || !anchor) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  const now = new Date();
  const todayKey = dayKey(now, user.timezone);
  const tz = user.timezone;

  function move(direction) {
    let next;
    if (mode === "month") next = firstOfMonth(anchor, direction);
    else if (mode === "week") next = addDays(anchor, 7 * direction);
    else next = addDays(anchor, direction);
    setAnchor(next);
    setSelected(next);
  }

  function goToday() {
    setAnchor(todayKey);
    setSelected(todayKey);
  }

  function switchMode(next) {
    setMode(next);
    setAnchor(selected || todayKey);
  }

  function openDay(key) {
    setSelected(key);
    setAnchor(key);
    setMode("day");
  }

  let title;
  if (mode === "month") title = fmt(anchor, { month: "long", year: "numeric" });
  else if (mode === "week") {
    const w = weekGrid(anchor);
    title = `${fmt(w[0], { month: "short", day: "numeric" })} - ${fmt(w[6], { month: "short", day: "numeric", year: "numeric" })}`;
  } else title = fmt(anchor, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const currentMonth = Number(anchor.slice(5, 7)) - 1;
  const selectedTasks = selected ? byDay[selected] || [] : [];

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                aria-pressed={mode === m}
                className={`px-3 py-1 capitalize ${mode === m ? "bg-blue-600 text-white" : "bg-white"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <button onClick={() => move(-1)} aria-label="Previous" className="rounded-lg border border-gray-300 px-3 py-1">&larr;</button>
          <button onClick={goToday} className="rounded-lg border border-gray-300 px-3 py-1">Today</button>
          <button onClick={() => move(1)} aria-label="Next" className="rounded-lg border border-gray-300 px-3 py-1">&rarr;</button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {mode === "month" && (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[640px] rounded-2xl bg-white p-2 shadow">
              <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {days.map((key) => {
                  const inMonth = Number(key.slice(5, 7)) - 1 === currentMonth;
                  const list = byDay[key] || [];
                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(key)}
                      onDoubleClick={() => openDay(key)}
                      className={`min-h-24 bg-white p-1 text-left align-top ${inMonth ? "" : "bg-gray-50 text-gray-400"} ${key === selected ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${key === todayKey ? "bg-blue-600 text-white" : ""}`}>
                        {Number(key.slice(8, 10))}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {list.slice(0, 3).map((t) => (
                          <div key={t.id} className={`truncate rounded px-1 text-xs ${chipStyle(t, now)}`}>
                            {timeOnly(t.start_at, tz)} {t.title}
                          </div>
                        ))}
                        {list.length > 3 && <div className="text-xs text-gray-500">+{list.length - 3} more</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <section className="rounded-2xl bg-white p-4 shadow">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {fmt(selected, { weekday: "long", month: "long", day: "numeric" })}
              </h2>
              <button onClick={() => openDay(selected)} className="rounded-lg border border-gray-300 px-3 py-1 text-sm">
                Open day view
              </button>
            </div>
            <TaskList tasks={selectedTasks} timeZone={tz} now={now} />
          </section>
        </>
      )}

      {mode === "week" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((key) => {
            const list = byDay[key] || [];
            return (
              <div key={key} className={`rounded-2xl bg-white p-2 shadow ${key === todayKey ? "ring-2 ring-blue-500" : ""}`}>
                <button onClick={() => openDay(key)} className="mb-2 w-full text-left">
                  <span className="block text-xs font-medium text-gray-500">{fmt(key, { weekday: "short" })}</span>
                  <span className="block text-lg font-semibold">{fmt(key, { month: "short", day: "numeric" })}</span>
                </button>
                {list.length === 0 ? (
                  <p className="text-xs text-gray-400">No tasks</p>
                ) : (
                  <div className="space-y-1">
                    {list.map((t) => (
                      <div key={t.id} className={`rounded px-2 py-1 text-xs ${chipStyle(t, now)}`}>
                        <span className="block font-medium">{timeOnly(t.start_at, tz)}</span>
                        <span className="block break-words">{t.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {mode === "day" && (
        <section className="rounded-2xl bg-white p-4 shadow">
          <TaskList tasks={byDay[anchor] || []} timeZone={tz} now={now} />
        </section>
      )}
    </main>
  );
}