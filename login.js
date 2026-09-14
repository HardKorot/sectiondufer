const form = document.getElementById("loginForm");
const message = document.getElementById("loginMessage");
function showMessage(text,type){ message.className=`message ${type}`; message.textContent=text; }
function normalizeUsername(v){ return v.trim().toLowerCase().replace(/[^a-z0-9._-]/g,""); }
function usernameToInternalEmail(u){ return `${normalizeUsername(u)}@iwa.local`; }
(async()=>{ const {data:{session}}=await db.auth.getSession(); if(session?.user?.app_metadata?.role==="admin") window.location.href="admin.html"; })();
form.addEventListener("submit",async(e)=>{
 e.preventDefault();
 const raw=document.getElementById("username").value.trim();
 const password=document.getElementById("password").value;
 if(!raw){ showMessage("Entre ton identifiant.","error"); return; }
 const email=raw.includes("@")?raw:usernameToInternalEmail(raw);
 showMessage("Connexion...","info");
 const {data,error}=await db.auth.signInWithPassword({email,password});
 if(error){ console.error(error); showMessage("Identifiant ou mot de passe incorrect.","error"); return; }
 if(data.user?.app_metadata?.role!=="admin"){ await db.auth.signOut(); showMessage("Ce compte n'est pas autorisé.","error"); return; }
 window.location.href="admin.html";
});