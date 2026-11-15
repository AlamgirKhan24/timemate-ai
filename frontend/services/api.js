const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function saveToken(token) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export async function logoutUser() {
  try {
    await request("/auth/logout", { method: "POST" });
  } catch {
    // Clear the browser session even if the backend cannot be reached.
  } finally {
    clearToken();
  }
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof data?.detail === "string"
      ? data.detail
      : Array.isArray(data?.detail)
        ? data.detail.map((item) => item.msg).filter(Boolean).join("; ")
        : "Something went wrong";
    throw new Error(message);
  }
  return data;
}

export function registerUser(body) {
  return request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function loginUser(email, password) {
  const form = new URLSearchParams({ username: email, password });
  const data = await request("/auth/login", { method: "POST", body: form });
  saveToken(data.access_token);
  return data;
}

export const getMe = () => request("/users/me");

export const getTasks = (start, end) => {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const query = params.toString();
  return request(`/tasks${query ? `?${query}` : ""}`);
};

export const getCalendar = (start, end) => {
  const params = new URLSearchParams({ start, end });
  return request(`/calendar?${params.toString()}`);
};

export const getOverview = () => request("/overview/summary");

export const createTask = (body) =>
  request("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const updateTask = (id, body) =>
  request(`/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const deleteTask = (id) => request(`/tasks/${id}`, { method: "DELETE" });

export const getWhatsAppSettings = () => request("/whatsapp/settings");

export const connectWhatsApp = (body) =>
  request("/whatsapp/connect", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const disconnectWhatsApp = () =>
  request("/whatsapp/disconnect", { method: "DELETE" });

export const getNotifications = (limit = 50) => request(`/notifications?limit=${limit}`);
export const getReminders = () => request("/reminders");

export const createReminder = (taskId, offsetMinutes) =>
  request("/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_id: taskId, offset_minutes: offsetMinutes }),
  });

export const retryReminder = (reminderId) =>
  request(`/reminders/${reminderId}/retry`, { method: "POST" });

export const requestWhatsAppVerification = () =>
  request("/whatsapp/verify", { method: "POST" });

export const verifyWhatsAppCode = (code) =>
  request("/whatsapp/verify/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

export const updateMe = (body) =>
  request("/users/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const deleteMe = (password) =>
  request("/users/me", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

export const getRecurringSchedules = () => request("/recurring");

export const createRecurringSchedule = (body) =>
  request("/recurring", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const updateRecurringSchedule = (id, body) =>
  request(`/recurring/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const stopRecurringSchedule = (id) =>
  request(`/recurring/${id}/stop`, { method: "POST" });

export const getProductivityReport = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return request(`/reports/productivity${query.size ? `?${query}` : ""}`);
};

export const createAssistantDraft = (instruction) =>
  request("/assistant/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction }),
  });

export const confirmAssistantDraft = (draft) =>
  request("/assistant/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...draft, confirmed: true }),
  });

export const getAssistantToday = () => request("/assistant/today");

export const requestAssistantPlan = (body) =>
  request("/assistant/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const transcribeAudio = (file, confirmed) => {
  const form = new FormData();
  form.set("audio", file);
  form.set("confirm_audio_sharing", String(confirmed));
  return request("/assistant/transcribe", { method: "POST", body: form });
};
