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

export const photographerApi = {
  me: () => api("/api/photographer/me"),
  updateMe: (patch) => api("/api/photographer/me", { method: "PATCH", body: JSON.stringify(patch) }),
  stats: () => api("/api/photographer/stats"),

  bookings: {
    list: () => api("/api/photographer/bookings"),
    setStatus: (id, status) =>
      api(`/api/photographer/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  },

  blocks: {
    list: () => api("/api/photographer/blocks"),
    create: (payload) => api("/api/photographer/blocks", { method: "POST", body: JSON.stringify(payload) }),
    remove: (id) => api(`/api/photographer/blocks/${id}`, { method: "DELETE" }),
  },

  albums: {
    list: () => api("/api/photographer/albums"),
    update: (id, patch) => api(`/api/photographer/albums/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  },
};
