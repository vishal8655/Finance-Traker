const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const { getMonthKey, getMonthRange } = require("../utils/monthHelpers");

function sumAmount(items) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

async function getInsights(req, res) {
  const currentMonthKey = req.query.month || getMonthKey();
  const previousDate = new Date(`${currentMonthKey}-01`);
  previousDate.setMonth(previousDate.getMonth() - 1);
  const previousMonthKey = getMonthKey(previousDate);

  const currentRange = getMonthRange(currentMonthKey);
  const previousRange = getMonthRange(previousMonthKey);

  const currentTransactions = await Transaction.find({
    user: req.user._id,
    date: { $gte: currentRange.start, $lte: currentRange.end }
  }).sort({ date: 1 });

  const previousTransactions = await Transaction.find({
    user: req.user._id,
    date: { $gte: previousRange.start, $lte: previousRange.end }
  });

  const currentExpenses = currentTransactions.filter((item) => item.type === "expense");
  const currentIncome = currentTransactions.filter((item) => item.type === "income");
  const previousExpenses = previousTransactions.filter((item) => item.type === "expense");

  const totalSpendingThisMonth = sumAmount(currentExpenses);
  const totalSpendingLastMonth = sumAmount(previousExpenses);
  const totalIncomeThisMonth = sumAmount(currentIncome);

  const categoryTotals = {};
  currentExpenses.forEach((item) => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
  });

  const highestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const dailyTotals = {};
  currentExpenses.forEach((item) => {
    const day = new Date(item.date).toISOString().split("T")[0];
    dailyTotals[day] = (dailyTotals[day] || 0) + item.amount;
  });

  const highestExpenseDay = Object.entries(dailyTotals).sort((a, b) => b[1] - a[1])[0];
  const currentBudget = await Budget.findOne({ user: req.user._id, month: currentMonthKey });
  const budgetAmount = currentBudget ? currentBudget.amount : 0;

  const spendingDifference = totalSpendingThisMonth - totalSpendingLastMonth;
  const savingsEstimate = Math.max(totalIncomeThisMonth - totalSpendingThisMonth, 0);
  const spendingChangePercentage = totalSpendingLastMonth > 0 ? (spendingDifference / totalSpendingLastMonth) * 100 : 0;
  const highestCategoryAmount = highestCategory ? highestCategory[1] : 0;
  const recommendedCut = highestCategoryAmount > 0 ? Math.round(highestCategoryAmount * 0.15 * 100) / 100 : 0;

  const monthlyTrendMap = {};
  currentTransactions.forEach((item) => {
    const day = new Date(item.date).getDate();
    if (!monthlyTrendMap[day]) {
      monthlyTrendMap[day] = { income: 0, expense: 0 };
    }
    monthlyTrendMap[day][item.type] += item.amount;
  });

  const chartByDay = Object.keys(monthlyTrendMap).map((day) => ({
    day,
    income: monthlyTrendMap[day].income,
    expense: monthlyTrendMap[day].expense
  }));

  const monthComparison = [
    { label: "Last Month", amount: totalSpendingLastMonth },
    { label: "This Month", amount: totalSpendingThisMonth }
  ];

  res.json({
    insights: {
      highestSpendingCategory: highestCategory
        ? { category: highestCategory[0], amount: highestCategory[1] }
        : null,
      totalSpendingThisMonth,
      comparisonWithPreviousMonth: spendingDifference,
      comparisonPercentage: spendingChangePercentage,
      overspending: budgetAmount > 0 && totalSpendingThisMonth > budgetAmount,
      highestExpenseDay: highestExpenseDay ? { date: highestExpenseDay[0], amount: highestExpenseDay[1] } : null,
      savingsSuggestion:
        totalIncomeThisMonth > 0
          ? `You could move about ${Math.round((totalIncomeThisMonth * 0.1) * 100) / 100} into savings first, then spend from what remains.`
          : "Start by logging both income and expenses consistently. Clear records make budgeting much easier.",
      estimatedSavings: savingsEstimate,
      recommendedCategoryCut: highestCategory
        ? {
            category: highestCategory[0],
            amount: recommendedCut,
            message: `You can save about ${recommendedCut} by trimming ${highestCategory[0]} spending a little.`
          }
        : null
    },
    charts: {
      categoryWiseSpending: Object.entries(categoryTotals).map(([category, amount]) => ({ category, amount })),
      incomeVsExpense: [
        { label: "Income", amount: totalIncomeThisMonth },
        { label: "Expense", amount: totalSpendingThisMonth }
      ],
      monthlyExpenses: chartByDay,
      monthComparison
    }
  });
}

module.exports = { getInsights };
