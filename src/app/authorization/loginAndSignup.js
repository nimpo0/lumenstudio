import React, { useEffect, useRef, useState } from "react";
import { signInWithGoogleSupabase } from "../supabase";
import "./loginAndSignup.css";

const LoginAndSignup = ({ isOpen, onClose, onLogin, onSignUp, onGoogleLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && isOpen) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setErrorText("");
      setLoading(false);
      setIsLogin(true);
      setTimeout(() => {
        dialogRef.current?.querySelector("input")?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleFormSwitch = () => {
    setErrorText("");
    setIsLogin((v) => !v);
  };

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("ls-modal-overlay")) onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorText("");
    setLoading(true);

    const email = event.target.email.value.trim();
    const password = event.target.password.value;
    const name = event.target.name?.value?.trim();

    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        await onSignUp(email, password, name);
      }
      onClose?.();
    } catch (err) {
      const status = err?.status;
      let msg = "Щось пішло не так. Спробуйте ще раз.";

      if (status === 401) msg = "Невірний email або пароль.";
      if (status === 409) msg = "Цей email вже зареєстрований.";
      if (status === 400) msg = "Перевірте введені дані.";

      setErrorText(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ls-modal-overlay" onMouseDown={handleBackdropClick}>
      <div className="ls-modal" ref={dialogRef} role="dialog" aria-modal="true">
        <button className="ls-close" onClick={onClose} aria-label="Закрити">
          ✕
        </button>

        <div className="ls-modal-header">
          <div className="ls-kicker">Lumen Studio</div>
          <h5 className="ls-title">{isLogin ? "Увійти" : "Зареєструватися"}</h5>
        </div>

        <form onSubmit={handleSubmit} className="ls-form">
          {!isLogin && (
            <div className="ls-field">
              <label htmlFor="name">Імʼя (необов’язково)</label>
              <input id="name" name="name" type="text" placeholder="Анна" />
            </div>
          )}

          <div className="ls-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="anna@email.com" />
          </div>

          <div className="ls-field">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Мінімум 6 символів"
            />
          </div>

          {errorText && <div className="ls-error">{errorText}</div>}

          <button className="ls-submit" type="submit" disabled={loading}>
            {loading ? "Зачекайте…" : isLogin ? "Увійти" : "Зареєструватися"}
          </button>

          <>
              <div className="ls-divider"><span>або</span></div>
              <button
                type="button"
                className="ls-google-btn"
                disabled={loading}
                onClick={async () => {
                  setErrorText("");
                  setLoading(true);
                  try {
                    await signInWithGoogleSupabase();
                  } catch (err) {
                    console.error("Google auth error:", err);
                    setErrorText(err?.message || String(err) || "Помилка Google входу");
                    setLoading(false);
                  }
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Увійти через Google
              </button>
          </>

          <div className="ls-switch">
            <span className="ls-switch-text">
              {isLogin ? "Ще не зареєстровані?" : "Вже маєте акаунт?"}
            </span>
            <button type="button" className="ls-switch-btn" onClick={handleFormSwitch}>
              {isLogin ? "Створити акаунт" : "Увійти"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginAndSignup;
