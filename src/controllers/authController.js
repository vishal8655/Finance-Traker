const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const { defaultCategories } = require("../utils/categories");

function buildUserResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    theme: user.theme,
    currency: user.currency,
    notificationsEnabled: user.notificationsEnabled,
    autoCategoryEnabled: user.autoCategoryEnabled,
    defaultCategory: user.defaultCategory
  };
}

async function registerUser(req, res) {
  const { name, email, password } = req.body;
  const trimmedName = name ? name.trim() : "";
  const normalizedEmail = email ? email.trim().toLowerCase() : "";

  if (!trimmedName || !normalizedEmail || !password) {
    return res.status(400).json({ message: "Please fill all required fields." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({ message: "An account with this email already exists." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name: trimmedName, email: normalizedEmail, password: hashedPassword });

  res.status(201).json({
    message: "Registration successful.",
    token: generateToken(user._id),
    user: buildUserResponse(user)
  });
}

async function loginUser(req, res) {
  const { email, password } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : "";

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  res.json({
    message: "Login successful.",
    token: generateToken(user._id),
    user: buildUserResponse(user)
  });
}

async function getProfile(req, res) {
  res.json({ user: buildUserResponse(req.user) });
}

async function updateTheme(req, res) {
  const { theme } = req.body;

  if (!["dark", "light"].includes(theme)) {
    return res.status(400).json({ message: "Theme must be dark or light." });
  }

  const user = await User.findByIdAndUpdate(req.user._id, { theme }, { new: true }).select("-password");

  res.json({
    message: "Theme updated successfully.",
    user: buildUserResponse(user)
  });
}

async function updateSettings(req, res) {
  const { name, email, currency, notificationsEnabled, autoCategoryEnabled, defaultCategory, theme } = req.body;
  const trimmedName = name ? name.trim() : "";
  const normalizedEmail = email ? email.trim().toLowerCase() : "";

  if (!trimmedName || !normalizedEmail) {
    return res.status(400).json({ message: "Name and email are required." });
  }

  if (defaultCategory && !defaultCategories.includes(defaultCategory)) {
    return res.status(400).json({ message: "Please choose a valid default category." });
  }

  if (theme && !["dark", "light"].includes(theme)) {
    return res.status(400).json({ message: "Theme must be dark or light." });
  }

  const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user._id } });
  if (existingUser) {
    return res.status(400).json({ message: "That email is already in use." });
  }

  req.user.name = trimmedName;
  req.user.email = normalizedEmail;
  req.user.currency = currency || req.user.currency;
  req.user.notificationsEnabled = typeof notificationsEnabled === "boolean" ? notificationsEnabled : req.user.notificationsEnabled;
  req.user.autoCategoryEnabled = typeof autoCategoryEnabled === "boolean" ? autoCategoryEnabled : req.user.autoCategoryEnabled;
  req.user.defaultCategory = defaultCategory || req.user.defaultCategory;
  req.user.theme = theme || req.user.theme;

  await req.user.save();

  res.json({
    message: "Settings updated successfully.",
    user: buildUserResponse(req.user)
  });
}

async function updatePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current password and new password are required." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters long." });
  }

  const userWithPassword = await User.findById(req.user._id);
  const isMatch = await bcrypt.compare(currentPassword, userWithPassword.password);

  if (!isMatch) {
    return res.status(400).json({ message: "Current password is incorrect." });
  }

  userWithPassword.password = await bcrypt.hash(newPassword, 10);
  await userWithPassword.save();

  res.json({ message: "Password updated successfully." });
}

async function clearAllUserData(req, res) {
  await Promise.all([
    Transaction.deleteMany({ user: req.user._id }),
    Budget.deleteMany({ user: req.user._id })
  ]);

  res.json({ message: "All transaction and budget data has been cleared." });
}

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateTheme,
  updateSettings,
  updatePassword,
  clearAllUserData
};
