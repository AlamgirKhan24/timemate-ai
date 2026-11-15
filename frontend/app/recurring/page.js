"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, createRecurringSchedule, getMe, getRecurringSchedules, stopRecurringSchedule, updateRecurringSchedule } from "@/services/api";

const emptyForm = { title: "", description: "", start_date: "", local_time: "09:00", frequency: "daily", weekdays: [], end_date: "", duration_minutes: "", priority: "medium", category: "Personal", reminder_offsets: "" };
const days = [[0,"Mon"],[1,"Tue"],[2,"Wed"],[3,"Thu"],[4,"Fri"],[5,"Sat"],[6,"Sun"]];

function localDate(timezone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function RecurringPage() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [me, schedules] = await Promise.all([getMe(), getRecurringSchedules()]);
    if (!form.start_date) setForm((prev) => ({ ...prev, start_date: localDate(me.timezone) }));
    setItems(schedules);
  }
  useEffect(() => { reload().catch(() => { clearToken(); router.replace("/login"); }); }, [router]);

  function edit(item) {
    setEditing(item.id);
    setForm({ title: item.title, description: item.description || "", start_date: item.start_date, local_time: item.local_time.slice(0,5), frequency: item.frequency, weekdays: item.weekdays || [], end_date: item.end_date || "", duration_minutes: item.duration_minutes ?? "", priority: item.priority, category: item.category, reminder_offsets: (item.reminder_offsets || []).join(", ") });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    const payload = { ...form, description: form.description || null, end_date: form.end_date || null, duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null, weekdays: form.frequency === "daily" ? [] : form.weekdays, reminder_offsets: form.reminder_offsets.split(",").map((v) => v.trim()).filter(Boolean).map(Number) };
    try {
      if (editing) await updateRecurringSchedule(editing, payload); else await createRecurringSchedule(payload);
      setEditing(null); setForm({ ...emptyForm, start_date: form.start_date }); await reload();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function stop(id) {
    setError("");
    try { await stopRecurringSchedule(id); await reload(); } catch (err) { setError(err.message); }
  }

  if (!items) return <main className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">Getting your repeating tasks…</main>;
  const input = "app-field mt-1.5";
  return <main className="app-page app-page-medium space-y-5">
    <header className="app-page-header"><div><p className="app-page-eyebrow">A helpful rhythm</p><h1 className="app-page-title">Tasks that come back around</h1><p className="app-page-description">Set a routine once, and TimeMate will keep the schedule ready for you.</p></div></header>
    <form onSubmit={submit} className="recurring-form app-glass-card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
      <label className="sm:col-span-2">Task title<input required maxLength={200} className={input} placeholder="What would you like to make a habit?" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></label>
      <label>Description<input className={input} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label>
      <label>Start date<input required type="date" className={input} value={form.start_date} onChange={(e)=>setForm({...form,start_date:e.target.value})}/></label>
      <label>Time<input required type="time" className={input} value={form.local_time} onChange={(e)=>setForm({...form,local_time:e.target.value})}/></label>
      <label>Repeat<select className={input} value={form.frequency} onChange={(e)=>setForm({...form,frequency:e.target.value})}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="selected_days">Selected days</option></select></label>
      {form.frequency !== "daily" && <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-medium">Weekdays</legend><div className="flex flex-wrap gap-3">{days.map(([day,label])=><label key={day} className="flex items-center gap-1"><input type="checkbox" checked={form.weekdays.includes(day)} onChange={(e)=>setForm({...form,weekdays:e.target.checked?[...form.weekdays,day]:form.weekdays.filter((v)=>v!==day)})}/>{label}</label>)}</div></fieldset>}
      <label>End date (optional)<input type="date" min={form.start_date} className={input} value={form.end_date} onChange={(e)=>setForm({...form,end_date:e.target.value})}/></label>
      <label>Duration in minutes<input type="number" min="1" max="1440" className={input} value={form.duration_minutes} onChange={(e)=>setForm({...form,duration_minutes:e.target.value})}/></label>
      <label>Priority<select className={input} value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value})}><option>low</option><option>medium</option><option>high</option></select></label>
      <label>Category<select className={input} value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})}>{["Personal","Work","Study","Health"].map((v)=><option key={v}>{v}</option>)}</select></label>
      <label className="sm:col-span-2">Reminder offsets in minutes, comma separated<input placeholder="30, 5" className={input} value={form.reminder_offsets} onChange={(e)=>setForm({...form,reminder_offsets:e.target.value})}/></label>
      {error && <p role="alert" className="app-message is-error sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-3 pt-1 sm:col-span-2"><button disabled={busy} className="app-primary-button">{busy ? "Saving your routine…" : editing ? "Save changes" : "Create routine"}</button>{editing && <button type="button" onClick={()=>{setEditing(null);setForm({...emptyForm,start_date:form.start_date});}} className="app-secondary-button">Cancel</button>}</div>
    </form>
    <section className="space-y-3"><div className="flex items-end justify-between gap-3"><div><p className="app-page-eyebrow">Your routines</p><h2 className="mt-1 text-xl">A rhythm that works for you</h2></div><span className="text-xs text-gray-500">{items.length} {items.length === 1 ? "routine" : "routines"}</span></div>{items.length === 0 ? <div className="app-glass-card px-5 py-10 text-center"><p className="text-lg">Start with one small routine</p><p className="mt-2 text-sm text-gray-500">Your active repeating tasks will appear here.</p></div> : items.map((item)=><article key={item.id} className="app-glass-card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{item.title}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{item.is_active ? "Active" : "Paused"}</span></div><p className="mt-1 text-xs capitalize text-gray-500">{item.frequency.replace("_", " ")} · {item.start_date} at {item.local_time.slice(0,5)} ({item.timezone}){item.end_date ? ` · ends ${item.end_date}` : ""}</p><p className="mt-1 text-xs text-gray-500">{item.frequency !== "daily" ? item.weekdays.map((d)=>days[d][1]).join(", ") : "Every day"}</p></div>{item.is_active && <div className="flex gap-2"><button onClick={()=>edit(item)} className="app-secondary-button min-h-9 px-3">Edit</button><button onClick={()=>stop(item.id)} className="app-danger-button min-h-9 px-3">Pause routine</button></div>}</article>)}</section>
  </main>;
}
