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

export const bookingsApi = {
  create(payload) {
    return api("/api/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listMy() {
    return api("/api/bookings", { method: "GET" });
  },

  remove(id) {
    return api(`/api/bookings/${id}`, { method: "DELETE" });
  },

  reschedule(id, { date, time }) {
    return api(`/api/bookings/${id}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify({ date, time }),
    });
  },

  pay(id, { method }) {
    return api(`/api/bookings/${id}/pay`, {
      method: "POST",
      body: JSON.stringify({ method }),
    });
  },
};
