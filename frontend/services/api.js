const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof data?.detail === "string" ? data.detail : "Something went wrong";
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
