const categoryOptions = [
  "Food",
  "Travel",
  "Rent",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Entertainment",
  "Salary",
  "Freelance",
  "Other"
];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "/login.html";
  }
}

function redirectIfLoggedIn() {
  if (getToken()) {
    window.location.href = "/";
  }
}

function logout() {
  clearAuth();
  window.location.href = "/login.html";
}

function showMessage(elementId, text, type = "success") {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = text;
  element.className = `message show ${type}`;
}

function showNotification(text, type = "info") {
  const tray = document.getElementById("notificationTray");
  if (!tray) return;

  const item = document.createElement("div");
  item.className = `app-notification ${type}`;
  item.textContent = text;
  tray.appendChild(item);

  window.setTimeout(() => {
    item.classList.add("hide");
    window.setTimeout(() => item.remove(), 260);
  }, 3200);
}

function clearMessage(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = "";
  element.className = "message";
}

function formatCurrency(amount) {
  const user = getStoredUser();
  const currency = user?.currency || "USD";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amount || 0);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function applyTheme(theme) {
  const lockedTheme = "dark";
  document.body.classList.remove("light-theme");
  localStorage.setItem("financeTheme", lockedTheme);
  window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: lockedTheme } }));
}

function getPreferredTheme() {
  return "dark";
}

function initializeTheme() {
  applyTheme(getPreferredTheme());
}

function updateThemeLabel() {
  const themeLabel = document.querySelector("[data-theme-label]");
  if (!themeLabel) return;

  themeLabel.textContent = "Dark mode";
}

async function handleQuickThemeToggle() {
  applyTheme("dark");
  updateThemeLabel();

  try {
    const response = await apiRequest("/auth/theme", {
      method: "PUT",
      body: JSON.stringify({ theme: "dark" })
    });

    localStorage.setItem("financeUser", JSON.stringify(response.user));
  } catch (error) {
    showMessage("themeMessage", error.message, "error");
  }
}

function setupSidebar() {
  const pathname = window.location.pathname;

  document.querySelectorAll(".nav-link").forEach((link) => {
    if (link.getAttribute("href") === pathname) {
      link.classList.add("active");
    }
  });

  const user = getStoredUser();
  document.querySelectorAll("[data-user-name]").forEach((element) => {
    element.textContent = user ? user.name : "Student";
  });

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", logout);
  });

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", handleQuickThemeToggle);
  });

  updateThemeLabel();
}

function createSidebar() {
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-badge">PF</div>
        <div class="brand-text">
          <h1>Finance Tracker</h1>
          <p>Plan smarter spending</p>
        </div>
      </div>

      <div class="glass-panel" style="margin-bottom: 18px;">
        <div class="eyebrow">Workspace</div>
        <strong style="display: block; margin: 8px 0 6px;">Your money at a glance</strong>
        <div class="tiny muted">Track transactions, stay within budget, and learn from your monthly patterns.</div>
      </div>

      <nav class="nav-links">
        <a class="nav-link" href="/">Dashboard</a>
        <a class="nav-link" href="/transactions.html">Transactions</a>
        <a class="nav-link" href="/analytics.html">Analytics</a>
        <a class="nav-link" href="/settings.html">Settings</a>
      </nav>

      <div class="sidebar-footer">
        <div>
          <strong data-user-name>Student</strong>
          <div class="muted">Signed in</div>
        </div>
        <button class="button button-ghost" data-logout>Logout</button>
      </div>
    </aside>
  `;
}

function mountAppShell(pageContent) {
  document.body.innerHTML = `
    <div class="app-shell">
      ${createSidebar()}
      <main class="content">
        <div id="notificationTray" class="notification-tray"></div>
        ${pageContent}
      </main>
    </div>
  `;

  setupSidebar();
}

function fillCategoryOptions(selectElement, includeAll = false) {
  if (!selectElement) return;

  const options = includeAll ? ['<option value="">All Categories</option>'] : [];
  categoryOptions.forEach((category) => {
    options.push(`<option value="${category}">${category}</option>`);
  });

  selectElement.innerHTML = options.join("");
}
