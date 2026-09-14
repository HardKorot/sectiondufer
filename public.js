function displayMessage(el, text, type) {
  el.className = `message ${type}`;
  el.textContent = text;
}

document.getElementById("complaintForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const success = document.getElementById("successBox");
  const errorBox = document.getElementById("errorBox");
  success.classList.add("hidden");
  errorBox.classList.add("hidden");

  const payload = {
    plaignant: document.getElementById("plaignant").value.trim(),
    accuse: document.getElementById("accuse").value.trim(),
    motif: document.getElementById("motif").value,
    lieu: document.getElementById("lieu").value.trim(),
    date_faits: document.getElementById("dateFaits").value,
    temoins: document.getElementById("temoins").value.trim() || null,
    description: document.getElementById("description").value.trim(),
    statut: "En attente",
    archive: false
  };

  const { data, error } = await db
    .from("plaintes")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error(error);
    displayMessage(errorBox, "Erreur : la plainte n'a pas pu être enregistrée.", "error");
    return;
  }

  displayMessage(
    success,
    `Plainte enregistrée. Numéro du dossier : #IWA-${String(data.id).padStart(4, "0")}`,
    "success"
  );
  event.target.reset();
});
