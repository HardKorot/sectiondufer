const form = document.getElementById("loginForm");
const msg = document.getElementById("loginMessage");

function showMessage(text, type) {
  msg.className = `message ${type}`;
  msg.textContent = text;
}

function normalizeUsername(v) {
  return v.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function toInternalEmail(v) {
  return `${normalizeUsername(v)}@iwa.local`;
}

(async () => {
  try {
    const { data: { session } } = await db.auth.getSession();
    if (session?.user?.app_metadata?.role === "admin") {
      location.href = "admin.html";
    }
  } catch (e) {
    console.error(e);
  }
})();

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const raw = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  const email = raw.includes("@") ? raw : toInternalEmail(raw);

  showMessage("Connexion...", "info");

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(error);
    showMessage("Identifiant ou mot de passe incorrect.", "error");
    return;
  }

  if (data.user?.app_metadata?.role !== "admin") {
    await db.auth.signOut();
    showMessage("Ce compte n'est pas autorisé.", "error");
    return;
  }

  location.href = "admin.html";
});
