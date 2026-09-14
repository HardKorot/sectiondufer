const form = document.getElementById("complaintForm");
const successBox = document.getElementById("successBox");
const errorBox = document.getElementById("errorBox");

function showBox(el, text, type) {
  el.className = `message ${type}`;
  el.textContent = text;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  successBox.classList.add("hidden");
  errorBox.classList.add("hidden");

  const payload = {
    plaignant: document.getElementById("plaignant").value.trim(),
    accuse: document.getElementById("accuse").value.trim(),
    motif: document.getElementById("motif").value,
    lieu: document.getElementById("lieu").value.trim(),
    date_faits: document.getElementById("dateFaits").value,
    temoins: document.getElementById("temoins").value.trim() || null,
    description: document.getElementById("description").value.trim()
  };

  const { error } = await db.from("plaintes").insert(payload);

  if (error) {
    console.error(error);
    showBox(errorBox, `Erreur Supabase : ${error.message}`, "error");
    return;
  }

  showBox(successBox, "Plainte transmise avec succès.", "success");
  form.reset();
});
