const Transaction = require("../models/Transaction");
const { buildTransactionsCsv } = require("../utils/csvExport");

async function exportTransactionsCsv(req, res) {
  const filter = { user: req.user._id };

  if (req.query.type) {
    filter.type = req.query.type;
  }

  if (req.query.category) {
    filter.category = req.query.category;
  }

  if (req.query.search) {
    filter.title = { $regex: req.query.search, $options: "i" };
  }

  if (req.query.startDate || req.query.endDate) {
    filter.date = {};

    if (req.query.startDate) {
      filter.date.$gte = new Date(req.query.startDate);
    }

    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      filter.date.$lte = endDate;
    }
  }

  const transactions = await Transaction.find(filter).sort({ date: -1 });
  const csv = buildTransactionsCsv(transactions);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
  res.send(csv);
}

module.exports = { exportTransactionsCsv };
