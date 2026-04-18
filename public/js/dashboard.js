requireAuth();
initializeTheme();

mountAppShell(`
  <section class="hero">
    <div class="hero-copy">
      <div class="eyebrow">Personal Finance Dashboard</div>
      <h2>Track spending with a clean monthly overview.</h2>
      <p>See your income, expenses, balance, budgets, and spending patterns in one place.</p>
      <div class="toolbar" style="margin-top: 18px;">
        <a class="button button-primary" href="/transactions.html">Add or Edit Transactions</a>
        <a class="button button-ghost" href="/analytics.html">Open Full Analytics</a>
      </div>
    </div>
    <div class="hero-metrics" id="heroMetrics"></div>
  </section>

  <section class="grid cards-4" id="summaryCards"></section>

  <section class="grid cards-2 section-spacer">
    <div class="card">
      <div class="card-header">
        <div>
          <h3>Recent Transactions</h3>
          <p class="tiny muted">Your latest income and expense entries</p>
        </div>
        <a class="button button-ghost button-small" href="/transactions.html">See All</a>
      </div>
      <div id="recentTransactions"></div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3>Monthly Budget Status</h3>
          <p class="tiny muted">Quick budget health for the current month</p>
        </div>
      </div>
      <div id="budgetStatus"></div>
    </div>
  </section>

  <section class="grid cards-2 section-spacer">
    <div class="card chart-box trend-card">
      <div class="card-header">
        <div>
          <h3>Daily Expense Trend</h3>
          <p class="tiny muted">A compact left-to-right daily expense view.</p>
        </div>
        <div class="toolbar">
          <button class="button button-ghost button-small trend-toggle active" id="trendLineButton" type="button">Line View</button>
          <button class="button button-ghost button-small trend-toggle" id="trendBarButton" type="button">Bar View</button>
        </div>
      </div>
      <div class="trend-stats" id="trendStats"></div>
      <div class="compact-chart-wrap">
        <canvas id="dashboardExpenseChart"></canvas>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3>Top Spending Categories</h3>
          <p class="tiny muted">The categories using the most money this month</p>
        </div>
      </div>
      <div class="mini-list" id="topCategories"></div>
    </div>
  </section>
`);

let dashboardExpenseChart;
let currentTrendMode = "line";
const trendLineButton = document.getElementById("trendLineButton");
const trendBarButton = document.getElementById("trendBarButton");

trendLineButton.addEventListener("click", () => {
  currentTrendMode = "line";
  updateTrendToggleButtons();
  loadDashboard();
});

trendBarButton.addEventListener("click", () => {
  currentTrendMode = "bar";
  updateTrendToggleButtons();
  loadDashboard();
});

async function loadDashboard() {
  try {
    const [dashboardData, insightData] = await Promise.all([
      apiRequest("/transactions/summary/dashboard"),
      apiRequest("/insights")
    ]);

    renderHeroMetrics(dashboardData.summary, insightData.insights);
    renderSummaryCards(dashboardData.summary);
    renderRecentTransactions(dashboardData.recentTransactions);
    renderBudgetStatus(dashboardData.summary, insightData.insights);
    renderTopCategories(dashboardData.topMonthlyCategories);
    renderExpenseChart(insightData.charts.monthlyExpenses);
    renderTrendStats(insightData.charts.monthlyExpenses);
    renderDashboardAlerts(dashboardData.alerts || [], insightData.insights);
  } catch (error) {
    document.getElementById("summaryCards").innerHTML = `<div class="card">Unable to load dashboard: ${escapeHtml(error.message)}</div>`;
  }
}

function renderDashboardAlerts(alerts, insights) {
  const user = getStoredUser();
  if (user && user.notificationsEnabled === false) return;

  alerts.forEach((alert) => {
    showNotification(`${alert.title}: ${alert.message}`, alert.type);
  });

  if (insights.recommendedCategoryCut) {
    showNotification(insights.recommendedCategoryCut.message, "info");
  }
}

