import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseSession } from "../supabase";
import { useAuth } from "../authorization/authContext";

const API_URL = "https://nimpo0-github-io.onrender.com";
const TOKEN_KEY = "lumen_token";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { login: setUserFromToken } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 800));

        const session = await getSupabaseSession();
        if (!session?.user?.email) {
          setError("Не вдалося отримати дані Google акаунту.");
          return;
        }

        const res = await fetch(`${API_URL}/api/auth/supabase-google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: session.user.email,
            name: session.user.user_metadata?.full_name || "",
            accessToken: session.access_token,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Помилка входу");

        localStorage.setItem(TOKEN_KEY, data.token);

        if (!cancelled) navigate("/", { replace: true });
      } catch (e) {
        if (!cancelled) setError(e.message || "Помилка Google входу");
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "crimson" }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ marginTop: 16 }}>
          На головну
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <p>Входимо через Google...</p>
    </div>
  );
};

export default AuthCallback;
