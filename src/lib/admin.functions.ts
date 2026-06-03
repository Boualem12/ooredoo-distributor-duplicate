import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { redirect } from "@tanstack/react-router";
import { DISTRIBUTEURS } from "./survey-constants";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ password: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { getAdminSession, verifyAdminPassword } = await import("./admin-session.server");
    if (!verifyAdminPassword(data.password)) {
      throw new Error("Mot de passe incorrect.");
    }
    const session = await getAdminSession();
    await session.update({ isAdmin: true, loggedAt: Date.now() });
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getAdminSession } = await import("./admin-session.server");
  const session = await getAdminSession();
  await session.clear();
  return { ok: true };
});

export const adminMe = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdminSession } = await import("./admin-session.server");
  const session = await getAdminSession();
  return { isAdmin: !!session.data.isAdmin };
});

async function requireAdmin() {
  const { getAdminSession } = await import("./admin-session.server");
  const session = await getAdminSession();
  if (!session.data.isAdmin) {
    throw redirect({ to: "/admin/login" });
  }
}

export const adminStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ count: total }, { count: votes }, { data: responses }] = await Promise.all([
    supabaseAdmin.from("authorized_participants").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("responses").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("responses").select("msisdn, choix_1, choix_2, choix_3, choix_4").limit(5000),
  ]);
  const msisdns = Array.from(new Set((responses ?? []).map((r) => r.msisdn)));
  const { data: participants } = msisdns.length
    ? await supabaseAdmin.from("authorized_participants").select("msisdn, wilaya, region, distributeur_actuel").in("msisdn", msisdns)
    : { data: [] as Array<{ msisdn: string; wilaya: string; region: string; distributeur_actuel: string }> };

  const partByMsisdn = new Map<string, { wilaya: string; region: string; distributeur_actuel: string }>();
  for (const p of participants ?? []) {
    partByMsisdn.set(p.msisdn, {
      wilaya: p.wilaya,
      region: p.region,
      distributeur_actuel: p.distributeur_actuel,
    });
  }

  const choice1: Record<string, number> = {};
  const choice2: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  const byWilaya: Record<string, number> = {};
  const byDistributeur: Record<string, number> = {};
  for (const d of DISTRIBUTEURS) {
    choice1[d] = 0;
    choice2[d] = 0;
  }

  for (const r of responses ?? []) {
    choice1[r.choix_1] = (choice1[r.choix_1] ?? 0) + 1;
    choice2[r.choix_2] = (choice2[r.choix_2] ?? 0) + 1;
    const p = partByMsisdn.get(r.msisdn);
    if (p) {
      byRegion[p.region] = (byRegion[p.region] ?? 0) + 1;
      byWilaya[p.wilaya] = (byWilaya[p.wilaya] ?? 0) + 1;
      byDistributeur[p.distributeur_actuel] = (byDistributeur[p.distributeur_actuel] ?? 0) + 1;
    }
  }

  const totalCount = total ?? 0;
  const votesCount = votes ?? 0;

  return {
    kpi: {
      total: totalCount,
      votes: votesCount,
      remaining: Math.max(0, totalCount - votesCount),
      rate: totalCount > 0 ? Math.round((votesCount / totalCount) * 1000) / 10 : 0,
    },
    choice1,
    choice2,
    byRegion,
    byWilaya,
    byDistributeur,
  };
});

const rowSchema = z.object({
  msisdn: z.string().min(1),
  nom_pdv: z.string().min(1),
  wilaya: z.string().min(1),
  region: z.string().min(1),
  distributeur_actuel: z.string().min(1),
});

export const adminImport = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        rows: z.array(rowSchema).min(1).max(20000),
        replace: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { normalizeMsisdn } = await import("./survey-constants");

    const cleaned = data.rows
      .map((r) => ({
        msisdn: normalizeMsisdn(r.msisdn),
        nom_pdv: r.nom_pdv.trim(),
        wilaya: r.wilaya.trim(),
        region: r.region.trim(),
        distributeur_actuel: r.distributeur_actuel.trim(),
      }))
      .filter((r) => r.msisdn.length >= 8);

    if (data.replace) {
      const { error: delErr } = await supabaseAdmin
        .from("authorized_participants")
        .delete()
        .neq("msisdn", "__never__");
      if (delErr) throw new Error(delErr.message);
    }

    const chunkSize = 500;
    let inserted = 0;
    for (let i = 0; i < cleaned.length; i += chunkSize) {
      const chunk = cleaned.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin
        .from("authorized_participants")
        .upsert(chunk, { onConflict: "msisdn" });
      if (error) throw new Error(error.message);
      inserted += chunk.length;
    }

    return { ok: true, inserted };
  });

export const adminExport = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: responses } = await supabaseAdmin
    .from("responses")
    .select("msisdn, choix_1, choix_2, choix_3, choix_4, created_at");
  const { data: participants } = await supabaseAdmin
    .from("authorized_participants")
    .select("msisdn, nom_pdv, wilaya, region, distributeur_actuel");

  const partMap = new Map(participants?.map((p) => [p.msisdn, p]) ?? []);
  const rows = (responses ?? []).map((r) => {
    const p = partMap.get(r.msisdn);
    return {
      msisdn: r.msisdn,
      nom_pdv: p?.nom_pdv ?? "",
      wilaya: p?.wilaya ?? "",
      region: p?.region ?? "",
      distributeur_actuel: p?.distributeur_actuel ?? "",
      choix_1: r.choix_1,
      choix_2: r.choix_2,
      choix_3: r.choix_3,
      choix_4: r.choix_4,
      date: r.created_at,
    };
  });
  return { rows };
});

export const adminListResponses = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: responses, error: rErr }] = await Promise.all([
    supabaseAdmin.from("responses").select("msisdn, choix_1, choix_2, choix_3, choix_4, created_at").order("created_at", { ascending: false }).limit(2000),
  ]);
  if (rErr) throw new Error(rErr.message);

  const msisdns = Array.from(new Set((responses ?? []).map((r) => r.msisdn)));
  const { data: participants, error: pErr } = msisdns.length
    ? await supabaseAdmin.from("authorized_participants").select("msisdn, nom_pdv, wilaya, region, distributeur_actuel").in("msisdn", msisdns)
    : { data: [], error: null as null };
  if (pErr) throw new Error(pErr.message);

  const partMap = new Map((participants ?? []).map((p) => [p.msisdn, p]));
  const rows = (responses ?? []).map((r) => {
    const p = partMap.get(r.msisdn);
    return {
      msisdn: r.msisdn,
      nom_pdv: p?.nom_pdv ?? "",
      wilaya: p?.wilaya ?? "",
      region: p?.region ?? "",
      distributeur_actuel: p?.distributeur_actuel ?? "",
      choix_1: r.choix_1,
      choix_2: r.choix_2,
      choix_3: r.choix_3,
      choix_4: r.choix_4,
      created_at: r.created_at,
    };
  });
  return { rows };
});

export const adminDeleteResponse = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ msisdn: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("responses").delete().eq("msisdn", data.msisdn);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
