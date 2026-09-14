import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Non connecté." }, 401);

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userData } = await caller.auth.getUser();
  const user = userData.user;

  if (!user || user.app_metadata?.role !== "admin") {
    return json({ error: "Accès refusé." }, 403);
  }

  const { username, password } = await req.json();
  const clean = String(username || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");

  if (clean.length < 3) return json({ error: "Identifiant trop court." }, 400);
  if (String(password || "").length < 8) return json({ error: "Mot de passe trop court." }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await admin.auth.admin.createUser({
    email: `${clean}@iwa.local`,
    password,
    email_confirm: true,
    user_metadata: { username: clean },
    app_metadata: { role: "admin" }
  });

  if (error) return json({ error: error.message }, 400);

  return json({ success: true, username: clean });
});
