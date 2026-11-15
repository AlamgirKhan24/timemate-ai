"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CompletionDonut, CompletionTrend } from "@/components/CompletionCharts";
import { clearToken, getMe, getProductivityReport } from "@/services/api";

function localDate(timezone, offset = 0) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({ start_date: "", end_date: "", category: "" });
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMe().then((me) => {
      setUser(me);
      const end = localDate(me.timezone);
      const start = localDate(me.timezone, -29);
      const initialFilters = { start_date: start, end_date: end, category: "" };
      setFilters(initialFilters);
      getProductivityReport(initialFilters).then(setReport).catch((err) => setError(err.message));
    }).catch(() => {
      clearToken();
      router.replace("/login");
    });
  }, [router]);

  async function load(e) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      setReport(await getProductivityReport(filters));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const input = "rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-900";
  if (!user) return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading reports...</p></main>;

  const stats = report ? [
    ["Tasks in period", report.total, "var(--amber)"],
    ["Completed", report.completed, "var(--mint)"],
    ["Completion rate", `${report.completion_percentage}%`, "#82aaff"],
    ["Overdue", report.overdue, "var(--coral)"],
  ] : [];
  const distribution = report ? [
    { label: "Completed", value: report.completed, color: "var(--mint)" },
    { label: "Pending", value: report.pending, color: "var(--amber)" },
    { label: "Overdue", value: report.overdue, color: "var(--coral)" },
  ] : [];

  return <main className="mx-auto max-w-[1440px] space-y-6 px-5 py-7 sm:px-8 sm:py-9">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="dashboard-eyebrow">Your progress</p><h1 className="dashboard-heading mt-2">Productivity <em>reports.</em></h1><p className="mt-2 text-sm text-gray-500">Patterns and completion rates from your scheduled tasks.</p></div>
      <p className="font-mono text-xs text-gray-500">Timezone · {user.timezone}</p>
    </header>

    <form onSubmit={load} className="dashboard-panel flex flex-wrap items-end gap-3">
      <label className="text-xs text-gray-500">From<input type="date" className={`${input} mt-1 block`} value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}/></label>
      <label className="text-xs text-gray-500">To<input type="date" className={`${input} mt-1 block`} value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}/></label>
      <label className="text-xs text-gray-500">Category<select className={`${input} mt-1 block min-w-36`} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">All categories</option>{["Personal", "Work", "Study", "Health"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60">{busy ? "Updating..." : "Update report"}</button>
    </form>

    {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-100 px-4 py-3 text-sm text-red-700">{error}</p>}
    {report && <>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Report summary">
        {stats.map(([label, value, color]) => <article key={label} className="dashboard-stat"><span className="mb-3 block h-1 w-8 rounded-full" style={{ background: color }}/><p className="dashboard-stat-number">{value}</p><p className="dashboard-stat-label mt-1">{label}</p></article>)}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="dashboard-chart-panel xl:col-span-2"><div className="mb-3"><h2 className="text-lg">Weekly completion</h2><p className="mt-1 text-xs text-gray-500">Completed tasks as a percentage of tasks scheduled each week</p></div><CompletionTrend rows={report.weekly} emptyMessage="There are no tasks in the selected period yet."/></article>
        <article className="dashboard-chart-panel"><div className="mb-3"><h2 className="text-lg">Status distribution</h2><p className="mt-1 text-xs text-gray-500">Task status in the selected period</p></div><CompletionDonut values={distribution}/></article>
      </section>

      <section className="dashboard-chart-panel"><div className="mb-3"><h2 className="text-lg">Monthly completion</h2><p className="mt-1 text-xs text-gray-500">Completion rate grouped by month</p></div><CompletionTrend rows={report.monthly} emptyMessage="There are no tasks in the selected period yet."/></section>
      <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">{report.start_date} — {report.end_date}{report.category ? ` · ${report.category}` : " · All categories"}</p>
    </>}
  </main>;
}
