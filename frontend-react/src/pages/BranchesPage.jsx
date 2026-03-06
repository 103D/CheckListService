import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

function getUserRole(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.role || null;
  } catch {
    return null;
  }
}

export default function BranchesPage({ apiBaseUrl, token, notify }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("Almaty");
  const [rows, setRows] = useState([]);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("Almaty");
  const [error, setError] = useState("");
  const userRole = getUserRole(token);

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
        body: { name, city },
      });
      setName("");
      setCity("Almaty");
      await loadBranches();
      notify("success", "Филиал создан");
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  const startEdit = (branch) => {
    setEditingBranchId(branch.id);
    setEditName(branch.name);
    setEditCity(branch.city || "Almaty");
  };

  const cancelEdit = () => {
    setEditingBranchId(null);
    setEditName("");
    setEditCity("Almaty");
  };

  const handleUpdate = async (branchId) => {
    try {
      await apiRequest({
        apiBaseUrl,
        path: `/branches/${branchId}`,
        method: "PUT",
        token,
        body: { name: editName, city: editCity },
      });
      cancelEdit();
      await loadBranches();
      notify("success", "Филиал обновлен");
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  const handleDelete = async (branch) => {
    const confirmed = window.confirm(
      `Удалить филиал "${branch.name}"? Это действие нельзя отменить.`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest({
        apiBaseUrl,
        path: `/branches/${branch.id}`,
        method: "DELETE",
        token,
      });
      await loadBranches();
      notify("success", "Филиал удален");
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
          <input
            type="text"
            placeholder="Название филиала"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Город"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <button type="submit">Создать</button>
        </form>
      )}

      {error ? <div className="notice error">{error}</div> : null}

      {rows.length === 0 ? (
        <p className="empty">Филиалов пока нет</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Город</th>
                {userRole === "ADMIN" ? <th>Действия</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isEditing = editingBranchId === row.id;
                return (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      ) : (
                        row.name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                        />
                      ) : (
                        row.city || "—"
                      )}
                    </td>
                    {userRole === "ADMIN" ? (
                      <td>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button type="button" onClick={() => handleUpdate(row.id)}>
                              Сохранить
                            </button>
                            <button type="button" onClick={cancelEdit}>
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button type="button" onClick={() => startEdit(row)}>
                              Изменить
                            </button>
                            <button type="button" onClick={() => handleDelete(row)}>
                              Удалить
                            </button>
                          </div>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
