const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const { getMonthKey, getMonthRange } = require("../utils/monthHelpers");

async function getBudget(req, res) {
  const month = req.query.month || getMonthKey();
  const budget = await Budget.findOne({ user: req.user._id, month });
  const { start, end } = getMonthRange(month);

  const expenses = await Transaction.find({
    user: req.user._id,
    type: "expense",
    date: { $gte: start, $lte: end }
  });

  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const amount = budget ? budget.amount : 0;
  const percentageUsed = amount > 0 ? (totalSpent / amount) * 100 : 0;

  res.json({
    budget: budget || null,
    stats: {
      month,
      totalSpent,
      remaining: amount - totalSpent,
      percentageUsed
    }
  });
}

async function setBudget(req, res) {
  const month = req.body.month || getMonthKey();
  const amount = Number(req.body.amount);

  if (Number.isNaN(amount) || amount < 0) {
    return res.status(400).json({ message: "Budget amount must be a valid number." });
  }

  const budget = await Budget.findOneAndUpdate(
    { user: req.user._id, month },
    { amount },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({
    message: "Budget saved successfully.",
    budget
  });
}

module.exports = { getBudget, setBudget };
