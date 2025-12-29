const API_URL = "http://localhost:5000";

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
};
