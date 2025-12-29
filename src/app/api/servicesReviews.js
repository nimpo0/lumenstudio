const API_URL = "http://localhost:5000";
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

export const serviceReviewsApi = {
  list(serviceId) {
    return api(`/api/services-reviews/${serviceId}`, { method: "GET" });
  },
  save(payload) {
    return api("/api/services-reviews", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
