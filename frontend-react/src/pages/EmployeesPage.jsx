import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import DataTable from "../components/DataTable";

export default function EmployeesPage({ apiBaseUrl, token, notify }) {
  const [form, setForm] = useState({ name: "", branch_id: 1 });
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Имя" },
    { key: "branch_id", label: "Филиал" },
  ];

  const loadEmployees = async () => {
    setError("");
    try {
      const data = await apiRequest({
        apiBaseUrl,
        path: "/employees/",
        token,
      });
      setRows(data);
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await apiRequest({
        apiBaseUrl,
        path: "/employees/",
        method: "POST",
        token,
        body: {
          name: form.name,
          branch_id: Number(form.branch_id),
        },
      });
      setForm({ name: "", branch_id: 1 });
      await loadEmployees();
      notify("success", "Сотрудник создан");
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Сотрудники</h2>
        <button type="button" onClick={loadEmployees}>
          Обновить
        </button>
      </div>

      <form onSubmit={handleCreate} className="inline-form">
        <input
          type="text"
          placeholder="Имя сотрудника"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
        <input
          type="number"
          min="1"
          placeholder="ID филиала"
          value={form.branch_id}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, branch_id: e.target.value }))
          }
          required
        />
        <button type="submit">Создать</button>
      </form>

      {error ? <div className="notice error">{error}</div> : null}
      <DataTable columns={columns} rows={rows} emptyText="Сотрудников пока нет" />
    </section>
  );
}
