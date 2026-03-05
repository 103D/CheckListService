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

export default function GradesPage({ apiBaseUrl, token, notify }) {
  const shiftRoles = ["Кассир", "Продавец", "Официант", "Бариста"];
  const userRole = getUserRole(token);

  const [createForm, setCreateForm] = useState({
    employee_id: "",
    value: 100,
    role_in_shift: "Кассир",
    comment: "",
  });
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [pendingGrades, setPendingGrades] = useState([]);
  const [error, setError] = useState("");

  const columns = [
    { key: "employee_id", label: "Сотрудник" },
    { key: "value", label: "Оценка" },
    { key: "role_in_shift", label: "Роль" },
    { key: "comment", label: "Комментарий" },
    { key: "status", label: "Статус" },
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

  const loadPendingGrades = async () => {
    try {
      const data = await apiRequest({
        apiBaseUrl,
        path: "/grades/pending",
        token,
      });
      setPendingGrades(data);
    } catch (err) {
      notify("error", err.message);
    }
  };

  const handleApprove = async (gradeId) => {
    try {
      await apiRequest({
        apiBaseUrl,
        path: `/grades/${gradeId}/approve`,
        method: "PATCH",
        token,
      });
      notify("success", "Оценка подтверждена");
      await loadPendingGrades();
      if (createForm.employee_id) {
        await loadByEmployee(createForm.employee_id);
      }
    } catch (err) {
      notify("error", err.message);
    }
  };

  const handleReject = async (gradeId) => {
    try {
      await apiRequest({
        apiBaseUrl,
        path: `/grades/${gradeId}/reject`,
        method: "PATCH",
        token,
      });
      notify("success", "Оценка отклонена");
      await loadPendingGrades();
      if (createForm.employee_id) {
        await loadByEmployee(createForm.employee_id);
      }
    } catch (err) {
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
      await loadPendingGrades();
      notify("success", userRole === "ADMIN" ? "Оценка добавлена" : "Оценка отправлена на подтверждение");
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadPendingGrades();
  }, []);

  const statusLabel = (status) => {
    if (status === "APPROVED") return "✅ Подтверждена";
    if (status === "REJECTED") return "❌ Отклонена";
    return "⏳ Ожидает";
  };

  const employeeById = new Map(employees.map((e) => [e.id, e.name]));

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

      {(userRole === "ADMIN" || pendingGrades.length > 0) && (
        <div style={{ marginTop: "1rem" }}>
          <h3>{userRole === "ADMIN" ? "Ожидают подтверждения" : "Ваши оценки на рассмотрении"}</h3>
          {pendingGrades.length === 0 ? (
            <p className="empty">Нет оценок на рассмотрении</p>
          ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Сотрудник</th>
                  <th>Оценка</th>
                  <th>Роль</th>
                  <th>Комментарий</th>
                  <th>Дата</th>
                  <th title="Подтвердить">✅</th>
                  <th title="Отклонить">🗑</th>
                </tr>
              </thead>
              <tbody>
                {pendingGrades.map((grade) => (
                  <tr key={grade.id}>
                    <td>{employeeById.get(grade.employee_id) || grade.employee_id}</td>
                    <td>{grade.value}</td>
                    <td>{grade.role_in_shift}</td>
                    <td>{grade.comment || "—"}</td>
                    <td>{grade.created_at}</td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="radio"
                        name={`grade-${grade.id}`}
                        title="Подтвердить"
                        onChange={() => handleApprove(grade.id)}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        role="button"
                        title="Отклонить"
                        style={{ cursor: "pointer", fontSize: "1.1rem" }}
                        onClick={() => handleReject(grade.id)}
                      >
                        🗑
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      <div style={{ marginTop: "1rem" }}>
        <h3>История оценок</h3>
        <select
          value={createForm.employee_id}
          onChange={(e) => {
            const id = Number(e.target.value);
            setCreateForm((prev) => ({ ...prev, employee_id: id }));
            loadByEmployee(id);
          }}
          style={{ marginBottom: "0.5rem" }}
        >
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
        <DataTable
          columns={columns}
          rows={rows.map((r) => ({ ...r, status: statusLabel(r.status) }))}
          emptyText="Оценок пока нет"
        />
      </div>
    </section>
  );
}
