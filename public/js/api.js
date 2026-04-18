const API_BASE_URL = "/api";

function getToken() {
  return localStorage.getItem("financeToken");
}

function saveAuth(data) {
  localStorage.setItem("financeToken", data.token);
  localStorage.setItem("financeUser", JSON.stringify(data.user));
}

function clearAuth() {
  localStorage.removeItem("financeToken");
  localStorage.removeItem("financeUser");
}

function getStoredUser() {
  const user = localStorage.getItem("financeUser");
  return user ? JSON.parse(user) : null;
}

function updateStoredUser(user) {
  localStorage.setItem("financeUser", JSON.stringify(user));
}

async function apiRequest(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
    }
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}
