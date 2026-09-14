let allCases = [];
let currentUser = null;
let currentCase = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function caseNumber(id) {
  return `IWA-${String(id).padStart(4, "0")}`;
}

function formatDate(value) {
  if (!value) return "Non définie";
  return new Date(value + (value.length === 10 ? "T12:00:00" : "")).toLocaleDateString("fr-FR");
}

function showAdminMessage(text, type="info") {
  const box = document.getElementById("adminMessage");
  box.className = `message ${type}`;
  box.textContent = text;
}

function hideAdminMessage() {
  document.getElementById("adminMessage").classList.add("hidden");
}

async function guardAdmin() {
  const { data: { session } } = await db.auth.getSession();
  if (!session || session.user?.app_metadata?.role !== "admin") {
    window.location.href = "login.html";
    return null;
  }

  currentUser = session.user;
  document.getElementById("adminEmail").textContent = currentUser.user_metadata?.username || "Administrateur";
  document.getElementById("loadingGuard").classList.add("hidden");
  document.getElementById("adminApp").classList.remove("hidden");
  return currentUser;
}

function updateStats() {
  const active = allCases.filter(c => !c.archive);
  document.getElementById("statTotal").textContent = active.length;
  document.getElementById("statPending").textContent = active.filter(c => c.statut === "En attente").length;
  document.getElementById("statOpen").textContent = active.filter(c => ["En enquête", "Audience prévue"].includes(c.statut)).length;
  document.getElementById("statArchived").textContent = allCases.filter(c => c.archive).length;
}

function applyFilters() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const archiveFilter = document.getElementById("archiveFilter").value;

  const filtered = allCases.filter(c => {
    const haystack = [
      caseNumber(c.id), c.plaignant, c.accuse, c.motif, c.lieu,
      c.temoins, c.description, c.statut, c.responsable, c.decision, c.sanction
    ].join(" ").toLowerCase();

    const matchesArchive =
      archiveFilter === "all" ||
      (archiveFilter === "active" && !c.archive) ||
      (archiveFilter === "archived" && c.archive);

    return (!q || haystack.includes(q))
      && (!status || c.statut === status)
      && matchesArchive;
  });

  renderCases(filtered);
}

function renderCases(cases) {
  const list = document.getElementById("casesList");

  if (!cases.length) {
    list.innerHTML = '<div class="empty">Aucun dossier trouvé.</div>';
    return;
  }

  list.innerHTML = cases.map(c => `
    <article class="case-card ${c.archive ? "archived-card" : ""}">
      <div class="case-header">
        <div>
          <div class="case-number">#${caseNumber(c.id)}</div>
          <h3>${escapeHtml(c.motif)} — ${escapeHtml(c.plaignant)}</h3>
          <div class="case-sub">${escapeHtml(c.plaignant)} contre ${escapeHtml(c.accuse)}</div>
        </div>
        <div class="badge-stack">
          <span class="badge">${escapeHtml(c.statut)}</span>
          ${c.archive ? '<span class="badge muted-badge">ARCHIVÉ</span>' : ''}
        </div>
      </div>

      <div class="case-grid compact">
        <div><span>Responsable</span><strong>${escapeHtml(c.responsable || "Non assigné")}</strong></div>
        <div><span>Lieu</span><strong>${escapeHtml(c.lieu)}</strong></div>
        <div><span>Audience</span><strong>${formatDate(c.date_audience)}</strong></div>
        <div><span>Créé le</span><strong>${formatDate(c.created_at?.slice(0,10))}</strong></div>
      </div>

      <div class="card-footer">
        <button class="primary small" onclick="openCase(${c.id})">Ouvrir le dossier</button>
      </div>
    </article>
  `).join("");
}

async function loadCases() {
  hideAdminMessage();

  const { data, error } = await db
    .from("plaintes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    showAdminMessage("Impossible de charger les dossiers. Vérifie que la migration SQL a bien été exécutée.", "error");
    return;
  }

  allCases = data || [];
  updateStats();
  applyFilters();
}

