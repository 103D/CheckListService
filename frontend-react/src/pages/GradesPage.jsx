import { useState } from "react";
import { apiRequest } from "../api/client";
import DataTable from "../components/DataTable";

export default function GradesPage({ apiBaseUrl, token, notify }) {
  const [createForm, setCreateForm] = useState({
    employee_id: 1,
    value: 100,
    role_in_shift: "",
    comment: "",
  });
  const [employeeId, setEmployeeId] = useState(1);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const columns = [
    { key: "id", label: "ID" },
    { key: "employee_id", label: "Сотрудник" },
    { key: "manager_id", label: "Менеджер" },
    { key: "value", label: "Оценка" },
    { key: "role_in_shift", label: "Роль" },
    { key: "comment", label: "Комментарий" },
    { key: "created_at", label: "Дата" },
  ];

  const loadByEmployee = async () => {
    setError("");
    try {
      const data = await apiRequest({
        apiBaseUrl,
        path: `/grades/employee/${Number(employeeId)}`,
        token,
      });
      setRows(data);
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await apiRequest({
        apiBaseUrl,
        path: "/grades/",
        method: "POST",
        token,
        body: {
          employee_id: Number(createForm.employee_id),
          value: Number(createForm.value),
          role_in_shift: createForm.role_in_shift,
          comment: createForm.comment || null,
        },
      });
      setCreateForm((prev) => ({ ...prev, value: 100, comment: "" }));
      await loadByEmployee();
      notify("success", "Оценка добавлена");
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  const handleLoad = async (event) => {
    event.preventDefault();
    await loadByEmployee();
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Оценки</h2>
      </div>

      <form onSubmit={handleCreate} className="inline-form wrap">
        <input
          type="number"
          min="1"
          placeholder="ID сотрудника"
          value={createForm.employee_id}
          onChange={(e) =>
            setCreateForm((prev) => ({ ...prev, employee_id: e.target.value }))
          }
          required
        />
        <input
          type="number"
          min="1"
          max="100"
          placeholder="Оценка"
          value={createForm.value}
          onChange={(e) =>
            setCreateForm((prev) => ({ ...prev, value: e.target.value }))
          }
          required
        />
        <input
          type="text"
          placeholder="Роль в смене"
          value={createForm.role_in_shift}
          onChange={(e) =>
            setCreateForm((prev) => ({ ...prev, role_in_shift: e.target.value }))
          }
          required
        />
        <input
          type="text"
          placeholder="Комментарий"
          value={createForm.comment}
          onChange={(e) =>
            setCreateForm((prev) => ({ ...prev, comment: e.target.value }))
          }
        />
        <button type="submit">Добавить оценку</button>
      </form>

      <form onSubmit={handleLoad} className="inline-form">
        <input
          type="number"
          min="1"
          placeholder="ID сотрудника"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          required
        />
        <button type="submit">Показать оценки сотрудника</button>
      </form>

      {error ? <div className="notice error">{error}</div> : null}
      <DataTable columns={columns} rows={rows} emptyText="Оценок пока нет" />
    </section>
  );
}
