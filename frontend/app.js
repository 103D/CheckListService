const state = {
  apiBaseUrl: localStorage.getItem("apiBaseUrl") || "http://127.0.0.1:8001",
  token: localStorage.getItem("accessToken") || "",
};

const el = {
  apiBaseUrl: document.getElementById("apiBaseUrl"),
  saveApiUrlBtn: document.getElementById("saveApiUrlBtn"),
  tokenInput: document.getElementById("tokenInput"),
  saveTokenBtn: document.getElementById("saveTokenBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  toast: document.getElementById("toast"),
  registerForm: document.getElementById("registerForm"),
  loginForm: document.getElementById("loginForm"),
  createBranchForm: document.getElementById("createBranchForm"),
  loadBranchesBtn: document.getElementById("loadBranchesBtn"),
  createEmployeeForm: document.getElementById("createEmployeeForm"),
  loadEmployeesBtn: document.getElementById("loadEmployeesBtn"),
  createGradeForm: document.getElementById("createGradeForm"),
  gradesByEmployeeForm: document.getElementById("gradesByEmployeeForm"),
  branchRatingsForm: document.getElementById("branchRatingsForm"),
  allRatingsBtn: document.getElementById("allRatingsBtn"),
  topRatingsForm: document.getElementById("topRatingsForm"),
  branchesOutput: document.getElementById("branchesOutput"),
  employeesOutput: document.getElementById("employeesOutput"),
  gradesOutput: document.getElementById("gradesOutput"),
  ratingsOutput: document.getElementById("ratingsOutput"),
  logOutput: document.getElementById("logOutput"),
  branchesCount: document.getElementById("branchesCount"),
  employeesCount: document.getElementById("employeesCount"),
  gradesCount: document.getElementById("gradesCount"),
  ratingsCount: document.getElementById("ratingsCount"),
};

function setInitialValues() {
  el.apiBaseUrl.value = state.apiBaseUrl;
  el.tokenInput.value = state.token;
}

function updateCount(target, value) {
  target.textContent = String(value);
}

function log(message) {
  const now = new Date().toLocaleTimeString();
  const item = document.createElement("li");
  item.textContent = `[${now}] ${message}`;
  el.logOutput.prepend(item);

  while (el.logOutput.children.length > 40) {
    el.logOutput.removeChild(el.logOutput.lastChild);
  }
}

function showToast(type, message) {
  el.toast.className = `toast ${type}`;
  el.toast.textContent = message;

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    el.toast.className = "toast hidden";
    el.toast.textContent = "";
  }, 2600);
}

function clearOutput(target) {
  target.innerHTML = "<div class='empty-state'>Нет данных</div>";
}

