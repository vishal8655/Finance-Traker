const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    theme: { type: String, enum: ["dark", "light"], default: "dark" },
    currency: { type: String, default: "USD", trim: true },
    notificationsEnabled: { type: Boolean, default: true },
    autoCategoryEnabled: { type: Boolean, default: true },
    defaultCategory: { type: String, default: "Other", trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