async function openCase(id) {
  currentCase = allCases.find(c => c.id === id);
  if (!currentCase) return;

  const c = currentCase;
  document.getElementById("modalTitle").textContent = `#${caseNumber(c.id)} — ${c.motif}`;

  document.getElementById("modalBody").innerHTML = `
    <div class="detail-grid">
      <div><span>Plaignant</span><strong>${escapeHtml(c.plaignant)}</strong></div>
      <div><span>Accusé</span><strong>${escapeHtml(c.accuse)}</strong></div>
      <div><span>Lieu</span><strong>${escapeHtml(c.lieu)}</strong></div>
      <div><span>Date des faits</span><strong>${formatDate(c.date_faits)}</strong></div>
    </div>

    <div class="detail-block">
      <span>Témoins</span>
      <p>${escapeHtml(c.temoins || "Aucun")}</p>
    </div>

    <div class="detail-block">
      <span>Description</span>
      <p>${escapeHtml(c.description)}</p>
    </div>

    <hr class="separator">

    <div class="section-title small-title">
      <p class="kicker">TRAITEMENT DU DOSSIER</p>
      <h3>Suivi judiciaire</h3>
    </div>

    <div class="grid">
      <label>Statut
        <select id="editStatut">
          ${["En attente","En enquête","Audience prévue","Jugement rendu","Classée"]
            .map(s => `<option ${s === c.statut ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </label>

      <label>Responsable du dossier
        <input id="editResponsable" value="${escapeHtml(c.responsable || "")}" placeholder="Ex. Chef de la section du Fer">
      </label>
    </div>

    <div class="grid">
      <label>Date d'audience
        <input id="editAudience" type="date" value="${escapeHtml(c.date_audience || "")}">
      </label>

      <label>Archivage
        <select id="editArchive">
          <option value="false" ${!c.archive ? "selected" : ""}>Dossier actif</option>
          <option value="true" ${c.archive ? "selected" : ""}>Archivé</option>
        </select>
      </label>
    </div>

    <label>Décision judiciaire
      <textarea id="editDecision" rows="4" placeholder="Décision rendue...">${escapeHtml(c.decision || "")}</textarea>
    </label>

    <label>Sanction / peine
      <textarea id="editSanction" rows="3" placeholder="Peine, sanction, réparation...">${escapeHtml(c.sanction || "")}</textarea>
    </label>

    <button class="primary full" onclick="saveCase()">Enregistrer les modifications</button>

    <hr class="separator">

    <div class="section-title small-title">
      <p class="kicker">DOSSIER INTERNE</p>
      <h3>Notes de la justice</h3>
    </div>

    <div id="notesList" class="notes-list">
      <div class="empty">Chargement des notes...</div>
    </div>

    <label>Ajouter une note interne
      <textarea id="newNote" rows="4" placeholder="Compte rendu d'interrogatoire, information complémentaire, consigne..."></textarea>
    </label>
    <button class="secondary full" onclick="addNote()">Ajouter la note</button>

    <div class="danger-zone">
      <h3>Zone sensible</h3>
      <p>La suppression est définitive et effacera également les notes du dossier.</p>
      <button class="danger" onclick="deleteCurrentCase()">Supprimer définitivement ce dossier</button>
    </div>
  `;

  document.getElementById("caseModal").classList.remove("hidden");
  document.body.classList.add("modal-open");
  await loadNotes(c.id);
}

function closeCaseModal() {
  document.getElementById("caseModal").classList.add("hidden");
  document.body.classList.remove("modal-open");
  currentCase = null;
}

async function saveCase() {
  if (!currentCase) return;

  const payload = {
    statut: document.getElementById("editStatut").value,
    responsable: document.getElementById("editResponsable").value.trim() || null,
    date_audience: document.getElementById("editAudience").value || null,
    decision: document.getElementById("editDecision").value.trim() || null,
    sanction: document.getElementById("editSanction").value.trim() || null,
    archive: document.getElementById("editArchive").value === "true",
    updated_at: new Date().toISOString()
  };

  const { error } = await db.from("plaintes").update(payload).eq("id", currentCase.id);

  if (error) {
    alert("Erreur lors de l'enregistrement.");
    console.error(error);
    return;
  }

  await loadCases();
  currentCase = allCases.find(c => c.id === currentCase.id);
  alert("Dossier mis à jour.");
  openCase(currentCase.id);
}

async function loadNotes(plainteId) {
  const list = document.getElementById("notesList");

  const { data, error } = await db
    .from("notes_plainte")
    .select("*")
    .eq("plainte_id", plainteId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    list.innerHTML = '<div class="message error">Impossible de charger les notes.</div>';
    return;
  }

  if (!data?.length) {
    list.innerHTML = '<div class="empty">Aucune note interne pour ce dossier.</div>';
    return;
  }

  list.innerHTML = data.map(note => `
    <div class="note">
      <div class="note-head">
        <strong>${escapeHtml(note.auteur_email || "Justice d'Iwa")}</strong>
        <span>${new Date(note.created_at).toLocaleString("fr-FR")}</span>
      </div>
      <p>${escapeHtml(note.contenu)}</p>
      <button class="note-delete" onclick="deleteNote(${note.id})">Supprimer</button>
    </div>
  `).join("");
}

async function addNote() {
  if (!currentCase) return;

  const textarea = document.getElementById("newNote");
  const contenu = textarea.value.trim();
  if (!contenu) return;

  const { error } = await db.from("notes_plainte").insert({
    plainte_id: currentCase.id,
    contenu,
    auteur_email: currentUser.user_metadata?.username || currentUser.email || "Administrateur"
  });

  if (error) {
    alert("Impossible d'ajouter la note.");
    console.error(error);
    return;
  }

  textarea.value = "";
  await loadNotes(currentCase.id);
}

async function deleteNote(id) {
  if (!confirm("Supprimer cette note interne ?")) return;
  const { error } = await db.from("notes_plainte").delete().eq("id", id);
  if (error) {
    alert("Impossible de supprimer la note.");
    return;
  }
  await loadNotes(currentCase.id);
}

async function deleteCurrentCase() {
  if (!currentCase) return;
  if (!confirm(`Supprimer définitivement le dossier #${caseNumber(currentCase.id)} ?`)) return;

  const { error } = await db.from("plaintes").delete().eq("id", currentCase.id);
  if (error) {
    alert("Impossible de supprimer le dossier.");
    console.error(error);
    return;
  }

  closeCaseModal();
  await loadCases();
  showAdminMessage("Dossier supprimé définitivement.", "success");
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await db.auth.signOut();
  window.location.href = "login.html";
});

