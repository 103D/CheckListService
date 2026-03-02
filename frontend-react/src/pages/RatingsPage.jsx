import { useState } from "react";
import { apiRequest } from "../api/client";
import DataTable from "../components/DataTable";

export default function RatingsPage({ apiBaseUrl, token, notify }) {
  const [branchId, setBranchId] = useState(1);
  const [topN, setTopN] = useState(10);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const columns = [
    { key: "employee_id", label: "ID" },
    { key: "employee_name", label: "Сотрудник" },
    { key: "average_score", label: "Средний балл" },
    { key: "total_grades", label: "Кол-во оценок" },
  ];

  const loadBranchRatings = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const data = await apiRequest({
        apiBaseUrl,
        path: `/ratings/branch/${Number(branchId)}`,
        token,
      });
      setRows(data);
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  const loadAllRatings = async () => {
    setError("");

    try {
      const data = await apiRequest({
        apiBaseUrl,
        path: "/ratings/all",
        token,
      });
      setRows(data);
      notify("success", "Загружен общий рейтинг");
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  const loadTopRatings = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const data = await apiRequest({
        apiBaseUrl,
        path: `/ratings/top?top_n=${Number(topN)}`,
        token,
      });
      setRows(data);
    } catch (err) {
      setError(err.message);
      notify("error", err.message);
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Рейтинги</h2>
      </div>

      <div className="inline-form wrap">
        <form onSubmit={loadBranchRatings} className="inline-form">
          <input
            type="number"
            min="1"
            placeholder="ID филиала"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            required
          />
          <button type="submit">Рейтинг филиала</button>
        </form>

        <button type="button" onClick={loadAllRatings}>
          Рейтинг всех (ADMIN)
        </button>

        <form onSubmit={loadTopRatings} className="inline-form">
          <input
            type="number"
            min="1"
            placeholder="Top N"
            value={topN}
            onChange={(e) => setTopN(e.target.value)}
            required
          />
          <button type="submit">Топ сотрудников</button>
        </form>
      </div>

      {error ? <div className="notice error">{error}</div> : null}
      <DataTable columns={columns} rows={rows} emptyText="Рейтингов пока нет" />
    </section>
  );
}
