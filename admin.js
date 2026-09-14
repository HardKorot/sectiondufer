setTimeout(() => {
  const loader = document.getElementById("loadingGuard");
  const app = document.getElementById("adminApp");
  if (loader && !loader.classList.contains("hidden") && app && app.classList.contains("hidden")) {
    loader.innerHTML = 'La vérification prend trop de temps.<br><br><a class="nav-btn" href="login.html">Retour à la connexion</a>';
  }
}, 6000);

let allCases = [];
let currentUser = null;
let currentCase = null;
const SUPER_ADMIN_EMAIL = "sachotromain@gmail.com";

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function fmtDate(v) {
  if (!v) return "Non définie";
  return new Date(v + (String(v).length === 10 ? "T12:00:00" : "")).toLocaleDateString("fr-FR");
}

function caseNumber(id) {
  return `IWA-${String(id).padStart(4,"0")}`;
}

function showAdminMessage(text,type="info") {
  const el=document.getElementById("adminMessage");
  el.className=`message ${type}`;
  el.textContent=text;
}

async function guardAdmin() {
  try {
    const { data: { session }, error } = await db.auth.getSession();
    if (error) throw error;

    if (!session || session.user?.app_metadata?.role !== "admin") {
      location.href="login.html";
      return false;
    }

    currentUser=session.user;
    document.getElementById("adminName").textContent =
      currentUser.user_metadata?.username || currentUser.email || "Administrateur";

    if ((currentUser.email || "").toLowerCase() === SUPER_ADMIN_EMAIL) {
      document.getElementById("accountsBtn").classList.remove("hidden");
    }

    document.getElementById("loadingGuard").classList.add("hidden");
    document.getElementById("adminApp").classList.remove("hidden");
    return true;
  } catch (e) {
    console.error("Guard error:", e);
    const loader = document.getElementById("loadingGuard");
    loader.innerHTML = "Erreur de connexion.<br><small>" +
      String(e?.message || e) + "</small><br><br><a href=\"login.html\" class=\"nav-btn\">Retour à la connexion</a>";
    return false;
  }
}

async function loadCases() {
  const { data, error } = await db.from("plaintes").select("*").order("created_at",{ascending:false});
  if (error) {
    console.error(error);
    showAdminMessage(`Erreur : ${error.message}`,"error");
    return;
  }
  allCases=data||[];
  updateStats();
  applyFilters();
}

function updateStats() {
  const active=allCases.filter(c=>!c.archive);
  document.getElementById("statTotal").textContent=active.length;
  document.getElementById("statPending").textContent=active.filter(c=>c.statut==="En attente").length;
  document.getElementById("statOpen").textContent=active.filter(c=>["En enquête","Audience prévue"].includes(c.statut)).length;
  document.getElementById("statArchived").textContent=allCases.filter(c=>c.archive).length;
}

function applyFilters() {
  const q=document.getElementById("searchInput").value.toLowerCase().trim();
  const status=document.getElementById("statusFilter").value;
  const arch=document.getElementById("archiveFilter").value;

  const filtered=allCases.filter(c=>{
    const text=[caseNumber(c.id),c.plaignant,c.accuse,c.motif,c.lieu,c.temoins,c.description,c.statut,c.responsable,c.decision,c.sanction].join(" ").toLowerCase();
    const archiveOk=arch==="all"||(arch==="active"&&!c.archive)||(arch==="archived"&&c.archive);
    return (!q||text.includes(q)) && (!status||c.statut===status) && archiveOk;
  });
  renderCases(filtered);
}

function renderCases(cases) {
  const list=document.getElementById("casesList");
  if (!cases.length) {
    list.innerHTML='<div class="empty">Aucun dossier.</div>';
    return;
  }

  list.innerHTML=cases.map(c=>`
    <article class="case-card ${c.archive?"archived-card":""}">
      <div class="case-header">
        <div>
          <div class="case-number">#${caseNumber(c.id)}</div>
          <h3>${escapeHtml(c.motif)} — ${escapeHtml(c.plaignant)}</h3>
          <div class="case-sub">${escapeHtml(c.plaignant)} contre ${escapeHtml(c.accuse)}</div>
        </div>
        <span class="badge">${escapeHtml(c.statut||"En attente")}</span>
      </div>
      <div class="case-grid">
        <div><span>Responsable</span><strong>${escapeHtml(c.responsable||"Non assigné")}</strong></div>
        <div><span>Lieu</span><strong>${escapeHtml(c.lieu)}</strong></div>
        <div><span>Audience</span><strong>${fmtDate(c.date_audience)}</strong></div>
        <div><span>Archive</span><strong>${c.archive?"Oui":"Non"}</strong></div>
      </div>
      <button class="primary small" onclick="openCase(${c.id})">Ouvrir le dossier</button>
    </article>
  `).join("");
}

