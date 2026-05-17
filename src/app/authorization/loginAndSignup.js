import React, { useEffect, useRef, useState } from "react";
import "./loginAndSignup.css";

const LoginAndSignup = ({ isOpen, onClose, onLogin, onSignUp }) => {
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