document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("statusFilter").addEventListener("change", applyFilters);
document.getElementById("archiveFilter").addEventListener("change", applyFilters);
document.getElementById("refreshBtn").addEventListener("click", loadCases);

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeCaseModal();
});

(async () => {
  const user = await guardAdmin();
  if (user) await loadCases();
})();
\nfunction openAccountsModal(){document.getElementById("accountsModal").classList.remove("hidden");document.body.classList.add("modal-open");}\nfunction closeAccountsModal(){document.getElementById("accountsModal").classList.add("hidden");document.body.classList.remove("modal-open");document.getElementById("createAccountForm").reset();}\nfunction showAccountMessage(text,type="info"){const b=document.getElementById("accountMessage");b.className=`message ${type}`;b.textContent=text;}\nfunction normalizeUsername(v){return v.trim().toLowerCase().replace(/[^a-z0-9._-]/g,"");}\ndocument.getElementById("accountsBtn").addEventListener("click",openAccountsModal);\ndocument.getElementById("createAccountForm").addEventListener("submit",async(e)=>{\n e.preventDefault(); const username=normalizeUsername(document.getElementById("newUsername").value); const password=document.getElementById("newPassword").value; const confirm=document.getElementById("confirmPassword").value;\n if(username.length<3){showAccountMessage("L'identifiant doit contenir au moins 3 caractères.","error");return;}\n if(password.length<8){showAccountMessage("Le mot de passe doit contenir au moins 8 caractères.","error");return;}\n if(password!==confirm){showAccountMessage("Les deux mots de passe ne correspondent pas.","error");return;}\n showAccountMessage("Création du compte...","info");\n const {data,error}=await db.functions.invoke("create-iwa-user",{body:{username,password}});\n if(error){console.error(error);showAccountMessage("Impossible de créer le compte. Vérifie la Edge Function.","error");return;}\n if(data?.error){showAccountMessage(data.error,"error");return;}\n showAccountMessage(`Compte \"${username}\" créé avec succès.`,"success"); document.getElementById("createAccountForm").reset();\n});\n