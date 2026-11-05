"use client";

import { useState } from "react";
import { updateTask } from "@/services/api";

function toInputValue(iso, timeZone) {
  // "2026-11-05 14:30:00" -> "2026-11-05T14:30" in the user's time zone
  return new Date(iso)
    .toLocaleString("sv-SE", { timeZone })
    .slice(0, 16)
    .replace(" ", "T");
}

export default function EditTaskForm({ task, timeZone, onSaved, onCancel }) {
  const initialStart = toInputValue(task.start_at, timeZone);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || "",
    start: initialStart,
    duration: task.duration_minutes ? String(task.duration_minutes) : "",
    priority: task.priority,
    category: task.category,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        duration_minutes: form.duration ? Number(form.duration) : null,
        priority: form.priority,
        category: form.category,
      };
      if (form.start !== initialStart) body.start_at = form.start;
      await updateTask(task.id, body);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2";
  const label = "mb-1 block text-sm font-medium";

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div>
        <label htmlFor={`title-${task.id}`} className={label}>Title</label>
        <input id={`title-${task.id}`} required value={form.title} onChange={(e) => update("title", e.target.value)} className={input} />
      </div>

      <div>
        <label htmlFor={`desc-${task.id}`} className={label}>Description</label>
        <textarea id={`desc-${task.id}`} rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} className={input} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`start-${task.id}`} className={label}>Date and time</label>
          <input id={`start-${task.id}`} type="datetime-local" required value={form.start} onChange={(e) => update("start", e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor={`dur-${task.id}`} className={label}>Duration (minutes)</label>
          <input id={`dur-${task.id}`} type="number" min="1" max="1440" value={form.duration} onChange={(e) => update("duration", e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor={`pri-${task.id}`} className={label}>Priority</label>
          <select id={`pri-${task.id}`} value={form.priority} onChange={(e) => update("priority", e.target.value)} className={input}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label htmlFor={`cat-${task.id}`} className={label}>Category</label>
          <select id={`cat-${task.id}`} value={form.category} onChange={(e) => update("category", e.target.value)} className={input}>
            <option>Study</option>
            <option>Work</option>
            <option>Personal</option>
            <option>Health</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}