const API_URL = "https://nimpo0-github-io.onrender.com";

async function get(path) {
  const res = await fetch(`${API_URL}${path}`);
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

export const dataApi = {
  portfolio: () => get("/api/data/portfolio"),
  services: () => get("/api/data/services"),
  photographers: () => get("/api/data/photographers"),
  studios: () => get("/api/data/studios"),
};
