import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DISTRIBUTEURS, normalizeMsisdn } from "./survey-constants";

export const supervisorLogin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      username: z.string().min(1).max(100),
      password: z.string().min(1).max(200),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getSupervisorSession } = await import("./supervisor-session.server");

    const username = data.username.trim().toLowerCase();
    const { data: sup, error } = await supabaseAdmin
      .from("supervisors")
      .select("username, password")
      .eq("username", username)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sup || sup.password !== data.password) {
      throw new Error("Identifiants invalides.");
    }
    const session = await getSupervisorSession();
    await session.update({ username: sup.username, loggedAt: Date.now() });
    return { ok: true, username: sup.username };
  });

export const supervisorLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getSupervisorSession } = await import("./supervisor-session.server");
  const session = await getSupervisorSession();
  await session.clear();
  return { ok: true };
});

export const supervisorMe = createServerFn({ method: "GET" }).handler(async () => {
  const { getSupervisorSession } = await import("./supervisor-session.server");
  const session = await getSupervisorSession();
  return { username: session.data.username ?? null };
});

async function requireSupervisor(): Promise<string> {
  const { getSupervisorSession } = await import("./supervisor-session.server");
  const session = await getSupervisorSession();
  if (!session.data.username) throw new Error("Non authentifié.");
  return session.data.username;
}

export const supervisorListMsisdns = createServerFn({ method: "GET" }).handler(async () => {
  const username = await requireSupervisor();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: pdvs, error } = await supabaseAdmin
    .from("authorized_participants")
    .select("msisdn, nom_pdv, wilaya, region, distributeur_actuel")
    .eq("supervisor_username", username)
    .order("nom_pdv", { ascending: true });
  if (error) throw new Error(error.message);

  const msisdns = (pdvs ?? []).map((p) => p.msisdn);
  const { data: responses } = msisdns.length
    ? await supabaseAdmin
        .from("responses")
        .select("msisdn, choix_1, choix_2, choix_3, choix_4, created_at")
        .in("msisdn", msisdns)
    : { data: [] as Array<{ msisdn: string; choix_1: string; choix_2: string; choix_3: string; choix_4: string; created_at: string }> };

  const respMap = new Map((responses ?? []).map((r) => [r.msisdn, r]));
  const rows = (pdvs ?? []).map((p) => ({
    ...p,
    response: respMap.get(p.msisdn) ?? null,
  }));
  return { rows };
});

export const supervisorSubmitFor = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      msisdn: z.string().min(8).max(20),
      choix_1: z.enum(DISTRIBUTEURS),
      choix_2: z.enum(DISTRIBUTEURS),
      choix_3: z.enum(DISTRIBUTEURS),
      choix_4: z.enum(DISTRIBUTEURS),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const username = await requireSupervisor();
    const choices = [data.choix_1, data.choix_2, data.choix_3, data.choix_4];
    if (new Set(choices).size !== 4) {
      throw new Error("Chaque distributeur doit être sélectionné une seule fois.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const msisdn = normalizeMsisdn(data.msisdn);

    const { data: participant } = await supabaseAdmin
      .from("authorized_participants")
      .select("msisdn, supervisor_username")
      .eq("msisdn", msisdn)
      .maybeSingle();
    if (!participant) throw new Error("MSISDN introuvable.");
    if (participant.supervisor_username !== username) {
      throw new Error("Ce MSISDN n'est pas assigné à votre compte.");
    }

    const { data: existing } = await supabaseAdmin
      .from("responses")
      .select("msisdn")
      .eq("msisdn", msisdn)
      .maybeSingle();
    if (existing) throw new Error("Ce PDV a déjà voté.");

    const { error } = await supabaseAdmin.from("responses").insert({
      msisdn,
      choix_1: data.choix_1,
      choix_2: data.choix_2,
      choix_3: data.choix_3,
      choix_4: data.choix_4,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
