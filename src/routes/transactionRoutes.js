const express = require("express");
const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getDashboardSummary,
  suggestTransactionCategory
} = require("../controllers/transactionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getTransactions);
router.get("/summary/dashboard", protect, getDashboardSummary);
router.post("/suggest-category", protect, suggestTransactionCategory);
router.post("/", protect, createTransaction);
router.put("/:id", protect, updateTransaction);
router.delete("/:id", protect, deleteTransaction);

module.exports = router;
