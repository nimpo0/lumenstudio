const API_URL = "https://nimpo0-github-io.onrender.com";
const TOKEN_KEY = "lumen_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function api(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let data = null;
  try { data = await res.json(); } catch (_) {}

  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const adminApi = {
  stats: () => api("/api/admin/stats"),

  photographers: {
    list: () => api("/api/admin/photographers"),
    create: (payload) => api("/api/admin/photographers", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, patch) => api(`/api/admin/photographers/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    remove: (id) => api(`/api/admin/photographers/${id}`, { method: "DELETE" }),
  },

  services: {
    list: () => api("/api/admin/services"),
    create: (payload) => api("/api/admin/services", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, patch) => api(`/api/admin/services/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    remove: (id) => api(`/api/admin/services/${id}`, { method: "DELETE" }),
  },

  studios: {
    list: () => api("/api/admin/studios"),
    create: (payload) => api("/api/admin/studios", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, patch) => api(`/api/admin/studios/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    remove: (id) => api(`/api/admin/studios/${id}`, { method: "DELETE" }),
  },
};
