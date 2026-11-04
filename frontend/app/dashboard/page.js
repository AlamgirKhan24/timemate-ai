"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TaskForm from "@/components/TaskForm";
import { clearToken, deleteTask, getMe, getTasks, updateTask } from "@/services/api";

const priorityStyle = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

function dayKey(date, timeZone) {
  return new Date(date).toLocaleDateString("en-CA", { timeZone });
}

function formatTime(iso, timeZone) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);

  const load = useCallback(async () => {
    const [me, list] = await Promise.all([getMe(), getTasks()]);
    setUser(me);
    setTasks(list);
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

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  const groups = groupTasks(tasks, user.timezone);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
        <button onClick={handleLogout} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
          Log out
        </button>
      </div>

      <TaskForm onCreated={load} />

      {Object.entries(groups).map(([name, list]) => (
        <section key={name}>
          <h2 className="mb-2 text-lg font-semibold">
            {name} <span className="text-sm font-normal text-gray-500">({list.length})</span>
          </h2>
          {list.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing here.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((task) => (
                <li key={task.id} className="flex items-start justify-between gap-3 rounded-xl bg-white p-4 shadow">
                  <div>
                    <p className={`font-medium ${task.status === "completed" ? "line-through text-gray-400" : ""}`}>
                      {task.title}
                    </p>
                    <p className="text-sm text-gray-600">{formatTime(task.start_at, user.timezone)}</p>
                    {task.description && <p className="mt-1 text-sm text-gray-500">{task.description}</p>}
                    <div className="mt-2 flex gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 ${priorityStyle[task.priority]}`}>{task.priority}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{task.category}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 text-sm">
                    <button onClick={() => toggleDone(task)} className="rounded-lg border border-gray-300 px-3 py-1">
                      {task.status === "completed" ? "Undo" : "Done"}
                    </button>
                    <button onClick={() => remove(task)} className="rounded-lg border border-red-300 px-3 py-1 text-red-600">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
