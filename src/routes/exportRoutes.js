const express = require("express");
const { exportTransactionsCsv } = require("../controllers/exportController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/transactions", protect, exportTransactionsCsv);

module.exports = router;
