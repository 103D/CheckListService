import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";

export default function AuthPage({ apiBaseUrl, onLogin, notify }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const data = await apiRequest({
        apiBaseUrl,
        path: "/auth/login",
        method: "POST",
        isForm: true,
        body: loginForm,
      });

      onLogin(data.access_token);
      notify("success", "Вход выполнен");
      const role = getRoleFromToken(data.access_token);
      navigate(role === "ADMIN" ? "/ratings" : "/branches");
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Employee Rating</h1>
        <p className="muted">Вход по никнейму. Регистрация доступна только через API.</p>

        {error ? <div className="notice error">{error}</div> : null}

        <div className="auth-forms">
          <form onSubmit={handleLogin} className="panel form-stack">
            <h2>Логин</h2>
            <input
              placeholder="Никнейм"
              type="text"
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, username: e.target.value }))
              }
              required
            />
            <input
              placeholder="Пароль"
              type="password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, password: e.target.value }))
              }
              required
            />
            <button type="submit">Войти</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function getRoleFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.role || payload?.user_role || payload?.user?.role || null;
  } catch {
    return null;
  }
}
