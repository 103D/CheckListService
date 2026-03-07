import { useEffect, useState } from "react";
import { FiLoader, FiUserPlus } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";

export default function SecretRegisterPage({ apiBaseUrl, notify }) {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    password2: "",
    role: "MANAGER",
    branch_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest({ apiBaseUrl, path: "/branches/" })
      .then((data) => setBranches(data))
      .catch(() => {});
  }, [apiBaseUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.password2) {
      setError("Пароли не совпадают");
      return;
    }
    if (!form.branch_id) {
      setError("Выберите филиал");
      return;
    }

    setLoading(true);
    try {
      await apiRequest({
        apiBaseUrl,
        path: "/auth/register",
        method: "POST",
        body: {
          username: form.username,
          password: form.password,
          role: form.role,
          branch_id: Number(form.branch_id),
        },
      });
      notify("success", "Аккаунт создан!");
      navigate("/auth");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background" aria-hidden="true" />
      <div className="auth-overlay" aria-hidden="true" />

      <div className="auth-modal" role="dialog" aria-modal="true">
        <h1>Регистрация</h1>
        <p className="muted">Создание нового аккаунта</p>

        {error ? <div className="notice error">{error}</div> : null}

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            placeholder="Логин (email)"
            type="text"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            required
          />
          <input
            placeholder="Пароль"
            type="password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required
            minLength={6}
          />
          <input
            placeholder="Подтвердите пароль"
            type="password"
            value={form.password2}
            onChange={(e) => setForm((p) => ({ ...p, password2: e.target.value }))}
            required
            minLength={6}
          />
          <select
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
          >
            <option value="MANAGER">Менеджер</option>
            <option value="ADMIN">Админ</option>
          </select>
          <select
            value={form.branch_id}
            onChange={(e) => setForm((p) => ({ ...p, branch_id: e.target.value }))}
            required
          >
            <option value="" disabled>Выберите филиал</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.city})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="icon-btn"
            aria-label="Создать аккаунт"
            title="Создать аккаунт"
          >
            {loading ? <FiLoader className="spin-icon" aria-hidden="true" /> : <FiUserPlus aria-hidden="true" />}
          </button>
        </form>
      </div>
    </div>
  );
}
