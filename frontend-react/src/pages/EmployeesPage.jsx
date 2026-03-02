import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import DataTable from "../components/DataTable";

export default function EmployeesPage({ apiBaseUrl, token, notify }) {
  const [form, setForm] = useState({ name: "", branch_id: "" });
  const [branches, setBranches] = useState([]);
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

  const loadBranches = async () => {
    setError("");
    try {
      const data = await apiRequest({
        apiBaseUrl,
        path: "/branches/",
        token,
      });
      setBranches(data);
      if (data.length > 0) {
        const firstId = Number(data[0].id);
        setForm((prev) => ({
          ...prev,
          branch_id: prev.branch_id || firstId,
        }));
      }
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  useEffect(() => {
    loadBranches();
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
      setForm((prev) => ({ ...prev, name: "" }));
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
        <select
          value={form.branch_id}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, branch_id: Number(e.target.value) }))
          }
          required
        >
          {branches.length === 0 ? <option value="">Нет филиалов</option> : null}
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <button type="submit">Создать</button>
      </form>

      {error ? <div className="notice error">{error}</div> : null}
      <DataTable columns={columns} rows={rows} emptyText="Сотрудников пока нет" />
    </section>
  );
}
