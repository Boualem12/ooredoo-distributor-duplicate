import { createServerFn } from "@tanstack/react-start";

export const getPublicCounter = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ count: total }, { count: votes }] = await Promise.all([
    supabaseAdmin.from("authorized_participants").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("responses").select("*", { count: "exact", head: true }),
  ]);
  return { total: total ?? 0, votes: votes ?? 0 };
});