function updateTrendToggleButtons() {
  trendLineButton.classList.toggle("active", currentTrendMode === "line");
  trendBarButton.classList.toggle("active", currentTrendMode === "bar");
}

function renderHeroMetrics(summary, insights) {
  const heroMetrics = [
    { label: "Balance", value: formatCurrency(summary.balance) },
    { label: "Spent This Month", value: formatCurrency(summary.monthlyExpenses) },
    { label: "Highest Category", value: insights.highestSpendingCategory ? escapeHtml(insights.highestSpendingCategory.category) : "No data" }
  ];

  document.getElementById("heroMetrics").innerHTML = heroMetrics
    .map(
      (item) => `
        <div class="hero-chip">
          <div class="tiny muted">${item.label}</div>
          <strong>${item.value}</strong>
        </div>
      `
    )
    .join("");
}

function renderSummaryCards(summary) {
  const cards = [
    {
      label: "Total Income",
      value: formatCurrency(summary.totalIncome),
      className: "success",
      note: "All recorded income so far"
    },
    {
      label: "Total Expenses",
      value: formatCurrency(summary.totalExpenses),
      className: "danger",
      note: "All recorded expenses so far"
    },
    {
      label: "Remaining Balance",
      value: formatCurrency(summary.balance),
      className: summary.balance >= 0 ? "success" : "danger",
      note: "Income minus expenses"
    },
    {
      label: "Monthly Budget",
      value: formatCurrency(summary.monthlyBudget),
      className: "",
      note: summary.monthlyBudget ? `${summary.budgetUsedPercentage.toFixed(1)}% used this month` : "Set from the Settings page"
    }
  ];

  document.getElementById("summaryCards").innerHTML = cards
    .map(
      (card) => `
        <div class="card summary-card">
          <h3>${card.label}</h3>
          <div class="metric ${card.className}">${card.value}</div>
          <div class="summary-note">${card.note}</div>
        </div>
      `
    )
    .join("");
}

function renderRecentTransactions(transactions) {
  const container = document.getElementById("recentTransactions");

  if (!transactions.length) {
    container.innerHTML = `<div class="empty-state">No transactions added yet.</div>`;
    return;
  }

  container.innerHTML = transactions
    .map(
      (item) => `
        <div class="transaction-item">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <div class="muted">${item.category} • ${formatDate(item.date)}</div>
          </div>
          <div class="${item.type === "income" ? "success" : "danger"}">
            ${item.type === "income" ? "+" : "-"}${formatCurrency(item.amount)}
          </div>
        </div>
      `
    )
    .join("");
}

function renderBudgetStatus(summary, insights) {
  const percentage = Math.min(summary.budgetUsedPercentage || 0, 100);
  const statusClass = summary.budgetUsedPercentage > 100 ? "danger" : summary.budgetUsedPercentage > 80 ? "warning" : "success";

  document.getElementById("budgetStatus").innerHTML = `
    <div class="stats-grid">
      <div class="mini-stat">
        <span class="tiny muted">Spent</span>
        <strong>${formatCurrency(summary.monthlyExpenses)}</strong>
      </div>
      <div class="mini-stat">
        <span class="tiny muted">Estimated Savings</span>
        <strong>${formatCurrency(insights.estimatedSavings || 0)}</strong>
      </div>
    </div>
    <p class="muted">Spent this month out of ${formatCurrency(summary.monthlyBudget || 0)} budget.</p>
    <div class="progress">
      <div class="progress-bar" style="width: ${percentage}%;"></div>
    </div>
    <p class="${statusClass}">
      ${summary.monthlyBudget ? `${summary.budgetUsedPercentage.toFixed(1)}% of budget used` : "No budget set yet. Visit Settings to create one."}
    </p>
  `;
}

