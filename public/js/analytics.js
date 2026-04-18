requireAuth();
initializeTheme();

mountAppShell(`
  <section class="page-header">
    <div>
      <h2>Analytics & Insights</h2>
      <p>Understand your spending patterns with simple, clear visuals.</p>
    </div>
  </section>

  <section class="grid cards-2">
    <div class="card">
      <div class="card-header">
        <div>
          <h3>Insights</h3>
          <p class="tiny muted">Automatic observations based on your current month</p>
        </div>
      </div>
      <div class="insight-list" id="insightList"></div>
    </div>

    <div class="card chart-box compact-analytics-card">
      <div class="card-header">
        <div>
          <h3>Income vs Expense</h3>
          <p class="tiny muted">A compact monthly comparison.</p>
        </div>
      </div>
      <div class="compact-analytics-stats" id="incomeExpenseStats"></div>
      <div class="compact-chart-wrap">
        <canvas id="incomeExpenseChart"></canvas>
      </div>
    </div>
  </section>

  <section class="grid cards-2" style="margin-top: 18px;">
    <div class="card chart-box">
      <div class="card-header">
        <div>
          <h3>Category-wise Spending</h3>
          <p class="tiny muted">See where most of your money goes</p>
        </div>
      </div>
      <canvas id="categoryChart"></canvas>
    </div>

    <div class="card chart-box">
      <div class="card-header">
        <div>
          <h3>Monthly Expenses by Day</h3>
          <p class="tiny muted">Daily trend of expense activity</p>
        </div>
      </div>
      <canvas id="monthlyExpensesChart"></canvas>
    </div>
  </section>

  <section class="grid cards-2" style="margin-top: 18px;">
    <div class="card chart-box">
      <div class="card-header">
        <div>
          <h3>Month Comparison</h3>
          <p class="tiny muted">Compare this month to the previous month</p>
        </div>
      </div>
      <canvas id="monthComparisonChart"></canvas>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3>Category Snapshot</h3>
          <p class="tiny muted">Quick list of category totals for this month</p>
        </div>
      </div>
      <div class="mini-list" id="categorySnapshot"></div>
    </div>
  </section>
`);

let incomeExpenseChart;
let categoryChart;
let monthlyExpensesChart;
let monthComparisonChart;

async function loadAnalytics() {
  try {
    const data = await apiRequest("/insights");
    renderInsights(data.insights);
    renderCharts(data.charts);
  } catch (error) {
    document.getElementById("insightList").innerHTML = `<div class="insight-item">Unable to load analytics: ${escapeHtml(error.message)}</div>`;
  }
}

function renderInsights(insights) {
  const items = [
    `Highest spending category: ${insights.highestSpendingCategory ? `${escapeHtml(insights.highestSpendingCategory.category)} (${formatCurrency(insights.highestSpendingCategory.amount)})` : "No data yet"}`,
    `Total spending this month: ${formatCurrency(insights.totalSpendingThisMonth)}`,
    `Compared to last month: ${insights.comparisonWithPreviousMonth >= 0 ? "Up" : "Down"} ${formatCurrency(Math.abs(insights.comparisonWithPreviousMonth))}`,
    `Overspending warning: ${insights.overspending ? "You have crossed your budget." : "You are within your budget."}`,
    `Highest expense day: ${insights.highestExpenseDay ? `${insights.highestExpenseDay.date} (${formatCurrency(insights.highestExpenseDay.amount)})` : "No data yet"}`,
    `Estimated savings left: ${formatCurrency(insights.estimatedSavings || 0)}`,
    `Savings suggestion: ${escapeHtml(insights.savingsSuggestion)}`
  ];

  document.getElementById("insightList").innerHTML = items
    .map((item) => `<div class="insight-item">${item}</div>`)
    .join("");
}

function buildChart(canvasId, config, existingChart) {
  // Destroying the old chart avoids duplicated charts when the page rerenders.
  if (existingChart) existingChart.destroy();
  const context = document.getElementById(canvasId);
  return new Chart(context, config);
}

