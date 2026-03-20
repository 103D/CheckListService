import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiDownload, FiEdit2, FiPlus, FiRefreshCw, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import * as XLSX from "xlsx";
import { apiRequest } from "../api/client";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

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
  const [allRows, setAllRows] = useState([]);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("Almaty");
  const [error, setError] = useState("");
  
  // Filters
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("month");
  const [sortConfig, setSortConfig] = useState({ key: "id", order: "asc" });
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const userRole = getUserRole(token);

  // Load branches with filters
  const loadBranches = async () => {
    setError("");
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (cityFilter) params.append("city", cityFilter);
      if (periodFilter) params.append("period", periodFilter);

      
      const data = await apiRequest({
        apiBaseUrl,
        path: `/branches/?${params.toString()}`,
        token,
      });
      setAllRows(asArray(data));
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load unique cities for dropdown
  const loadCities = async () => {
    try {
      const data = await apiRequest({
        apiBaseUrl,
        path: "/branches/cities",
        token,
      });
      setCities(asArray(data));
    } catch (err) {
      console.error("Failed to load cities:", err);
    }
  };

  useEffect(() => {
    loadBranches();
    loadCities();
  }, []);

  // Reload when filters change (but not when sorting)
  useEffect(() => {
    loadBranches();
  }, [search, cityFilter, periodFilter]);

  // Frontend sorting - instant, no reload
  const sortedRows = useMemo(() => {
    const rows = [...allRows];
    if (!sortConfig.key) return rows;
    
    return rows.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Handle null/undefined
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";
      
      // String comparison - check both values
      const aIsString = typeof aVal === "string";
      const bIsString = typeof bVal === "string";
      
      if (aIsString && bIsString) {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      } else if (!aIsString && !bIsString) {
        // Both are numbers or can be compared as numbers
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        // Mixed types - convert to strings
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      
      if (aVal < bVal) return sortConfig.order === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.order === "asc" ? 1 : -1;
      return 0;
    });
  }, [allRows, sortConfig]);

  // Handle sort click - instant
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      order: prev.key === key && prev.order === "asc" ? "desc" : "asc"
    }));
  };

  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return <span style={{ opacity: 0.3 }}>⇅</span>;
    return sortConfig.order === "asc" 
      ? <span style={{ color: '#1976d2' }}>▲</span> 
      : <span style={{ color: '#1976d2' }}>▼</span>;
  };

  // Handle search input
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadBranches();
  };

  // Export to Excel with bold headers and borders
  const handleExportExcel = () => {
    const exportData = sortedRows.map(row => ({
      ID: row.id,
      "Название": row.name,
      "Город": row.city,
      "Средняя оценка": row.average_rating !== null ? row.average_rating.toFixed(2) : "-",
      "Кол-во сотрудников": row.employees_count
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Филиалы");
    
    const colWidths = [
      { wch: 5 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
    ];
    worksheet['!cols'] = colWidths;
    
    // Add bold headers and borders to all cells
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        
        worksheet[cellAddress].s = {
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          },
          font: R === 0 ? { bold: true } : {}
        };
      }
    }
    
    XLSX.writeFile(workbook, "filialy.xlsx");
    notify("success", "Данные экспортированы в Excel");
  };

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
      await loadCities();
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
      await loadCities();
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
      await loadCities();
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
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={loadBranches}
            className="icon-btn"
            aria-label="Обновить"
            title="Обновить"
            disabled={isLoading}
          >
            <FiRefreshCw aria-hidden="true" className={isLoading ? "spinning" : ""} />
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="icon-btn"
            aria-label="Экспорт в Excel"
            title="Экспорт в Excel"
            disabled={sortedRows.length === 0}
          >
            <FiDownload aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '16px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '200px' }}>
          <div className="search-input-wrapper" style={{ position: 'relative', flex: '1', maxWidth: '280px' }}>
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={handleSearchChange}
              style={{ paddingRight: '32px', width: '100%', borderRadius: '6px', border: '1px solid #ddd', padding: '8px 12px' }}
            />
            <FiSearch style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666', cursor: 'pointer' }} onClick={handleSearchSubmit} />
          </div>
        </form>
        
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          style={{ minWidth: '140px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: '#fff' }}
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          style={{ minWidth: '140px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: '#fff' }}
        >
          <option value="">За все время</option>
          <option value="today">За сегодня</option>
          <option value="week">За неделю</option>
          <option value="month">За месяц</option>
          <option value="year">За год</option>
        </select>
      </div>

      {/* Create form for admin */}
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
          <button type="submit" className="icon-btn" aria-label="Создать" title="Создать">
            <FiPlus aria-hidden="true" />
          </button>
        </form>
      )}

      {error ? <div className="notice error">{error}</div> : null}

      {sortedRows.length === 0 ? (
        <p className="empty">Филиалов пока нет</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort("id")} style={{ cursor: "pointer", padding: '10px', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>ID {getSortIndicator("id")}</span>
                </th>
                <th onClick={() => handleSort("name")} style={{ cursor: "pointer", padding: '10px', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Название {getSortIndicator("name")}</span>
                </th>
                <th onClick={() => handleSort("city")} style={{ cursor: "pointer", padding: '10px', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Город {getSortIndicator("city")}</span>
                </th>
                <th onClick={() => handleSort("average_rating")} style={{ cursor: "pointer", padding: '10px', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Сред. оценка {getSortIndicator("average_rating")}</span>
                </th>
                <th onClick={() => handleSort("employees_count")} style={{ cursor: "pointer", padding: '10px', userSelect: 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Сотрудники {getSortIndicator("employees_count")}</span>
                </th>
                {userRole === "ADMIN" ? <th>Действия</th> : null}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
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
                    <td>
                      {row.average_rating !== null && row.average_rating !== undefined
                        ? row.average_rating.toFixed(2)
                        : "—"}
                    </td>
                    <td>{row.employees_count}</td>
                    {userRole === "ADMIN" ? (
                      <td>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => handleUpdate(row.id)}
                              className="icon-btn"
                              aria-label="Сохранить"
                              title="Сохранить"
                            >
                              <FiCheck aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="icon-btn"
                              aria-label="Отмена"
                              title="Отмена"
                            >
                              <FiX aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => startEdit(row)}
                              className="icon-btn"
                              aria-label="Изменить"
                              title="Изменить"
                            >
                              <FiEdit2 aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="icon-btn"
                              aria-label="Удалить"
                              title="Удалить"
                            >
                              <FiTrash2 aria-hidden="true" />
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
