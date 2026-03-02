import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import DataTable from "../components/DataTable";

export default function GradesPage({ apiBaseUrl, token, notify }) {
  const shiftRoles = ["Кассир", "Продавец", "Официант", "Бариста"];

  const [createForm, setCreateForm] = useState({
    employee_id: "",
    value: 100,
    role_in_shift: "Кассир",
    comment: "",
  });
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const columns = [
    { key: "employee_id", label: "Сотрудник" },
    { key: "value", label: "Оценка" },
    { key: "role_in_shift", label: "Роль" },
    { key: "comment", label: "Комментарий" },
    { key: "created_at", label: "Дата" },
  ];

  const loadEmployees = async () => {
    setError("");
    try {
      const data = await apiRequest({
        apiBaseUrl,
        path: "/employees/",
        token,
      });
      setEmployees(data);
      if (data.length > 0) {
        const firstId = Number(data[0].id);
        setCreateForm((prev) => ({
          ...prev,
          employee_id: prev.employee_id || firstId,
        }));
        if (!createForm.employee_id) {
          await loadByEmployee(firstId);
        }
      }
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  const loadByEmployee = async (id) => {
    if (!id) {
      setRows([]);
      return;
    }
    setError("");
    try {
      const data = await apiRequest({
        apiBaseUrl,
        path: `/grades/employee/${Number(id)}`,
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
      await loadByEmployee(createForm.employee_id);
      notify("success", "Оценка добавлена");
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Оценки</h2>
      </div>

      <form onSubmit={handleCreate} className="inline-form wrap">
        <select
          value={createForm.employee_id}
          onChange={(e) =>
            setCreateForm((prev) => ({ ...prev, employee_id: Number(e.target.value) }))
          }
          required
        >
          {employees.length === 0 ? <option value="">Нет сотрудников</option> : null}
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
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
        <select
          value={createForm.role_in_shift}
          onChange={(e) =>
            setCreateForm((prev) => ({ ...prev, role_in_shift: e.target.value }))
          }
          required
        >
          {shiftRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
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

      {error ? <div className="notice error">{error}</div> : null}
      <DataTable columns={columns} rows={rows} emptyText="Оценок пока нет" />
    </section>
  );
}
