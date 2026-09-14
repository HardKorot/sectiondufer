const SUPER_ADMIN_EMAIL = "sachotromain@gmail.com";
let currentUser = null;

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function showMessage(text,type="info") {
  const el=document.getElementById("accountMessage");
  el.className=`message ${type}`;
  el.textContent=text;
}

async function guardSuperAdmin() {
  try {
    const { data: { session }, error } = await db.auth.getSession();
    if (error) throw error;

    if (!session) {
      location.href="login.html";
      return false;
    }

    currentUser=session.user;

    if ((currentUser.email || "").toLowerCase() !== SUPER_ADMIN_EMAIL) {
      document.getElementById("loadingGuard").innerHTML =
        'Accès refusé.<br><br><a class="nav-btn" href="admin.html">Retour aux dossiers</a>';
      return false;
    }

    document.getElementById("adminName").textContent=currentUser.email;
    document.getElementById("loadingGuard").classList.add("hidden");
    document.getElementById("usersApp").classList.remove("hidden");
    return true;
  } catch(e) {
    console.error(e);
    document.getElementById("loadingGuard").textContent="Erreur de connexion.";
    return false;
  }
}

async function invokeUserAdmin(action,payload={}) {
  const { data,error }=await db.functions.invoke("manage-iwa-users",{
    body:{action,...payload}
  });

  if(error) {
    console.error(error);
    throw new Error("La fonction de gestion des utilisateurs a renvoyé une erreur.");
  }
  if(data?.error) throw new Error(data.error);
  return data;
}

async function loadUsers() {
  const list=document.getElementById("usersList");
  list.innerHTML='<div class="empty">Chargement...</div>';

  try {
    const data=await invokeUserAdmin("list");
    const users=data.users||[];

    if(!users.length){
      list.innerHTML='<div class="empty">Aucun utilisateur.</div>';
      return;
    }

    list.innerHTML=users.map(u=>`
      <div class="user-card">
        <div class="user-info">
          <strong>${escapeHtml(u.username || u.email || "Utilisateur")}</strong>
          <span>${escapeHtml(u.email || "")}</span>
        </div>
        <div class="user-actions">
          ${(u.email||"").toLowerCase()===SUPER_ADMIN_EMAIL
            ? '<span class="badge">SUPER ADMIN</span>'
            : `
              <button class="secondary small" onclick="resetPassword('${u.id}','${escapeHtml(u.username || u.email || "")}')">Changer le mot de passe</button>
              <button class="danger small" onclick="deleteUser('${u.id}','${escapeHtml(u.username || u.email || "")}')">Supprimer</button>
            `
          }
        </div>
      </div>
    `).join("");
  } catch(e) {
    list.innerHTML=`<div class="message error">${escapeHtml(e.message)}</div>`;
  }
}

async function resetPassword(userId,label) {
  const password=prompt(`Nouveau mot de passe pour "${label}" :`);
  if(!password) return;
  if(password.length<8){
    alert("8 caractères minimum.");
    return;
  }

  try{
    await invokeUserAdmin("reset_password",{user_id:userId,password});
    alert("Mot de passe modifié.");
  }catch(e){
    alert(e.message);
  }
}

async function deleteUser(userId,label){
  if(!confirm(`Supprimer définitivement "${label}" ?`)) return;

  try{
    await invokeUserAdmin("delete",{user_id:userId});
    await loadUsers();
  }catch(e){
    alert(e.message);
  }
}

document.getElementById("createAccountForm").addEventListener("submit",async(e)=>{
  e.preventDefault();

  const username=document.getElementById("newUsername").value
    .trim().toLowerCase().replace(/[^a-z0-9._-]/g,"");
  const password=document.getElementById("newPassword").value;
  const confirmPassword=document.getElementById("confirmPassword").value;

  if(username.length<3) return showMessage("Identifiant trop court.","error");
  if(password.length<8) return showMessage("Mot de passe : 8 caractères minimum.","error");
  if(password!==confirmPassword) return showMessage("Les mots de passe ne correspondent pas.","error");

  try{
    showMessage("Création...","info");
    await invokeUserAdmin("create",{username,password});
    showMessage(`Compte "${username}" créé.`,"success");
    e.target.reset();
    await loadUsers();
  }catch(e){
    showMessage(e.message,"error");
  }
});

document.querySelectorAll(".password-toggle").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const input=document.getElementById(btn.dataset.target);
    const visible=input.type==="text";
    input.type=visible?"password":"text";
    btn.textContent=visible?"Afficher":"Masquer";
  });
});

document.getElementById("reloadUsersBtn").addEventListener("click",loadUsers);

document.getElementById("logoutBtn").addEventListener("click",async()=>{
  await db.auth.signOut();
  location.href="login.html";
});

(async()=>{
  const ok=await guardSuperAdmin();
  if(ok) await loadUsers();
})();
