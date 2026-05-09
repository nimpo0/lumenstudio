import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { subscribeToAuth, logIn, logOut, signUp, logInWithGoogle } from "./authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    setAuthLoading(true);
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub?.();
  }, []);

  const value = useMemo(() => ({
    user,
    authLoading,
    login: async (email, pass) => {
      const u = await logIn(email, pass);
      setUser(u);
      return u;
    },
    signup: async (email, pass, name) => {
      const u = await signUp(email, pass, name);
      setUser(u);
      return u;
    },
    loginWithGoogle: async () => {
      const u = await logInWithGoogle();
      setUser(u);
      return u;
    },
    logout: async () => {
      await logOut();
      setUser(null);
    }
  }), [user, authLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth повинен використовуватись всередині AuthProvider");
  return ctx;
}
