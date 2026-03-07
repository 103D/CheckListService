import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { apiRequest } from "../api/client";

export default function RatingsPage({ apiBaseUrl, token, notify }) {
  const [rows, setRows] = useState([]);
  const [cityFilter, setCityFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadRatings = async () => {
    setError("");
    setIsLoading(true);

    try {
      const [ratingsData, employeesData, branchesData] = await Promise.all([
        apiRequest({
          apiBaseUrl,
          path: "/ratings/all",
          token,
        }),
        apiRequest({
          apiBaseUrl,
          path: "/employees/",
          token,
        }),
        apiRequest({
          apiBaseUrl,
          path: "/branches/",
          token,
        }),
      ]);

      const employeeById = new Map(
        employeesData.map((employee) => [employee.id, employee]),
      );
      const branchById = new Map(
        branchesData.map((branch) => [branch.id, branch]),
      );

      const mergedRows = ratingsData.map((item) => {
        const employee = employeeById.get(item.employee_id);
        const branch = branchById.get(employee?.branch_id);
        const branchName = branch?.name || "Без филиала";
        const city = branch?.city || "Не указан";

        return {
          ...item,
          average_score: Number(item.average_score || 0),
          branch_id: employee?.branch_id ?? null,
          branch_name: branchName,
          city,
        };
      });

      const sortedRows = [...mergedRows].sort(
        (a, b) => b.average_score - a.average_score,
      );

      setRows(sortedRows);
      notify("success", "Рейтинг сотрудников загружен");
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRatings();
  }, []);

  const cityOptions = useMemo(() => {
    return [
      "ALL",
      ...new Set(
        rows.map((row) => row.city).filter((city) => city && city !== "Не указан"),
      ),
    ];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const cityMatches = cityFilter === "ALL" || row.city === cityFilter;
      const branchMatches =
        branchFilter === "ALL" || String(row.branch_id) === branchFilter;
      return cityMatches && branchMatches;
    });
  }, [rows, cityFilter, branchFilter]);

  const branchOptions = useMemo(() => {
    return [
      { value: "ALL", label: "Все филиалы" },
      ...rows
        .filter((row) => cityFilter === "ALL" || row.city === cityFilter)
        .reduce((accumulator, row) => {
          if (!row.branch_id) {
            return accumulator;
          }
          const alreadyExists = accumulator.some(
            (option) => option.value === String(row.branch_id),
          );
          if (!alreadyExists) {
            accumulator.push({
              value: String(row.branch_id),
              label: row.branch_name,
            });
          }
          return accumulator;
        }, []),
    ];
  }, [rows, cityFilter]);

  const topFive = filteredRows.slice(0, 5);
  const remainingRows = filteredRows.slice(5);

  useEffect(() => {
    if (
      branchFilter !== "ALL" &&
      !branchOptions.some((option) => option.value === branchFilter)
    ) {
      setBranchFilter("ALL");
    }
  }, [branchFilter, branchOptions]);

  return (
    <section className="rating-page">
      <div className="panel rating-main-panel">
        <div className="panel-head">
          <h2>Рейтинг сотрудников</h2>
          <button
            type="button"
            onClick={loadRatings}
            className="icon-btn"
            aria-label="Обновить"
            title="Обновить"
          >
            <FiRefreshCw aria-hidden="true" />
          </button>
        </div>

        {error ? <div className="notice error">{error}</div> : null}

        <div className="rating-podium">
          {topFive.length === 0 ? (
            <p className="empty">Нет данных рейтинга</p>
          ) : (
            topFive.map((row, index) => (
              <article
                key={row.employee_id}
                className={`podium-card podium-place-${index + 1}`}
              >
                <p className="podium-rank">#{index + 1}</p>
                <h3>{row.employee_name}</h3>
                <p className="podium-meta">
                  {row.branch_name} · {row.city}
                </p>
                <p className="podium-score">{row.average_score.toFixed(2)}</p>
              </article>
            ))
          )}
        </div>

        <div className="rating-filters">
          <select
            value={cityFilter}
            onChange={(event) => {
              setCityFilter(event.target.value);
              setBranchFilter("ALL");
            }}
          >
            <option value="ALL">Все города</option>
            {cityOptions
              .filter((city) => city !== "ALL")
              .map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
          </select>

          <select
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
          >
            {branchOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? <p className="empty">Загрузка...</p> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Место</th>
                <th>Сотрудник</th>
                <th>Город</th>
                <th>Филиал</th>
                <th>Средний балл</th>
                <th>Кол-во оценок</th>
              </tr>
            </thead>
            <tbody>
              {remainingRows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className="empty">После топ-5 сотрудников не осталось</p>
                  </td>
                </tr>
              ) : (
                remainingRows.map((row, index) => (
                  <tr key={row.employee_id}>
                    <td>{index + 6}</td>
                    <td>{row.employee_name}</td>
                    <td>{row.city}</td>
                    <td>{row.branch_name}</td>
                    <td>{row.average_score.toFixed(2)}</td>
                    <td>{row.total_grades}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
