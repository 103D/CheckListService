import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import DataTable from "../components/DataTable";

function getUserRole(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.role || null;
  } catch {
    return null;
  }
}

export default function BranchesPage({ apiBaseUrl, token, notify }) {
  const branchOptions = ["Амир", "Достык", "Сейфуллина", "Лассио", "Рахат"];
  const [name, setName] = useState("Амир");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const userRole = getUserRole(token);

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Название" },
  ];

  const loadBranches = async () => {
    setError("");
    try {
      const data = await apiRequest({
        apiBaseUrl,
        path: "/branches/",
        token,
      });
      setRows(data);
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await apiRequest({
        apiBaseUrl,
        path: "/branches/",
        method: "POST",
        token,
        body: { name },
      });
      setName("");
      await loadBranches();
      notify("success", "Филиал создан");
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Филиалы</h2>
        <button type="button" onClick={loadBranches}>
          Обновить
        </button>
      </div>

      {userRole === "ADMIN" && (
        <form onSubmit={handleCreate} className="inline-form">
          <select
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          >
            {branchOptions.map((branchName) => (
              <option key={branchName} value={branchName}>
                {branchName}
              </option>
            ))}
          </select>
          <button type="submit">Создать</button>
        </form>
      )}

      {error ? <div className="notice error">{error}</div> : null}
      <DataTable columns={columns} rows={rows} emptyText="Филиалов пока нет" />
    </section>
  );
}
