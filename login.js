const form = document.getElementById("loginForm");
const message = document.getElementById("loginMessage");

function showMessage(text, type) {
  message.className = `message ${type}`;
  message.textContent = text;
}

(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user?.app_metadata?.role === "admin") {
    window.location.href = "admin.html";
  }
})();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const { data, error } = await db.auth.signInWithPassword({
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value
  });

  if (error) {
    showMessage("E-mail ou mot de passe incorrect.", "error");
    return;
  }

  if (data.user?.app_metadata?.role !== "admin") {
    await db.auth.signOut();
    showMessage("Ce compte n'est pas autorisé.", "error");
    return;
  }

  window.location.href = "admin.html";
});