function renderTable(target, rows, columns) {
  if (!Array.isArray(rows) || rows.length === 0) {
    clearOutput(target);
    return;
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const trHead = document.createElement("tr");

  for (const col of columns) {
    const th = document.createElement("th");
    th.textContent = col.label;
    trHead.appendChild(th);
  }

  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const col of columns) {
      const td = document.createElement("td");
      const val = row[col.key];
      td.textContent = val === null || val === undefined ? "—" : String(val);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  target.innerHTML = "";
  target.appendChild(table);
}

function getHeaders(withJson = true, withAuth = true) {
  const headers = {};
  if (withJson) headers["Content-Type"] = "application/json";
  if (withAuth && state.token) headers.Authorization = `Bearer ${state.token}`;
  return headers;
}

async function apiRequest(path, options = {}) {
  const url = `${state.apiBaseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let payload = text;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const detail = payload?.detail || response.statusText || "Request failed";
    throw new Error(`${response.status} ${detail}`);
  }

  return payload;
}

function handleError(prefix, error) {
  const message = `${prefix}: ${error.message}`;
  log(message);
  showToast("error", message);
}

el.saveApiUrlBtn.addEventListener("click", () => {
  state.apiBaseUrl = el.apiBaseUrl.value.trim().replace(/\/$/, "");
  localStorage.setItem("apiBaseUrl", state.apiBaseUrl);
  log(`API URL сохранен: ${state.apiBaseUrl}`);
  showToast("success", "API URL сохранен");
});

el.saveTokenBtn.addEventListener("click", () => {
  state.token = el.tokenInput.value.trim();
  localStorage.setItem("accessToken", state.token);
  log("Токен сохранен");
  showToast("success", "Токен сохранен");
});

el.logoutBtn.addEventListener("click", () => {
  state.token = "";
  el.tokenInput.value = "";
  localStorage.removeItem("accessToken");
  log("Выход выполнен");
  showToast("success", "Выход выполнен");
});

el.registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(el.registerForm);

  const payload = {
    email: String(form.get("email") || "").trim(),
    password: String(form.get("password") || ""),
    role: String(form.get("role") || "MANAGER"),
    branch_id: Number(form.get("branch_id")),
  };

  try {
    await apiRequest("/auth/register", {
      method: "POST",
      headers: getHeaders(true, false),
      body: JSON.stringify(payload),
    });
    log("Регистрация успешна");
    showToast("success", "Регистрация успешна");
    el.registerForm.reset();
  } catch (error) {
    handleError("Ошибка регистрации", error);
  }
});

el.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(el.loginForm);
  const body = new URLSearchParams();
  body.set("username", String(form.get("username") || "").trim());
  body.set("password", String(form.get("password") || ""));

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    state.token = data.access_token || "";
    el.tokenInput.value = state.token;
    localStorage.setItem("accessToken", state.token);
    log("Логин успешен, токен сохранен");
    showToast("success", "Логин успешен");
    el.loginForm.reset();
  } catch (error) {
    handleError("Ошибка логина", error);
  }
});

el.createBranchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(el.createBranchForm);
  const payload = { name: String(form.get("name") || "").trim() };

  try {
    const data = await apiRequest("/branches/", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    renderTable(el.branchesOutput, [data], [
      { key: "id", label: "ID" },
      { key: "name", label: "Название" },
    ]);
    updateCount(el.branchesCount, 1);
    log("Филиал создан");
    showToast("success", "Филиал создан");
    el.createBranchForm.reset();
  } catch (error) {
    handleError("Ошибка создания филиала", error);
  }
});

el.loadBranchesBtn.addEventListener("click", async () => {
  try {
    const data = await apiRequest("/branches/", {
      headers: getHeaders(false, false),
    });
    renderTable(el.branchesOutput, data, [
      { key: "id", label: "ID" },
      { key: "name", label: "Название" },
    ]);
    updateCount(el.branchesCount, data.length);
    log("Список филиалов обновлен");
  } catch (error) {
    handleError("Ошибка загрузки филиалов", error);
  }
});

el.createEmployeeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(el.createEmployeeForm);
  const payload = {
    name: String(form.get("name") || "").trim(),
    branch_id: Number(form.get("branch_id")),
  };

  try {
    const data = await apiRequest("/employees/", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    renderTable(el.employeesOutput, [data], [
      { key: "id", label: "ID" },
      { key: "name", label: "Имя" },
      { key: "branch_id", label: "Филиал" },
    ]);
    updateCount(el.employeesCount, 1);
    log("Сотрудник создан");
    showToast("success", "Сотрудник создан");
    el.createEmployeeForm.reset();
  } catch (error) {
    handleError("Ошибка создания сотрудника", error);
  }
});

el.loadEmployeesBtn.addEventListener("click", async () => {
  try {
    const data = await apiRequest("/employees/", {
      headers: getHeaders(false, true),
    });
    renderTable(el.employeesOutput, data, [
      { key: "id", label: "ID" },
      { key: "name", label: "Имя" },
      { key: "branch_id", label: "Филиал" },
    ]);
    updateCount(el.employeesCount, data.length);
    log("Список сотрудников обновлен");
  } catch (error) {
    handleError("Ошибка загрузки сотрудников", error);
  }
});

el.createGradeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(el.createGradeForm);
  const payload = {
    employee_id: Number(form.get("employee_id")),
    value: Number(form.get("value")),
    role_in_shift: String(form.get("role_in_shift") || "").trim(),
    comment: String(form.get("comment") || "").trim() || null,
  };

  try {
    const data = await apiRequest("/grades/", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    renderTable(el.gradesOutput, [data], [
      { key: "id", label: "ID" },
      { key: "employee_id", label: "Сотрудник" },
      { key: "value", label: "Оценка" },
      { key: "role_in_shift", label: "Роль" },
      { key: "comment", label: "Комментарий" },
      { key: "created_at", label: "Дата" },
    ]);
    updateCount(el.gradesCount, 1);
    log("Оценка добавлена");
    showToast("success", "Оценка добавлена");
    el.createGradeForm.reset();
  } catch (error) {
    handleError("Ошибка добавления оценки", error);
  }
});

el.gradesByEmployeeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(el.gradesByEmployeeForm);
  const employeeId = Number(form.get("employee_id"));

  try {
    const data = await apiRequest(`/grades/employee/${employeeId}`, {
      headers: getHeaders(false, true),
    });
    renderTable(el.gradesOutput, data, [
      { key: "id", label: "ID" },
      { key: "employee_id", label: "Сотрудник" },
      { key: "value", label: "Оценка" },
      { key: "role_in_shift", label: "Роль" },
      { key: "comment", label: "Комментарий" },
      { key: "created_at", label: "Дата" },
    ]);
    updateCount(el.gradesCount, data.length);
    log(`Оценки сотрудника ${employeeId} загружены`);
  } catch (error) {
    handleError("Ошибка загрузки оценок", error);
  }
});

el.branchRatingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(el.branchRatingsForm);
  const branchId = Number(form.get("branch_id"));

  try {
    const data = await apiRequest(`/ratings/branch/${branchId}`, {
      headers: getHeaders(false, true),
    });
    renderTable(el.ratingsOutput, data, [
      { key: "employee_id", label: "ID" },
      { key: "employee_name", label: "Сотрудник" },
      { key: "average_score", label: "Средний балл" },
      { key: "total_grades", label: "Кол-во оценок" },
    ]);
    updateCount(el.ratingsCount, data.length);
    log(`Рейтинг филиала ${branchId} загружен`);
  } catch (error) {
    handleError("Ошибка загрузки рейтинга филиала", error);
  }
});

el.allRatingsBtn.addEventListener("click", async () => {
  try {
    const data = await apiRequest("/ratings/all", {
      headers: getHeaders(false, true),
    });
    renderTable(el.ratingsOutput, data, [
      { key: "employee_id", label: "ID" },
      { key: "employee_name", label: "Сотрудник" },
      { key: "average_score", label: "Средний балл" },
      { key: "total_grades", label: "Кол-во оценок" },
    ]);
    updateCount(el.ratingsCount, data.length);
    log("Рейтинг всех сотрудников загружен");
  } catch (error) {
    handleError("Ошибка загрузки общего рейтинга", error);
  }
});

el.topRatingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(el.topRatingsForm);
  const topN = Number(form.get("top_n"));

  try {
    const data = await apiRequest(`/ratings/top?top_n=${topN}`, {
      headers: getHeaders(false, true),
    });
    renderTable(el.ratingsOutput, data, [
      { key: "employee_id", label: "ID" },
      { key: "employee_name", label: "Сотрудник" },
      { key: "average_score", label: "Средний балл" },
      { key: "total_grades", label: "Кол-во оценок" },
    ]);
    updateCount(el.ratingsCount, data.length);
    log(`Топ ${topN} сотрудников загружен`);
  } catch (error) {
    handleError("Ошибка загрузки топа", error);
  }
});

setInitialValues();
clearOutput(el.branchesOutput);
clearOutput(el.employeesOutput);
clearOutput(el.gradesOutput);
clearOutput(el.ratingsOutput);
updateCount(el.branchesCount, 0);
updateCount(el.employeesCount, 0);
updateCount(el.gradesCount, 0);
updateCount(el.ratingsCount, 0);
log("Dashboard готов. Войди и начни работать.");
