"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearToken,
  confirmAssistantDraft,
  createAssistantDraft,
  getAssistantToday,
  getMe,
  requestAssistantPlan,
  transcribeAudio,
} from "@/services/api";

function localDate(timezone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function friendlyError(message) {
  if (/HTTP 429/.test(message)) {
    return "The AI service has reached an account or usage limit. Check your API billing and usage limits, then try again.";
  }
  if (/HTTP 401|HTTP 403/.test(message)) {
    return "The AI service could not verify its access. Check the API key and model settings, then restart the backend.";
  }
  if (/not configured/i.test(message)) {
    return "The AI assistant needs a provider URL, API key, and model configured on the backend before it can help.";
  }
  if (/Could not connect to the AI provider/i.test(message)) {
    return "TimeMate couldn’t reach the AI service. Check the backend connection and try again.";
  }
  return message;
}

function toLocalInput(iso, timezone) {
  if (!iso) return "";
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const fieldClass = "mt-1.5 w-full rounded-xl border border-gray-300 bg-gray-50/70 px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15";
const cardClass = "rounded-3xl border border-gray-200/80 bg-white/80 p-5 shadow-lg shadow-black/[0.04] backdrop-blur-xl sm:p-6";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/15 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";
const secondaryButtonClass = "inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-300 bg-white/70 px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

function SectionTitle({ eyebrow, title, children }) {
  return <div className="mb-5">
    {eyebrow && <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">{eyebrow}</p>}
    <h2 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h2>
    {children && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-600">{children}</p>}
  </div>;
}

export default function AssistantPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState(null);
  const [today, setToday] = useState(null);
  const [plan, setPlan] = useState(null);
  const [minutes, setMinutes] = useState(240);
  const [shareDetails, setShareDetails] = useState(false);
  const [audioConsent, setAudioConsent] = useState(false);
  const [audio, setAudio] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getMe().then(setUser).catch(() => {
      clearToken();
      router.replace("/login");
    });
  }, [router]);

  function showError(err) {
    setError(friendlyError(err.message || "Something went wrong. Please try again."));
  }

  async function makeDraft(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await createAssistantDraft(instruction);
      setDraft({ ...data.draft, start_at: toLocalInput(data.draft.start_at, data.timezone) });
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await confirmAssistantDraft({ ...draft, start_at: draft.start_at || null });
      setNotice(`Your task “${data.task.title}” is saved.`);
      setDraft(null);
      setInstruction("");
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function loadToday() {
    setBusy(true);
    setError("");
    try {
      setToday(await getAssistantToday());
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function makePlan() {
    if (!shareDetails) {
      setError("Please confirm before sharing today’s task details for a suggested plan.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setPlan(await requestAssistantPlan({
        day: localDate(user.timezone),
        available_minutes: Number(minutes),
        confirm_share_task_details: true,
      }));
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function transcribe() {
    if (!audio || !audioConsent) {
      setError("Choose a voice note and confirm that it can be sent for transcription.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await transcribeAudio(audio, audioConsent);
      setInstruction(result.transcript);
      setNotice("Your voice note is now text. Review or edit it before creating a task.");
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  if (!user) return <main className="mx-auto max-w-5xl p-8 text-center text-gray-600">Getting your assistant ready…</main>;

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 pb-28 sm:px-7 lg:py-10">
    <header className="relative isolate overflow-hidden rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-blue-50/80 p-6 shadow-xl shadow-blue-950/[0.04] sm:p-9">
      <div className="pointer-events-none absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full bg-blue-200/35 blur-3xl" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/75 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm"><span aria-hidden="true">✦</span> Your TimeMate assistant</span>
        <span className="rounded-full bg-gray-100/80 px-3 py-1.5 text-xs text-gray-600">Here to make planning easier</span>
      </div>
      <h1 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-gray-950 sm:text-4xl">Tell me what’s on your mind.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">I can turn a quick note into a task, help you map out today, or make a voice note easier to use. You stay in control before anything is saved.</p>
    </header>

    {notice && <div role="status" className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-800">{notice}</div>}
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">{error}</div>}

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
      <section className={cardClass}>
        <SectionTitle eyebrow="Start with a thought" title="Create a task" >Write it the way you’d say it. I’ll prepare a draft for you to check.</SectionTitle>
        <form onSubmit={makeDraft} className="space-y-4">
          <label className="block text-sm font-medium text-gray-800" htmlFor="assistant-instruction">What would you like to remember?
            <textarea id="assistant-instruction" rows={4} className={`${fieldClass} resize-y`} value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="For example: remind me to call the dentist tomorrow at 10 in the morning" />
          </label>
          <div className="flex flex-wrap gap-2">
            {["Plan a study session tomorrow", "Remind me to call my family tonight"].map((example) => <button key={example} type="button" onClick={() => setInstruction(example)} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">{example}</button>)}
          </div>

          <details className="group rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-gray-800 marker:content-none">Add a voice note <span className="ml-1 text-xs font-normal text-gray-500">(optional)</span></summary>
            <div className="mt-4 space-y-3">
              <label className="block text-xs leading-5 text-gray-600" htmlFor="assistant-audio">Choose an audio recording. It will be transcribed so you can review the words before using them.</label>
              <input id="assistant-audio" type="file" accept="audio/*" onChange={(event) => setAudio(event.target.files?.[0] || null)} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-gray-700 file:shadow-sm" />
              {audio && <p className="text-xs text-gray-500">Selected: {audio.name}</p>}
              <label className="flex items-start gap-2.5 text-xs leading-5 text-gray-600"><input type="checkbox" checked={audioConsent} onChange={(event) => setAudioConsent(event.target.checked)} className="mt-0.5 accent-blue-600" /><span>I agree to send this audio to the configured AI service for transcription.</span></label>
              <button type="button" disabled={busy || !audio || !audioConsent} onClick={transcribe} className={secondaryButtonClass}>Transcribe voice note</button>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button disabled={busy || instruction.trim().length < 3} className={buttonClass}>{busy ? "Putting your draft together…" : "Prepare my task"}<span aria-hidden="true">→</span></button>
            <span className="text-xs text-gray-500">Nothing is saved until you confirm.</span>
          </div>
        </form>

        {draft && <div className="mt-6 space-y-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Your draft</p><h3 className="mt-1 text-lg font-semibold text-gray-900">Take a look before saving</h3></div>
          {draft.needs_clarification?.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-medium">A quick question before I can finish:</p><ul className="mt-1 list-disc pl-5">{draft.needs_clarification.map((question, index) => <li key={index}>{question}</li>)}</ul></div>}
          <label className="block text-sm font-medium text-gray-800">Task name<input className={fieldClass} value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></label>
          <label className="block text-sm font-medium text-gray-800">When <span className="font-normal text-gray-500">({user.timezone})</span><input type="datetime-local" className={fieldClass} value={draft.start_at || ""} onChange={(event) => setDraft({ ...draft, start_at: event.target.value, needs_clarification: [] })} /></label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium text-gray-800">Duration<input type="number" min="1" max="1440" placeholder="Minutes" className={fieldClass} value={draft.duration_minutes ?? ""} onChange={(event) => updateDraft("duration_minutes", event.target.value ? Number(event.target.value) : null)} /></label>
            <label className="text-sm font-medium text-gray-800">Priority<select className={fieldClass} value={draft.priority} onChange={(event) => updateDraft("priority", event.target.value)}>{["low", "medium", "high"].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="text-sm font-medium text-gray-800">Category<select className={fieldClass} value={draft.category} onChange={(event) => updateDraft("category", event.target.value)}>{["Personal", "Work", "Study", "Health"].map((value) => <option key={value}>{value}</option>)}</select></label>
          </div>
          <label className="block text-sm font-medium text-gray-800">Remind me this many minutes before <span className="font-normal text-gray-500">(optional)</span><input type="number" min="0" max="10080" placeholder="Leave blank for no reminder" className={fieldClass} value={draft.reminder_offset_minutes ?? ""} onChange={(event) => updateDraft("reminder_offset_minutes", event.target.value === "" ? null : Number(event.target.value))} /></label>
          <button disabled={busy || !draft.start_at || draft.needs_clarification?.length > 0} onClick={saveDraft} className={buttonClass}>{busy ? "Saving your task…" : "Looks good — save task"}</button>
        </div>}
      </section>

      <div className="space-y-5">
        <section className={cardClass}>
          <SectionTitle eyebrow="A quick check-in" title="How’s today going?">See your schedule at a glance. Your task details stay here.</SectionTitle>
          <button disabled={busy} onClick={loadToday} className={secondaryButtonClass}>{today ? "Refresh today’s summary" : "Show me today"}</button>
          {today && <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[[today.pending_today_count, "To do"], [today.completed_today_count, "Done"], [today.overdue_count, "Overdue"]].map(([count, label]) => <div key={label} className="rounded-xl bg-gray-50 px-3 py-3 text-center"><p className="text-xl font-semibold text-gray-900">{count}</p><p className="mt-0.5 text-xs text-gray-500">{label}</p></div>)}
            </div>
            {today.today_tasks?.length ? <ul className="space-y-2">{today.today_tasks.map((task) => <li key={task.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5 text-sm"><span className="font-medium text-gray-800">{task.title}</span><span className="shrink-0 text-xs capitalize text-gray-500">{task.status}</span></li>)}</ul> : <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">No tasks on your schedule today. Enjoy the breathing room.</p>}
          </div>}
        </section>

        <section className={cardClass}>
          <SectionTitle eyebrow="Make a little room" title="Plan my day">Get a suggested order for your tasks based on the time you have.</SectionTitle>
          <label className="block text-sm font-medium text-gray-800">Time available<input type="number" min="1" max="1440" className={fieldClass} value={minutes} onChange={(event) => setMinutes(event.target.value)} /><span className="mt-1 block text-xs font-normal text-gray-500">Minutes you’d like to set aside</span></label>
          <label className="mt-4 flex items-start gap-2.5 text-xs leading-5 text-gray-600"><input type="checkbox" checked={shareDetails} onChange={(event) => setShareDetails(event.target.checked)} className="mt-0.5 accent-blue-600" /><span>It’s okay to share today’s task names and schedule with the AI service to make a plan.</span></label>
          <button disabled={busy || !shareDetails} onClick={makePlan} className={`${secondaryButtonClass} mt-4 w-full`}>Suggest a gentle plan</button>
          {plan && <div className="mt-4 space-y-2 border-t border-gray-200 pt-4"><p className="text-sm font-medium text-gray-800">Your suggested plan for {plan.day}</p>{(plan.plan.items || []).map((item) => <div key={item.task_id} className="rounded-xl bg-gray-50 p-3"><p className="text-sm font-medium text-gray-800">{item.suggested_start} · Task #{item.task_id}</p><p className="mt-1 text-xs leading-5 text-gray-600">{item.reason}</p></div>)}{plan.plan.unplanned_task_ids?.length > 0 && <p className="text-xs text-gray-500">A few tasks didn’t fit in the time available.</p>}</div>}
        </section>
      </div>
    </div>
  </main>;
}
