requireAuth();
initializeTheme();

mountAppShell(`
  <section class="page-header">
    <div>
      <h2>Transactions</h2>
      <p>Add, edit, search, and filter your income and expenses.</p>
    </div>
    <div class="toolbar">
      <button class="button button-secondary" id="exportCsvButton">Export CSV</button>
    </div>
  </section>

  <section class="card" style="margin-bottom: 18px;">
    <div class="card-header">
      <div>
        <h3 id="formTitle">Add Transaction</h3>
        <p class="tiny muted">Use this form to add daily income or expense entries.</p>
      </div>
    </div>
    <form id="transactionForm" class="form-grid">
      <div class="field">
        <label for="title">Title</label>
        <input id="title" required placeholder="Groceries, Salary, Bus Pass" />
      </div>
      <div class="field">
        <label for="amount">Amount</label>
        <input id="amount" type="number" min="0.01" step="0.01" required />
      </div>
      <div class="field">
        <label for="type">Type</label>
        <select id="type" required>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <div class="field">
        <label for="category">Category</label>
        <select id="category" required></select>
        <div class="tiny muted" id="categoryHint">You can also use smart category suggestions.</div>
      </div>
      <div class="field">
        <label for="date">Date</label>
        <input id="date" type="date" required />
      </div>
      <div class="field full">
        <label for="note">Note</label>
        <textarea id="note" placeholder="Optional extra note"></textarea>
      </div>
      <div class="field full toolbar">
        <button class="button button-primary" type="submit">Save Transaction</button>
        <button class="button button-ghost" type="button" id="cancelEditButton">Cancel Edit</button>
      </div>
    </form>
    <div id="transactionMessage" class="message"></div>
  </section>

  <section class="card">
    <div class="card-header">
      <div>
        <h3>Transaction History</h3>
        <p class="tiny muted">Search by title or filter by type, category, and date.</p>
      </div>
    </div>
    <div class="filter-grid" style="margin-bottom: 16px;">
      <input id="searchInput" placeholder="Search by title" />
      <select id="filterType">
        <option value="">All Types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>
      <select id="filterCategory"></select>
      <input id="filterStartDate" type="date" />
      <input id="filterEndDate" type="date" />
      <button class="button button-secondary" id="applyFiltersButton">Apply Filters</button>
      <button class="button button-ghost" id="resetFiltersButton">Reset</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Amount</th>
            <th>Type</th>
            <th>Category</th>
            <th>Date</th>
            <th>Note</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="transactionTableBody"></tbody>
      </table>
    </div>
  </section>
`);

