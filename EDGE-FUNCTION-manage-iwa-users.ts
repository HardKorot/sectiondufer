import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPER_ADMIN_EMAIL = "sachotromain@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeUsername(v: string) {
  return v.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non connecté." }, 401);

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: userData, error: userError } = await caller.auth.getUser();
    const callerUser = userData.user;

    if (userError || !callerUser) return json({ error: "Session invalide." }, 401);

    if ((callerUser.email || "").toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return json({ error: "Accès réservé au super administrateur." }, 403);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "list") {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) return json({ error: error.message }, 400);

      return json({
        users: (data.users || []).map((u) => ({
          id: u.id,
          email: u.email,
          username: u.user_metadata?.username || null,
          created_at: u.created_at
        }))
      });
    }

    if (action === "create") {
      const username = normalizeUsername(String(body?.username || ""));
      const password = String(body?.password || "");

      if (username.length < 3) return json({ error: "Identifiant trop court." }, 400);
      if (password.length < 8) return json({ error: "Mot de passe trop court." }, 400);

      const { data, error } = await admin.auth.admin.createUser({
        email: `${username}@iwa.local`,
        password,
        email_confirm: true,
        user_metadata: { username },
        app_metadata: { role: "admin" }
      });

      if (error) return json({ error: error.message }, 400);
      return json({ success: true, id: data.user?.id });
    }

    if (action === "reset_password") {
      const userId = String(body?.user_id || "");
      const password = String(body?.password || "");

      if (!userId) return json({ error: "Utilisateur invalide." }, 400);
      if (password.length < 8) return json({ error: "Mot de passe trop court." }, 400);

      const { data: target, error: targetError } = await admin.auth.admin.getUserById(userId);
      if (targetError || !target.user) return json({ error: "Utilisateur introuvable." }, 404);

      if ((target.user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL) {
        return json({ error: "Le mot de passe du super administrateur ne peut pas être modifié ici." }, 403);
      }

      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "delete") {
      const userId = String(body?.user_id || "");
      if (!userId) return json({ error: "Utilisateur invalide." }, 400);

      const { data: target, error: targetError } = await admin.auth.admin.getUserById(userId);
      if (targetError || !target.user) return json({ error: "Utilisateur introuvable." }, 404);

      if ((target.user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL) {
        return json({ error: "Le super administrateur ne peut pas être supprimé." }, 403);
      }

      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Action inconnue." }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Erreur interne." }, 500);
  }
});
