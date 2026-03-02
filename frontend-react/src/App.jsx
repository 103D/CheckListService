import { useEffect, useState } from "react";
import {
    Navigate,
    NavLink,
    Outlet,
    Route,
    Routes,
    useNavigate,
} from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import BranchesPage from "./pages/BranchesPage";
import EmployeesPage from "./pages/EmployeesPage";
import GradesPage from "./pages/GradesPage";
import RatingsPage from "./pages/RatingsPage";
import UsersPage from "./pages/UsersPage";

function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(
    localStorage.getItem("apiBaseUrl") || "http://127.0.0.1:8001",
  );
  const [token, setToken] = useState(localStorage.getItem("accessToken") || "");
  const [toast, setToast] = useState(null);
  const [userRole, setUserRole] = useState(getRoleFromToken(localStorage.getItem("accessToken") || ""));

  const notify = (type, text) => {
    setToast({ type, text });
    window.clearTimeout(notify.timeoutId);
    notify.timeoutId = window.setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    localStorage.setItem("apiBaseUrl", apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("accessToken", token);
      setUserRole(getRoleFromToken(token));
    } else {
      localStorage.removeItem("accessToken");
      setUserRole(null);
    }
  }, [token]);

  return (
    <Routes>
      <Route
        path="/auth"
        element={<AuthPage apiBaseUrl={apiBaseUrl} onLogin={setToken} notify={notify} />}
      />

      <Route
        element={
          <ProtectedRoute token={token}>
            <AppLayout
              apiBaseUrl={apiBaseUrl}
              setApiBaseUrl={setApiBaseUrl}
              token={token}
              setToken={setToken}
              toast={toast}
              notify={notify}
            />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/branches" replace />} />
        <Route
          path="/branches"
          element={<BranchesPage apiBaseUrl={apiBaseUrl} token={token} notify={notify} />}
        />
        <Route
          path="/employees"
          element={<EmployeesPage apiBaseUrl={apiBaseUrl} token={token} notify={notify} />}
        />
        <Route
          path="/grades"
          element={<GradesPage apiBaseUrl={apiBaseUrl} token={token} notify={notify} />}
        />
        <Route
          path="/ratings"
          element={<RatingsPage apiBaseUrl={apiBaseUrl} token={token} notify={notify} />}
        />
        <Route
          path="/users"
          element={
            userRole === "ADMIN" ? (
              <UsersPage apiBaseUrl={apiBaseUrl} token={token} notify={notify} />
            ) : (
              <Navigate to="/branches" replace />
            )
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={token ? "/branches" : "/auth"} replace />} />
    </Routes>
  );
}

function AppLayout({ apiBaseUrl, setApiBaseUrl, token, setToken, toast, notify }) {
  const navigate = useNavigate();
  const [apiInput, setApiInput] = useState(apiBaseUrl);
  const role = getRoleFromToken(token);

  const saveApiUrl = () => {
    setApiBaseUrl(apiInput.trim().replace(/\/$/, ""));
    notify("success", "API URL сохранен");
  };

  const logout = () => {
    setToken("");
    notify("success", "Выход выполнен");
    navigate("/auth");
  };

  return (
    <div className="app-layout">
      <header className="topbar">
        <h1>Employee Rating Dashboard</h1>

        <div className="topbar-row">
          <input
            value={apiInput}
            onChange={(e) => setApiInput(e.target.value)}
            placeholder="API URL"
          />
          <button type="button" onClick={saveApiUrl}>
            Сохранить API URL
          </button>
          <button type="button" onClick={logout}>
            Выход
          </button>
        </div>

        <div className="topbar-row">
          <span>Токен: {token ? `${token.slice(0, 22)}...` : "не задан"}</span>
        </div>

        {toast ? <div className={`notice ${toast.type}`}>{toast.text}</div> : null}

        <nav className="nav">
          <NavLink to="/branches">Филиалы</NavLink>
          <NavLink to="/employees">Сотрудники</NavLink>
          <NavLink to="/grades">Оценки</NavLink>
          <NavLink to="/ratings">Рейтинги</NavLink>
          {role === "ADMIN" ? <NavLink to="/users">Пользователи</NavLink> : null}
        </nav>
      </header>

      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}

export default App;

function getRoleFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.role || payload?.user_role || payload?.user?.role || null;
  } catch {
    return null;
  }
}