function renderTopCategories(categories) {
  const container = document.getElementById("topCategories");

  if (!categories.length) {
    container.innerHTML = `<div class="empty-state">No expense categories yet for this month.</div>`;
    return;
  }

  container.innerHTML = categories
    .map(
      (item) => `
        <div class="list-row">
          <strong>${escapeHtml(item.category)}</strong>
          <div class="muted">${formatCurrency(item.amount)}</div>
        </div>
      `
    )
    .join("");
}

function renderExpenseChart(monthlyExpenses) {
  const labels = monthlyExpenses.length ? monthlyExpenses.map((item) => item.day) : ["No data"];
  const values = monthlyExpenses.length ? monthlyExpenses.map((item) => item.expense) : [0];
  const labelColor = document.body.classList.contains("light-theme") ? "#617083" : "#9ca8b8";
  const gridColor = document.body.classList.contains("light-theme") ? "rgba(18, 32, 53, 0.08)" : "rgba(255, 255, 255, 0.06)";

  if (dashboardExpenseChart) {
    dashboardExpenseChart.destroy();
  }

  dashboardExpenseChart = new Chart(document.getElementById("dashboardExpenseChart"), {
    type: currentTrendMode === "bar" ? "bar" : "line",
    data: {
      labels,
      datasets: [
        {
          label: "Expense",
          data: values,
          borderColor: "#7fa7ff",
          backgroundColor: currentTrendMode === "bar" ? "rgba(89, 200, 195, 0.65)" : "rgba(127, 167, 255, 0.14)",
          fill: currentTrendMode !== "bar",
          tension: 0.35,
          pointRadius: currentTrendMode === "bar" ? 0 : 4,
          pointHoverRadius: currentTrendMode === "bar" ? 0 : 6,
          pointBackgroundColor: "#59c8c3",
          borderWidth: currentTrendMode === "bar" ? 0 : 3,
          borderRadius: currentTrendMode === "bar" ? 12 : 0,
          maxBarThickness: 28
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          labels: { color: labelColor }
        },
        tooltip: {
          callbacks: {
            label(context) {
              return ` Expense: ${formatCurrency(context.parsed.y ?? context.parsed)}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: labelColor },
          grid: { color: gridColor },
          title: {
            display: true,
            text: "Day of Month",
            color: labelColor
          }
        },
        y: {
          ticks: { color: labelColor },
          grid: { color: gridColor },
          title: {
            display: true,
            text: "Expense Amount",
            color: labelColor
          },
          beginAtZero: true
        }
      }
    }
  });
}

function renderTrendStats(monthlyExpenses) {
  const container = document.getElementById("trendStats");

  if (!monthlyExpenses.length) {
    container.innerHTML = `
      <div class="mini-stat compact-mini-stat">
        <span class="tiny muted">Trend Status</span>
        <strong>No daily expenses yet</strong>
      </div>
    `;
    return;
  }

  const peakDay = monthlyExpenses.reduce((highest, current) => (current.expense > highest.expense ? current : highest), monthlyExpenses[0]);
  const totalExpense = monthlyExpenses.reduce((sum, item) => sum + item.expense, 0);
  const averageExpense = totalExpense / monthlyExpenses.length;

  container.innerHTML = `
    <div class="mini-stat compact-mini-stat trend-highlight">
      <span class="tiny muted">Peak Day</span>
      <strong>Day ${peakDay.day}</strong>
      <div class="muted">${formatCurrency(peakDay.expense)}</div>
    </div>
    <div class="mini-stat compact-mini-stat">
      <span class="tiny muted">Average Day</span>
      <strong>${formatCurrency(averageExpense)}</strong>
      <div class="muted">${monthlyExpenses.length} tracked days</div>
    </div>
    <div class="mini-stat compact-mini-stat">
      <span class="tiny muted">Mode</span>
      <strong>${currentTrendMode === "line" ? "Line" : "Bar"}</strong>
      <div class="muted">Quick switch view</div>
    </div>
  `;
}

loadDashboard();
