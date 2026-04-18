const express = require("express");
const {
  registerUser,
  loginUser,
  getProfile,
  updateTheme,
  updateSettings,
  updatePassword,
  clearAllUserData
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getProfile);
router.put("/theme", protect, updateTheme);
router.put("/settings", protect, updateSettings);
router.put("/password", protect, updatePassword);
router.delete("/data", protect, clearAllUserData);

module.exports = router;
