function displayMessage(el, text, type) {
  el.className = `message ${type}`;
  el.textContent = text;
}

const form = document.getElementById("complaintForm");
const submitButton = form.querySelector('button[type="submit"]');

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const success = document.getElementById("successBox");
  const errorBox = document.getElementById("errorBox");

  success.classList.add("hidden");
  errorBox.classList.add("hidden");

  submitButton.disabled = true;
  const oldText = submitButton.textContent;
  submitButton.textContent = "Transmission...";

  try {
    const payload = {
      plaignant: document.getElementById("plaignant").value.trim(),
      accuse: document.getElementById("accuse").value.trim(),
      motif: document.getElementById("motif").value,
      lieu: document.getElementById("lieu").value.trim(),
      date_faits: document.getElementById("dateFaits").value,
      temoins: document.getElementById("temoins").value.trim() || null,
      description: document.getElementById("description").value.trim()
    };

    console.log("Tentative d'envoi de plainte :", payload);

    const { error } = await db
      .from("plaintes")
      .insert([payload]);

    if (error) {
      console.error("Erreur Supabase :", error);

      displayMessage(
        errorBox,
        `Erreur Supabase : ${error.message}${error.code ? ` (code ${error.code})` : ""}`,
        "error"
      );
      return;
    }

    displayMessage(
      success,
      "Plainte transmise avec succès à la justice d'Iwa.",
      "success"
    );

    form.reset();
  } catch (err) {
    console.error("Erreur JavaScript :", err);

    displayMessage(
      errorBox,
      `Erreur JavaScript : ${err.message || err}`,
      "error"
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = oldText;
  }
});
