initializeTheme();

const isRegisterPage = window.location.pathname.includes("register");

if (isRegisterPage) {
  redirectIfLoggedIn();
  const registerForm = document.getElementById("registerForm");

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage("authMessage");

    const formData = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value.trim()
    };

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(formData)
      });

      saveAuth(data);
      applyTheme(data.user.theme || "dark");
      showMessage("authMessage", "Account created successfully. Redirecting...");
      setTimeout(() => {
        window.location.href = "/";
      }, 700);
    } catch (error) {
      showMessage("authMessage", error.message, "error");
    }
  });
} else {
  redirectIfLoggedIn();
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage("authMessage");

    const formData = {
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value.trim()
    };

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(formData)
      });

      saveAuth(data);
      applyTheme(data.user.theme || "dark");
      showMessage("authMessage", "Login successful. Redirecting...");
      setTimeout(() => {
        window.location.href = "/";
      }, 700);
    } catch (error) {
      showMessage("authMessage", error.message, "error");
    }
  });
}