function renderCharts(charts) {
  incomeExpenseChart = buildChart(
    "incomeExpenseChart",
    {
      type: "bar",
      data: {
        labels: charts.incomeVsExpense.map((item) => item.label),
        datasets: [
          {
            label: "Amount",
            data: charts.incomeVsExpense.map((item) => item.amount),
            backgroundColor: ["#68c6a5", "#f08a8a"],
            borderRadius: 12
          }
        ]
      },
      options: chartOptions()
    },
    incomeExpenseChart
  );

  renderIncomeExpenseStats(charts.incomeVsExpense);

  categoryChart = buildChart(
    "categoryChart",
    {
      type: "doughnut",
      data: {
        labels: charts.categoryWiseSpending.length ? charts.categoryWiseSpending.map((item) => item.category) : ["No data"],
        datasets: [
          {
            data: charts.categoryWiseSpending.length ? charts.categoryWiseSpending.map((item) => item.amount) : [1],
            backgroundColor: ["#7fa7ff", "#59c8c3", "#68c6a5", "#f0c97d", "#f08a8a", "#a98cff", "#8ba3bf"],
            borderWidth: 0
          }
        ]
      },
      options: chartOptions()
    },
    categoryChart
  );

  monthlyExpensesChart = buildChart(
    "monthlyExpensesChart",
    {
      type: "line",
      data: {
        labels: charts.monthlyExpenses.length ? charts.monthlyExpenses.map((item) => item.day) : ["No data"],
        datasets: [
          {
            label: "Expense",
            data: charts.monthlyExpenses.length ? charts.monthlyExpenses.map((item) => item.expense) : [0],
            borderColor: "#7fa7ff",
            backgroundColor: "rgba(127, 167, 255, 0.18)",
            fill: true,
            tension: 0.35
          }
        ]
      },
      options: chartOptions()
    },
    monthlyExpensesChart
  );

  monthComparisonChart = buildChart(
    "monthComparisonChart",
    {
      type: "bar",
      data: {
        labels: charts.monthComparison.map((item) => item.label),
        datasets: [
          {
            label: "Expense",
            data: charts.monthComparison.map((item) => item.amount),
            backgroundColor: ["rgba(89, 200, 195, 0.7)", "rgba(127, 167, 255, 0.8)"],
            borderRadius: 12
          }
        ]
      },
      options: chartOptions()
    },
    monthComparisonChart
  );

  renderCategorySnapshot(charts.categoryWiseSpending);
}

function renderIncomeExpenseStats(items) {
  const container = document.getElementById("incomeExpenseStats");
  const income = items.find((item) => item.label === "Income")?.amount || 0;
  const expense = items.find((item) => item.label === "Expense")?.amount || 0;
  const balance = income - expense;

  container.innerHTML = `
    <div class="mini-stat compact-mini-stat">
      <span class="tiny muted">Income</span>
      <strong>${formatCurrency(income)}</strong>
    </div>
    <div class="mini-stat compact-mini-stat">
      <span class="tiny muted">Expense</span>
      <strong>${formatCurrency(expense)}</strong>
    </div>
    <div class="mini-stat compact-mini-stat ${balance >= 0 ? "trend-highlight" : ""}">
      <span class="tiny muted">Balance</span>
      <strong>${formatCurrency(balance)}</strong>
    </div>
  `;
}

function chartOptions() {
  const isLightTheme = document.body.classList.contains("light-theme");
  const labelColor = isLightTheme ? "#5e6774" : "#b1b7c0";

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        labels: { color: labelColor }
      }
    },
    scales: {
      x: {
        ticks: { color: labelColor },
        grid: { color: "rgba(255,255,255,0.06)" }
      },
      y: {
        ticks: { color: labelColor },
        grid: { color: "rgba(255,255,255,0.06)" }
      }
    }
  };
}

function renderCategorySnapshot(categories) {
  const container = document.getElementById("categorySnapshot");

  if (!categories.length) {
    container.innerHTML = `<div class="empty-state">Add a few expenses to see category totals.</div>`;
    return;
  }

  container.innerHTML = categories
    .sort((a, b) => b.amount - a.amount)
    .map(
      (item) => `
        <div class="category-pill">
          <strong>${escapeHtml(item.category)}</strong>
          <div class="muted">${formatCurrency(item.amount)}</div>
        </div>
      `
    )
    .join("");
}

loadAnalytics();
