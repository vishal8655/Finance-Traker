const keywordCategoryMap = [
  { keywords: ["salary", "paycheck", "pay day", "bonus"], category: "Salary", type: "income" },
  { keywords: ["freelance", "client", "project payment", "invoice"], category: "Freelance", type: "income" },
  { keywords: ["pizza", "burger", "coffee", "groceries", "restaurant", "food", "snack"], category: "Food", type: "expense" },
  { keywords: ["uber", "taxi", "train", "metro", "bus", "flight", "fuel", "travel"], category: "Travel", type: "expense" },
  { keywords: ["rent", "apartment", "landlord"], category: "Rent", type: "expense" },
  { keywords: ["bill", "electricity", "water", "internet", "wifi", "phone recharge"], category: "Bills", type: "expense" },
  { keywords: ["doctor", "hospital", "medicine", "pharmacy", "health"], category: "Health", type: "expense" },
  { keywords: ["course", "book", "tuition", "education", "subscription class"], category: "Education", type: "expense" },
  { keywords: ["movie", "netflix", "game", "concert", "entertainment"], category: "Entertainment", type: "expense" },
  { keywords: ["shopping", "headphones", "clothes", "shoes", "amazon"], category: "Shopping", type: "expense" }
];

function suggestCategory(title = "", type = "") {
  const normalizedTitle = String(title).trim().toLowerCase();
  const normalizedType = String(type || "").trim().toLowerCase();

  if (!normalizedTitle) {
    return { category: "Other", matched: false };
  }

  const match = keywordCategoryMap.find((entry) => {
    const typeMatches = !normalizedType || entry.type === normalizedType;
    const keywordMatches = entry.keywords.some((keyword) => normalizedTitle.includes(keyword));
    return typeMatches && keywordMatches;
  });

  return match
    ? { category: match.category, matched: true }
    : { category: "Other", matched: false };
}

module.exports = { suggestCategory };
