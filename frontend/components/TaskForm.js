"use client";

import { useState } from "react";
import { createTask } from "@/services/api";

const empty = {
  title: "",
  description: "",
  start: "",
  duration: "",
  priority: "medium",
  category: "Personal",
};

export default function TaskForm({ onCreated }) {
  const [form, setForm] = useState(empty);
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
      await createTask({
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_at: form.start,
        duration_minutes: form.duration ? Number(form.duration) : null,
        priority: form.priority,
        category: form.category,
      });
      setForm(empty);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2";
  const label = "mb-1 block text-sm font-medium";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-5 shadow">
      <h2 className="text-lg font-semibold">Add a task</h2>

      <div>
        <label htmlFor="title" className={label}>Title</label>
        <input id="title" required value={form.title} onChange={(e) => update("title", e.target.value)} className={input} />
      </div>

      <div>
        <label htmlFor="description" className={label}>Description</label>
        <textarea id="description" rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} className={input} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="start" className={label}>Date and time</label>
          <input id="start" type="datetime-local" required value={form.start} onChange={(e) => update("start", e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="duration" className={label}>Duration (minutes)</label>
          <input id="duration" type="number" min="1" max="1440" value={form.duration} onChange={(e) => update("duration", e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="priority" className={label}>Priority</label>
          <select id="priority" value={form.priority} onChange={(e) => update("priority", e.target.value)} className={input}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label htmlFor="category" className={label}>Category</label>
          <select id="category" value={form.category} onChange={(e) => update("category", e.target.value)} className={input}>
            <option>Study</option>
            <option>Work</option>
            <option>Personal</option>
            <option>Health</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-60">
        {saving ? "Saving..." : "Add task"}
      </button>
    </form>
  );
}
