const API_URL = "https://nimpo0-github-io.onrender.com";
const TOKEN_KEY = "lumen_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
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

export async function signUp(email, password, displayName) {
  const data = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name: displayName }),
  });

  setToken(data.token);
  return data.user;
}

export async function logIn(email, password) {
  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  setToken(data.token);
  return data.user;
}

export async function logOut() {
  setToken(null);
}

export async function getMe() {
  return api("/api/auth/me", { method: "GET" });
}

export function subscribeToAuth(callback) {
  let cancelled = false;

  (async () => {
    const token = getToken();
    if (!token) {
      callback(null);
      return;
    }
    try {
      const me = await getMe();
      if (!cancelled) callback(me);
    } catch (e) {
      setToken(null);
      if (!cancelled) callback(null);
    }
  })();

  return () => { cancelled = true; };
}

export const authToken = { getToken, setToken };