const transactionForm = document.getElementById("transactionForm");
const transactionMessageId = "transactionMessage";
const exportCsvButton = document.getElementById("exportCsvButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const formTitle = document.getElementById("formTitle");
let editingTransactionId = null;

fillCategoryOptions(document.getElementById("category"));
fillCategoryOptions(document.getElementById("filterCategory"), true);
document.getElementById("date").valueAsDate = new Date();
cancelEditButton.style.display = "none";

transactionForm.addEventListener("submit", handleTransactionSubmit);
cancelEditButton.addEventListener("click", resetForm);
document.getElementById("applyFiltersButton").addEventListener("click", loadTransactions);
document.getElementById("resetFiltersButton").addEventListener("click", resetFilters);
exportCsvButton.addEventListener("click", exportCsv);
document.getElementById("title").addEventListener("blur", suggestCategoryFromTitle);
document.getElementById("type").addEventListener("change", suggestCategoryFromTitle);

async function handleTransactionSubmit(event) {
  event.preventDefault();
  clearMessage(transactionMessageId);

  // The form works for both create and edit actions.
  // We switch behavior based on whether editingTransactionId has a value.
  const payload = {
    title: document.getElementById("title").value.trim(),
    amount: Number(document.getElementById("amount").value),
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    date: document.getElementById("date").value,
    note: document.getElementById("note").value.trim()
  };

  try {
    if (editingTransactionId) {
      await apiRequest(`/transactions/${editingTransactionId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      showMessage(transactionMessageId, "Transaction updated successfully.");
    } else {
      await apiRequest("/transactions", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showMessage(transactionMessageId, "Transaction added successfully.");
    }

    if (payload.amount >= 1000) {
      showNotification("Large transaction added. Review this expense or income for accuracy.", "warning");
    }

    resetForm();
    await loadTransactions();
  } catch (error) {
    showMessage(transactionMessageId, error.message, "error");
  }
}

function resetForm() {
  editingTransactionId = null;
  formTitle.textContent = "Add Transaction";
  transactionForm.reset();
  document.getElementById("date").valueAsDate = new Date();
  cancelEditButton.style.display = "none";
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("filterType").value = "";
  document.getElementById("filterCategory").value = "";
  document.getElementById("filterStartDate").value = "";
  document.getElementById("filterEndDate").value = "";
  loadTransactions();
}

function buildQueryString() {
  // URLSearchParams makes it easy to build a clean query string only
  // with the filters that the user has actually filled in.
  const params = new URLSearchParams();
  const search = document.getElementById("searchInput").value.trim();
  const type = document.getElementById("filterType").value;
  const category = document.getElementById("filterCategory").value;
  const startDate = document.getElementById("filterStartDate").value;
  const endDate = document.getElementById("filterEndDate").value;

  if (search) params.append("search", search);
  if (type) params.append("type", type);
  if (category) params.append("category", category);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  return params.toString();
}

async function suggestCategoryFromTitle() {
  const title = document.getElementById("title").value.trim();
  const type = document.getElementById("type").value;
  const categoryInput = document.getElementById("category");
  const hint = document.getElementById("categoryHint");

  if (!title) {
    hint.textContent = "You can also use smart category suggestions.";
    return;
  }

  try {
    const response = await apiRequest("/transactions/suggest-category", {
      method: "POST",
      body: JSON.stringify({ title, type })
    });

    if (response.autoCategoryEnabled && response.suggestion.category) {
      categoryInput.value = response.suggestion.category;
      hint.textContent = response.suggestion.matched
        ? `Suggested category: ${response.suggestion.category}`
        : `No direct match found, using ${response.defaultCategory}.`;
    }
  } catch (error) {
    hint.textContent = "Category suggestion is unavailable right now.";
  }
}

async function loadTransactions() {
  try {
    const queryString = buildQueryString();
    const data = await apiRequest(`/transactions${queryString ? `?${queryString}` : ""}`);
    renderTransactions(data.transactions);
  } catch (error) {
    document.getElementById("transactionTableBody").innerHTML = `<tr><td colspan="7">Unable to load transactions: ${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderTransactions(transactions) {
  const tableBody = document.getElementById("transactionTableBody");

  if (!transactions.length) {
    tableBody.innerHTML = `<tr><td colspan="7">No transactions found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = transactions
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.title)}</td>
          <td class="${item.type === "income" ? "success" : "danger"}">${formatCurrency(item.amount)}</td>
          <td><span class="badge ${item.type}">${item.type}</span></td>
          <td>${escapeHtml(item.category)}</td>
          <td>${formatDate(item.date)}</td>
          <td>${item.note ? escapeHtml(item.note) : "-"}</td>
          <td>
            <div class="toolbar">
              <button class="button button-secondary" onclick="startEdit('${item._id}')">Edit</button>
              <button class="button button-danger" onclick="removeTransaction('${item._id}')">Delete</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  window.currentTransactions = transactions;
}

window.startEdit = function startEdit(id) {
  const transaction = (window.currentTransactions || []).find((item) => item._id === id);
  if (!transaction) return;

  editingTransactionId = id;
  formTitle.textContent = "Edit Transaction";
  document.getElementById("title").value = transaction.title;
  document.getElementById("amount").value = transaction.amount;
  document.getElementById("type").value = transaction.type;
  document.getElementById("category").value = transaction.category;
  document.getElementById("date").value = new Date(transaction.date).toISOString().split("T")[0];
  document.getElementById("note").value = transaction.note || "";
  cancelEditButton.style.display = "inline-flex";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.removeTransaction = async function removeTransaction(id) {
  if (!window.confirm("Delete this transaction?")) return;

  try {
    await apiRequest(`/transactions/${id}`, { method: "DELETE" });
    await loadTransactions();
  } catch (error) {
    alert(error.message);
  }
};

async function exportCsv() {
  try {
    const token = getToken();
    const queryString = buildQueryString();
    const response = await fetch(`/api/export/transactions${queryString ? `?${queryString}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error("CSV export failed.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  }
}

loadTransactions();
