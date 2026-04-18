requireAuth();
initializeTheme();

mountAppShell(`
  <section class="page-header">
    <div>
      <h2>Settings</h2>
      <p>Manage your profile, preferences, notifications, budget, and data tools.</p>
    </div>
  </section>

  <section class="grid cards-2">
    <div class="card">
      <h3>User Settings</h3>
      <form id="profileForm" class="form-grid">
        <div class="field">
          <label for="profileName">Name</label>
          <input id="profileName" required />
        </div>
        <div class="field">
          <label for="profileEmail">Email</label>
          <input id="profileEmail" type="email" required />
        </div>
        <div class="field">
          <label for="currency">Currency</label>
          <select id="currency">
            <option value="USD">$ USD</option>
            <option value="INR">₹ INR</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>
        </div>
        <div class="field">
          <label for="defaultCategory">Default Category</label>
          <select id="defaultCategory"></select>
        </div>
        <div class="field">
          <label for="notificationsEnabled">Notifications</label>
          <select id="notificationsEnabled">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>
        <div class="field">
          <label for="autoCategoryEnabled">Auto Categorization</label>
          <select id="autoCategoryEnabled">
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>
        <div class="field full">
          <button class="button button-primary" type="submit">Save Profile Settings</button>
        </div>
      </form>
      <div id="profileMessage" class="message"></div>
    </div>

    <div class="card compact-theme-card">
      <h3>Theme Preferences</h3>
      <div class="compact-theme-row">
        <div class="compact-theme-copy">
          <strong>Dark Mode</strong>
          <div class="muted">The app now uses one clean dark theme across every page.</div>
        </div>
        <span class="mini-theme-track mini-theme-track-static" aria-hidden="true">
          <span class="mini-theme-icon mini-theme-moon">☾</span>
          <span class="mini-theme-thumb mini-theme-thumb-static"></span>
        </span>
      </div>
    </div>

    <div class="card">
      <h3>Monthly Budget</h3>
      <form id="budgetForm" class="form-grid">
        <div class="field">
          <label for="budgetMonth">Month</label>
          <input id="budgetMonth" type="month" required />
        </div>

        <div class="field">
          <label for="budgetAmount">Budget Amount</label>
          <input id="budgetAmount" type="number" min="0" step="0.01" required />
        </div>

        <div class="field full">
          <button class="button button-primary" type="submit">Save Budget</button>
        </div>
      </form>
      <div id="budgetMessage" class="message"></div>
      <div id="budgetStats" style="margin-top: 14px;"></div>
    </div>

    <div class="card">
      <h3>Security Settings</h3>
      <form id="passwordForm" class="form-grid">
        <div class="field">
          <label for="currentPassword">Current Password</label>
          <input id="currentPassword" type="password" required />
        </div>
        <div class="field">
          <label for="newPassword">New Password</label>
          <input id="newPassword" type="password" minlength="6" required />
        </div>
        <div class="field full">
          <button class="button button-primary" type="submit">Update Password</button>
        </div>
      </form>
      <div id="passwordMessage" class="message"></div>
    </div>

    <div class="card">
      <h3>Data Settings</h3>
      <div class="mini-list">
        <button class="button button-secondary" id="exportDataButton" type="button">Export CSV Data</button>
        <button class="button button-danger" id="clearDataButton" type="button">Clear All Data</button>
      </div>
      <p class="tiny muted" style="margin-top: 14px;">Clearing data removes all transactions and budgets for your account. This cannot be undone.</p>
      <div id="dataMessage" class="message"></div>
    </div>
  </section>
`);

const budgetMonthInput = document.getElementById("budgetMonth");
budgetMonthInput.value = new Date().toISOString().slice(0, 7);
fillCategoryOptions(document.getElementById("defaultCategory"));

document.getElementById("budgetForm").addEventListener("submit", saveBudget);
budgetMonthInput.addEventListener("change", loadBudget);
document.getElementById("profileForm").addEventListener("submit", saveProfileSettings);
document.getElementById("passwordForm").addEventListener("submit", updatePassword);
document.getElementById("exportDataButton").addEventListener("click", exportCsvData);
document.getElementById("clearDataButton").addEventListener("click", clearAllData);

