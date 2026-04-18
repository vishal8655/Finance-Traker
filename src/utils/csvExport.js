function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function buildTransactionsCsv(transactions) {
  const header = ["Title", "Amount", "Type", "Category", "Date", "Note"];
  const rows = transactions.map((transaction) => [
    transaction.title,
    transaction.amount,
    transaction.type,
    transaction.category,
    new Date(transaction.date).toISOString().split("T")[0],
    transaction.note || ""
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

module.exports = { buildTransactionsCsv };
