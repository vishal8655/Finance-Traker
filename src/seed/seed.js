const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const { getMonthKey } = require("../utils/monthHelpers");

dotenv.config();

async function seed() {
  await connectDB();
  await User.deleteMany({ email: "demo@example.com" });

  const demoUser = await User.create({
    name: "Demo Student",
    email: "demo@example.com",
    password: await bcrypt.hash("password123", 10),
    theme: "dark",
    currency: "INR",
    notificationsEnabled: true,
    autoCategoryEnabled: true,
    defaultCategory: "Other"
  });

  const today = new Date();
  const currentMonth = getMonthKey(today);

  const sampleTransactions = [
    { title: "Monthly Salary", amount: 3200, type: "income", category: "Salary", date: new Date(today.getFullYear(), today.getMonth(), 1), note: "Main job salary" },
    { title: "Freelance Landing Page", amount: 450, type: "income", category: "Freelance", date: new Date(today.getFullYear(), today.getMonth(), 5), note: "Side project payment" },
    { title: "Apartment Rent", amount: 950, type: "expense", category: "Rent", date: new Date(today.getFullYear(), today.getMonth(), 2), note: "Monthly rent" },
    { title: "Groceries", amount: 180, type: "expense", category: "Food", date: new Date(today.getFullYear(), today.getMonth(), 4), note: "Weekly groceries" },
    { title: "Internet Bill", amount: 60, type: "expense", category: "Bills", date: new Date(today.getFullYear(), today.getMonth(), 6), note: "Home Wi-Fi" },
    { title: "Bus Pass", amount: 35, type: "expense", category: "Travel", date: new Date(today.getFullYear(), today.getMonth(), 7), note: "City transport" },
    { title: "Movie Night", amount: 28, type: "expense", category: "Entertainment", date: new Date(today.getFullYear(), today.getMonth(), 9), note: "Weekend outing" },
    { title: "Doctor Visit", amount: 75, type: "expense", category: "Health", date: new Date(today.getFullYear(), today.getMonth(), 11), note: "Clinic checkup" },
    { title: "Course Subscription", amount: 40, type: "expense", category: "Education", date: new Date(today.getFullYear(), today.getMonth(), 13), note: "Learning platform" },
    { title: "Headphones", amount: 90, type: "expense", category: "Shopping", date: new Date(today.getFullYear(), today.getMonth(), 14), note: "Personal electronics" },
    { title: "Uber to Office", amount: 42, type: "expense", category: "Travel", date: new Date(today.getFullYear(), today.getMonth(), 15), note: "Useful for smart category demo" },
    { title: "Pizza Dinner", amount: 26, type: "expense", category: "Food", date: new Date(today.getFullYear(), today.getMonth(), 16), note: "Useful for smart category demo" }
  ].map((item) => ({ ...item, user: demoUser._id }));

  await Transaction.insertMany(sampleTransactions);
  await Budget.findOneAndUpdate(
    { user: demoUser._id, month: currentMonth },
    { amount: 1800 },
    { upsert: true, new: true }
  );

  console.log("Demo data created.");
  console.log("Email: demo@example.com");
  console.log("Password: password123");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding error:", error.message);
  process.exit(1);
});
