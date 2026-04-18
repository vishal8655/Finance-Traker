const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const { defaultCategories } = require("../utils/categories");
const { getMonthKey, getMonthRange } = require("../utils/monthHelpers");
const { suggestCategory } = require("../utils/smartCategorization");

function parseTransactionFilters(query) {
  const filter = {};

  if (query.type) {
    filter.type = query.type;
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) {
      filter.date.$gte = new Date(query.startDate);
    }

    if (query.endDate) {
      const endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
      filter.date.$lte = endDate;
    }
  }

  if (query.search) {
    filter.title = { $regex: query.search, $options: "i" };
  }

  return filter;
}

function validateTransactionInput(payload) {
  const { title, amount, type, category, date } = payload;
  const parsedAmount = Number(amount);

  if (!title || !String(title).trim() || !amount || !type || !category || !date) {
    return { valid: false, message: "Please fill all required transaction fields." };
  }

  if (!["income", "expense"].includes(type)) {
    return { valid: false, message: "Transaction type must be income or expense." };
  }

  if (!defaultCategories.includes(category)) {
    return { valid: false, message: "Please choose a valid category." };
  }

  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return { valid: false, message: "Amount must be greater than 0." };
  }

  return { valid: true, parsedAmount };
}

function resolveCategoryForUser(user, title, type, submittedCategory) {
  if (submittedCategory && submittedCategory !== "Other") {
    return submittedCategory;
  }

  if (user.autoCategoryEnabled) {
    const suggestion = suggestCategory(title, type);
    if (suggestion.matched) {
      return suggestion.category;
    }
  }

  return user.defaultCategory || submittedCategory || "Other";
}

async function getTransactions(req, res) {
  // Build search and filter conditions from query params so the frontend
  // can reuse a single endpoint for filtering by type, category, date, and title.
  const filters = parseTransactionFilters(req.query);
  const transactions = await Transaction.find({ user: req.user._id, ...filters }).sort({ date: -1, createdAt: -1 });

  res.json({
    transactions,
    categories: defaultCategories
  });
}

async function createTransaction(req, res) {
  const { title, amount, type, category, date, note } = req.body;
  const validation = validateTransactionInput(req.body);

  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  const transaction = await Transaction.create({
    user: req.user._id,
    title: title.trim(),
    amount: validation.parsedAmount,
    type,
    category: resolveCategoryForUser(req.user, title, type, category),
    date,
    note: note ? note.trim() : ""
  });

  res.status(201).json({
    message: "Transaction added successfully.",
    transaction
  });
}

async function updateTransaction(req, res) {
  const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found." });
  }

  const { title, amount, type, category, date, note } = req.body;
  const validation = validateTransactionInput(req.body);

  if (!validation.valid) {
    return res.status(400).json({ message: validation.message });
  }

  transaction.title = title.trim();
  transaction.amount = validation.parsedAmount;
  transaction.type = type;
  transaction.category = resolveCategoryForUser(req.user, title, type, category);
  transaction.date = date;
  transaction.note = note ? note.trim() : "";

  await transaction.save();

  res.json({
    message: "Transaction updated successfully.",
    transaction
  });
}

async function deleteTransaction(req, res) {
  const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found." });
  }

  res.json({ message: "Transaction deleted successfully." });
}

async function getDashboardSummary(req, res) {
  // This keeps dashboard calculations easy to understand for beginners:
  // fetch the user's transactions, then calculate totals with simple array methods.
  const allTransactions = await Transaction.find({ user: req.user._id });

  const totalIncome = allTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpenses = allTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const currentMonthKey = getMonthKey();
  const { start, end } = getMonthRange(currentMonthKey);

  const currentMonthTransactions = await Transaction.find({
    user: req.user._id,
    date: { $gte: start, $lte: end }
  }).sort({ date: -1 });

  const monthlyExpenses = currentMonthTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const budget = await Budget.findOne({ user: req.user._id, month: currentMonthKey });
  const budgetAmount = budget ? budget.amount : 0;
  const budgetUsedPercentage = budgetAmount > 0 ? (monthlyExpenses / budgetAmount) * 100 : 0;
  const monthlyCategoryTotals = {};

  currentMonthTransactions
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      monthlyCategoryTotals[item.category] = (monthlyCategoryTotals[item.category] || 0) + item.amount;
    });

  const topMonthlyCategories = Object.entries(monthlyCategoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, amount]) => ({ category, amount }));

  const previousDate = new Date(`${currentMonthKey}-01`);
  previousDate.setMonth(previousDate.getMonth() - 1);
  const previousMonthKey = getMonthKey(previousDate);
  const previousMonthRange = getMonthRange(previousMonthKey);
  const previousMonthTransactions = await Transaction.find({
    user: req.user._id,
    type: "expense",
    date: { $gte: previousMonthRange.start, $lte: previousMonthRange.end }
  });
  const previousMonthExpenses = previousMonthTransactions.reduce((sum, item) => sum + item.amount, 0);
  const spendingChangePercentage = previousMonthExpenses > 0 ? ((monthlyExpenses - previousMonthExpenses) / previousMonthExpenses) * 100 : 0;
  const highValueTransaction = currentMonthTransactions.find((item) => item.amount >= 1000);
  const alerts = [];

  if (budgetAmount > 0 && monthlyExpenses > budgetAmount) {
    alerts.push({ type: "danger", title: "Budget exceeded", message: "This month has already gone over budget." });
  } else if (budgetAmount > 0 && budgetUsedPercentage >= 85) {
    alerts.push({ type: "warning", title: "Budget almost used", message: "You are close to reaching your monthly budget." });
  }

  if (spendingChangePercentage >= 20) {
    alerts.push({
      type: "warning",
      title: "High spending detected",
      message: `Expenses are ${spendingChangePercentage.toFixed(1)}% higher than last month.`
    });
  }

  if (highValueTransaction) {
    alerts.push({
      type: "info",
      title: "Large transaction added",
      message: `${highValueTransaction.title} was recorded with a high amount.`
    });
  }

  res.json({
    summary: {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      monthlyBudget: budgetAmount,
      monthlyExpenses,
      budgetUsedPercentage
    },
    recentTransactions: currentMonthTransactions.slice(0, 5),
    monthlySummary: {
      month: currentMonthKey,
      income: currentMonthTransactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0),
      expenses: monthlyExpenses
    },
    topMonthlyCategories,
    alerts
  });
}

async function suggestTransactionCategory(req, res) {
  const { title, type } = req.body;
  const suggestion = suggestCategory(title, type);

  res.json({
    suggestion,
    autoCategoryEnabled: req.user.autoCategoryEnabled,
    defaultCategory: req.user.defaultCategory
  });
}

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getDashboardSummary,
  suggestTransactionCategory
};