async function loadProfileSettings() {
  try {
    const data = await apiRequest("/auth/me");
    const user = data.user;

    document.getElementById("profileName").value = user.name;
    document.getElementById("profileEmail").value = user.email;
    document.getElementById("currency").value = user.currency || "USD";
    document.getElementById("defaultCategory").value = user.defaultCategory || "Other";
    document.getElementById("notificationsEnabled").value = String(user.notificationsEnabled !== false);
    document.getElementById("autoCategoryEnabled").value = String(user.autoCategoryEnabled !== false);
    updateStoredUser(user);
  } catch (error) {
    showMessage("profileMessage", error.message, "error");
  }
}

async function saveProfileSettings(event) {
  event.preventDefault();

  const payload = {
    name: document.getElementById("profileName").value.trim(),
    email: document.getElementById("profileEmail").value.trim(),
    currency: document.getElementById("currency").value,
    defaultCategory: document.getElementById("defaultCategory").value,
    notificationsEnabled: document.getElementById("notificationsEnabled").value === "true",
    autoCategoryEnabled: document.getElementById("autoCategoryEnabled").value === "true",
    theme: "dark"
  };

  try {
    const response = await apiRequest("/auth/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    updateStoredUser(response.user);
    showMessage("profileMessage", "Settings saved successfully.");
    showNotification("Profile and app preferences updated.", "success");
  } catch (error) {
    showMessage("profileMessage", error.message, "error");
  }
}

async function loadBudget() {
  try {
    const month = budgetMonthInput.value;
    const data = await apiRequest(`/budget?month=${month}`);

    if (data.budget) {
      document.getElementById("budgetAmount").value = data.budget.amount;
    } else {
      document.getElementById("budgetAmount").value = "";
    }

    renderBudgetStats(data.stats, data.budget ? data.budget.amount : 0);
  } catch (error) {
    showMessage("budgetMessage", error.message, "error");
  }
}

async function updatePassword(event) {
  event.preventDefault();

  try {
    await apiRequest("/auth/password", {
      method: "PUT",
      body: JSON.stringify({
        currentPassword: document.getElementById("currentPassword").value,
        newPassword: document.getElementById("newPassword").value
      })
    });

    document.getElementById("passwordForm").reset();
    showMessage("passwordMessage", "Password updated successfully.");
  } catch (error) {
    showMessage("passwordMessage", error.message, "error");
  }
}

async function exportCsvData() {
  try {
    const token = getToken();
    const response = await fetch("/api/export/transactions", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error("CSV export failed.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "finance-report.csv";
    link.click();
    URL.revokeObjectURL(url);
    showMessage("dataMessage", "CSV report downloaded successfully.");
  } catch (error) {
    showMessage("dataMessage", error.message, "error");
  }
}

async function clearAllData() {
  if (!window.confirm("Clear all transactions and budgets for this account?")) {
    return;
  }

  try {
    await apiRequest("/auth/data", { method: "DELETE" });
    showMessage("dataMessage", "All data cleared successfully.");
    showNotification("Your account data has been cleared.", "warning");
    loadBudget();
  } catch (error) {
    showMessage("dataMessage", error.message, "error");
  }
}

async function saveBudget(event) {
  event.preventDefault();

  const payload = {
    month: budgetMonthInput.value,
    amount: Number(document.getElementById("budgetAmount").value)
  };

  try {
    await apiRequest("/budget", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    showMessage("budgetMessage", "Budget saved successfully.");
    loadBudget();
  } catch (error) {
    showMessage("budgetMessage", error.message, "error");
  }
}

function renderBudgetStats(stats, budgetAmount) {
  const percentage = Math.min(stats.percentageUsed || 0, 100);
  const statusClass = stats.percentageUsed > 100 ? "danger" : stats.percentageUsed > 80 ? "warning" : "muted";
  document.getElementById("budgetStats").innerHTML = `
    <div class="stats-grid">
      <div class="mini-stat">
        <span class="tiny muted">Spent</span>
        <strong>${formatCurrency(stats.totalSpent)}</strong>
      </div>
      <div class="mini-stat">
        <span class="tiny muted">Remaining</span>
        <strong>${formatCurrency(stats.remaining)}</strong>
      </div>
    </div>
    <div style="margin-top: 12px;"><strong>Budget:</strong> ${formatCurrency(budgetAmount)}</div>
    <div class="progress">
      <div class="progress-bar" style="width: ${percentage}%"></div>
    </div>
    <div class="${statusClass}">
      ${stats.percentageUsed.toFixed(1)}% of your budget is used.
    </div>
  `;
}

loadProfileSettings();
loadBudget();