async function openCase(id) {
  currentCase=allCases.find(c=>c.id===id);
  if (!currentCase) return;
  const c=currentCase;

  document.getElementById("modalTitle").textContent=`#${caseNumber(c.id)} — ${c.motif}`;
  document.getElementById("modalBody").innerHTML=`
    <div class="detail-grid">
      <div><span>Plaignant</span><strong>${escapeHtml(c.plaignant)}</strong></div>
      <div><span>Accusé</span><strong>${escapeHtml(c.accuse)}</strong></div>
      <div><span>Lieu</span><strong>${escapeHtml(c.lieu)}</strong></div>
      <div><span>Date</span><strong>${fmtDate(c.date_faits)}</strong></div>
    </div>

    <div class="detail-block"><span>Témoins</span><p>${escapeHtml(c.temoins||"Aucun")}</p></div>
    <div class="detail-block"><span>Description</span><p>${escapeHtml(c.description)}</p></div>

    <hr class="separator">

    <div class="grid">
      <label>Statut
        <select id="editStatut">
          ${["En attente","En enquête","Audience prévue","Jugement rendu","Classée"].map(s=>`<option ${s===c.statut?"selected":""}>${s}</option>`).join("")}
        </select>
      </label>
      <label>Responsable<input id="editResponsable" value="${escapeHtml(c.responsable||"")}"></label>
    </div>

    <div class="grid">
      <label>Date d'audience<input id="editAudience" type="date" value="${escapeHtml(c.date_audience||"")}"></label>
      <label>Archivage
        <select id="editArchive">
          <option value="false" ${!c.archive?"selected":""}>Actif</option>
          <option value="true" ${c.archive?"selected":""}>Archivé</option>
        </select>
      </label>
    </div>

    <label>Décision<textarea id="editDecision">${escapeHtml(c.decision||"")}</textarea></label>
    <label>Sanction<textarea id="editSanction">${escapeHtml(c.sanction||"")}</textarea></label>
    <button class="primary full" onclick="saveCase()">Enregistrer</button>

    <hr class="separator">
    <h3>Notes internes</h3>
    <div id="notesList" class="notes-list"></div>
    <label>Ajouter une note<textarea id="newNote"></textarea></label>
    <button class="secondary full" onclick="addNote()">Ajouter la note</button>
  `;

  document.getElementById("caseModal").classList.remove("hidden");
  await loadNotes(c.id);
}

function closeCaseModal() {
  document.getElementById("caseModal").classList.add("hidden");
}

async function saveCase() {
  if (!currentCase) return;

  const payload={
    statut:document.getElementById("editStatut").value,
    responsable:document.getElementById("editResponsable").value.trim()||null,
    date_audience:document.getElementById("editAudience").value||null,
    decision:document.getElementById("editDecision").value.trim()||null,
    sanction:document.getElementById("editSanction").value.trim()||null,
    archive:document.getElementById("editArchive").value==="true",
    updated_at:new Date().toISOString()
  };

  const { error }=await db.from("plaintes").update(payload).eq("id",currentCase.id);
  if (error) {
    alert(error.message);
    return;
  }
  await loadCases();
  closeCaseModal();
}

async function loadNotes(plainteId) {
  const list=document.getElementById("notesList");
  const { data,error }=await db.from("notes_plainte").select("*").eq("plainte_id",plainteId).order("created_at",{ascending:false});
  if (error) {
    list.innerHTML=`<div class="message error">${escapeHtml(error.message)}</div>`;
    return;
  }
  list.innerHTML=(data||[]).length ? data.map(n=>`
    <div class="note">
      <strong>${escapeHtml(n.auteur_email||"Justice d'Iwa")}</strong>
      <p>${escapeHtml(n.contenu)}</p>
      <button class="note-delete" onclick="deleteNote(${n.id})">Supprimer</button>
    </div>
  `).join("") : '<div class="empty">Aucune note.</div>';
}

async function addNote() {
  const contenu=document.getElementById("newNote").value.trim();
  if (!contenu||!currentCase) return;

  const { error }=await db.from("notes_plainte").insert({
    plainte_id:currentCase.id,
    contenu,
    auteur_email:currentUser.user_metadata?.username || currentUser.email || "Administrateur"
  });

  if (error) {
    alert(error.message);
    return;
  }
  document.getElementById("newNote").value="";
  await loadNotes(currentCase.id);
}

async function deleteNote(id) {
  if (!confirm("Supprimer cette note ?")) return;
  const { error }=await db.from("notes_plainte").delete().eq("id",id);
  if (error) {
    alert(error.message);
    return;
  }
  await loadNotes(currentCase.id);
}


document.getElementById("logoutBtn").addEventListener("click",async()=>{
  await db.auth.signOut();
  location.href="login.html";
});

document.getElementById("searchInput").addEventListener("input",applyFilters);
document.getElementById("statusFilter").addEventListener("change",applyFilters);
document.getElementById("archiveFilter").addEventListener("change",applyFilters);
document.getElementById("refreshBtn").addEventListener("click",loadCases);

(async()=>{
  const ok=await guardAdmin();
  if (ok) await loadCases();
})();
