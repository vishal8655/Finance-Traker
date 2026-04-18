const express = require("express");
const { getBudget, setBudget } = require("../controllers/budgetController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getBudget);
router.post("/", protect, setBudget);

module.exports = router;
