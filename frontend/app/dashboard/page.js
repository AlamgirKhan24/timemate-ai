"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TaskForm from "@/components/TaskForm";
import EditTaskForm from "@/components/EditTaskForm";
import { CompletionDonut, CompletionTrend } from "@/components/CompletionCharts";
import { clearToken, deleteTask, getMe, getOverview, getProductivityReport, getTasks, updateTask } from "@/services/api";

const priorityStyle = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const statColors = {
  amber: { color: "var(--amber)", background: "rgba(255,180,84,.12)" },
  mint: { color: "var(--mint)", background: "rgba(127,231,196,.12)" },
  blue: { color: "#82aaff", background: "rgba(130,170,255,.12)" },
  coral: { color: "var(--coral)", background: "rgba(255,138,128,.12)" },
};

function dayKey(date, timeZone) {
  return new Date(date).toLocaleDateString("en-CA", { timeZone });
}

function shiftDay(key, amount) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatTime(iso, timeZone) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function shortDate(iso, timeZone) {
  const date = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("en", { timeZone, day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("en", { timeZone, month: "short" }).format(date),
    weekday: new Intl.DateTimeFormat("en", { timeZone, weekday: "short" }).format(date),
  };
}

function groupTasks(tasks, timeZone) {
  const now = new Date();
  const today = dayKey(now, timeZone);
  const groups = { Overdue: [], Today: [], Upcoming: [], Completed: [] };

  tasks.forEach((task) => {
    if (task.status === "completed") groups.Completed.push(task);
    else if (new Date(task.start_at) < now) groups.Overdue.push(task);
    else if (dayKey(task.start_at, timeZone) === today) groups.Today.push(task);
    else groups.Upcoming.push(task);
  });

  return groups;
}

function MetricIcon({ kind }) {
  const paths = {
    today: <><rect x="3.5" y="4.5" width="17" height="16" rx="2"/><path d="M7.5 2.5v4M16.5 2.5v4M4 9h16M8 13h2M14 13h2M8 17h2"/></>,
    done: <><path d="M20 6 9 17l-5-5"/><circle cx="12" cy="12" r="9"/></>,
    pending: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    overdue: <><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4M12 16h.01"/></>,
  };
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

function TaskMeta({ task, timeZone }) {
  return <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
    <span className={`rounded-full px-2.5 py-1 font-mono uppercase tracking-wide ${priorityStyle[task.priority]}`}>{task.priority}</span>
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">{task.category}</span>
    <span className="text-gray-500">{formatTime(task.start_at, timeZone)}</span>
  </div>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    const [me, list, overview] = await Promise.all([getMe(), getTasks(), getOverview()]);
    setUser(me);
    setTasks(list);
    setSummary(overview);
    const today = dayKey(new Date(), me.timezone);
    getProductivityReport({ start_date: shiftDay(today, -29), end_date: today })
      .then(setReport)
      .catch(() => setReport(null));
  }, []);

  useEffect(() => {
    load().catch(() => {
      clearToken();
      router.replace("/login");
    });
  }, [load, router]);

  async function toggleDone(task) {
    const next = task.status === "completed" ? "pending" : "completed";
    await updateTask(task.id, { status: next });
    load();
  }

  async function remove(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    await deleteTask(task.id);
    load();
  }

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading your workspace...</p></main>;
  }

  const groups = groupTasks(tasks, user.timezone);
  const firstName = user.name.split(" ")[0];
  const greeting = new Date().toLocaleTimeString("en", { timeZone: user.timezone, hour: "numeric", hour12: false });
  const greetingText = Number(greeting) < 12 ? "Good morning" : Number(greeting) < 18 ? "Good afternoon" : "Good evening";
  const todayText = new Intl.DateTimeFormat("en", { timeZone: user.timezone, weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const stats = summary ? [
    { label: "Tasks today", value: summary.today_tasks.length, kind: "today", color: "amber" },
    { label: "Completed today", value: summary.completed_today_count, kind: "done", color: "mint" },
    { label: "Still pending", value: summary.pending_today_count, kind: "pending", color: "blue" },
    { label: "Overdue", value: summary.overdue_count, kind: "overdue", color: "coral" },
  ] : [];
  const recentTasks = [...tasks].sort((a, b) => new Date(b.start_at) - new Date(a.start_at)).slice(0, 5);
  const distribution = report ? [
    { label: "Completed", value: report.completed, color: "var(--mint)" },
    { label: "Pending", value: report.pending, color: "var(--amber)" },
    { label: "Overdue", value: report.overdue, color: "var(--coral)" },
  ] : [];

  return <main className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 sm:py-9">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="dashboard-eyebrow">{todayText} · Your workspace</p>
        <h1 className="dashboard-heading mt-2">{greetingText}, <em>{firstName}.</em></h1>
        <p className="mt-2 text-sm text-gray-500">A clear view of what’s moving today.</p>
      </div>
      <Link href="#new-task" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/10 transition hover:-translate-y-0.5 hover:shadow-amber-500/20">
        <span aria-hidden="true" className="text-lg leading-none">＋</span> New task
      </Link>
    </header>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Today's task summary">
      {stats.map((stat) => <article key={stat.label} className="dashboard-stat">
        <div className="mb-4 flex items-center justify-between">
          <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ color: statColors[stat.color].color, background: statColors[stat.color].background }}><MetricIcon kind={stat.kind}/></span>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: statColors[stat.color].color }}/>
        </div>
        <p className="dashboard-stat-number">{stat.value}</p>
        <p className="dashboard-stat-label mt-1">{stat.label}</p>
      </article>)}
    </section>

    <section className="grid gap-4 xl:grid-cols-3" aria-label="Productivity overview">
      <article className="dashboard-chart-panel xl:col-span-2">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div><h2 className="text-lg">Productivity</h2><p className="mt-1 text-xs text-gray-500">Weekly task completion · last 30 days</p></div>
          <Link href="/analytics" className="text-xs font-medium text-blue-600 hover:underline">Full report <span aria-hidden="true">↗</span></Link>
        </div>
        <CompletionTrend rows={report?.weekly || []} emptyMessage="Complete a task to start building your productivity history."/>
      </article>
      <article className="dashboard-chart-panel">
        <div className="mb-2"><h2 className="text-lg">Task distribution</h2><p className="mt-1 text-xs text-gray-500">Status across the same 30-day period</p></div>
        {report ? <CompletionDonut values={distribution}/> : <div className="dashboard-empty-chart">Loading task distribution...</div>}
      </article>
    </section>

    <section className="grid gap-4 xl:grid-cols-5">
      <article className="dashboard-panel xl:col-span-3">
        <div className="mb-2 flex items-center justify-between gap-3"><div><h2 className="text-lg">Recent tasks</h2><p className="mt-1 text-xs text-gray-500">Your latest scheduled tasks</p></div><span className="font-mono text-xs text-gray-500">{tasks.length} total</span></div>
        {recentTasks.length ? recentTasks.map((task) => <div key={task.id} className="dashboard-task-row flex items-start justify-between gap-3">
          <div className="min-w-0"><p className={`truncate text-sm font-medium ${task.status === "completed" ? "text-gray-500 line-through" : ""}`}>{task.title}</p><TaskMeta task={task} timeZone={user.timezone}/></div>
          <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide ${task.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{task.status}</span>
        </div>) : <div className="dashboard-empty-chart">Your recent tasks will appear here when you add one.</div>}
      </article>

      <article className="dashboard-panel xl:col-span-2">
        <div className="mb-2"><h2 className="text-lg">Coming up</h2><p className="mt-1 text-xs text-gray-500">Next tasks on your calendar</p></div>
        {summary?.upcoming_tasks?.length ? summary.upcoming_tasks.slice(0, 5).map((task) => {
          const date = shortDate(task.start_at, user.timezone);
          return <div key={task.id} className="dashboard-task-row flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-content-center rounded-xl bg-gray-100 text-center"><span className="font-serif text-lg leading-none">{date.day}</span><span className="font-mono text-[9px] uppercase text-gray-500">{date.month}</span></div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{task.title}</p><p className="mt-1 text-xs text-gray-500">{date.weekday} · {new Date(task.start_at).toLocaleTimeString("en", { timeZone: user.timezone, hour: "numeric", minute: "2-digit" })} · {task.category}</p></div>
          </div>;
        }) : <div className="dashboard-empty-chart">Nothing else is scheduled for the next few days.</div>}
      </article>
    </section>

    <section id="new-task" className="scroll-mt-6">
      <TaskForm onCreated={load}/>
    </section>

    <section className="space-y-4" aria-label="Manage all tasks">
      <div><p className="dashboard-eyebrow">Your task list</p><h2 className="mt-1 text-2xl">Everything in motion</h2></div>
      {Object.entries(groups).map(([name, list]) => <article key={name} className="dashboard-panel">
        <div className="mb-3 flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: name === "Completed" ? "var(--mint)" : name === "Overdue" ? "var(--coral)" : name === "Today" ? "var(--amber)" : "#82aaff" }}/><h3 className="text-base">{name}</h3><span className="font-mono text-xs text-gray-500">{String(list.length).padStart(2, "0")}</span></div>
        {list.length === 0 ? <p className="py-2 text-sm text-gray-500">Nothing here right now.</p> : <ul className="space-y-2">{list.map((task) => <li key={task.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4">
          {editingId === task.id ? <EditTaskForm task={task} timeZone={user.timezone} onSaved={() => { setEditingId(null); load(); }} onCancel={() => setEditingId(null)}/> : <>
            <div className="min-w-0 flex-1"><p className={`font-medium ${task.status === "completed" ? "line-through text-gray-400" : ""}`}>{task.title}</p>{task.description && <p className="mt-1 text-sm text-gray-500">{task.description}</p>}<TaskMeta task={task} timeZone={user.timezone}/></div>
            <div className="flex shrink-0 gap-2 text-xs"><button onClick={() => setEditingId(task.id)} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:border-gray-400">Edit</button><button onClick={() => toggleDone(task)} className="rounded-lg border border-gray-300 px-3 py-1.5 hover:border-gray-400">{task.status === "completed" ? "Undo" : "Done"}</button><button onClick={() => remove(task)} className="rounded-lg border border-red-300 px-3 py-1.5 text-red-600">Delete</button></div>
          </>}</li>)}</ul>}
      </article>)}
    </section>
  </main>;
}
