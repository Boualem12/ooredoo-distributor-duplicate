import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DISTRIBUTEURS, normalizeMsisdn } from "./survey-constants";

const loginSchema = z.object({
  msisdn: z.string().min(8).max(20),
  password: z.string().min(1).max(200),
});

export const checkMsisdn = createServerFn({ method: "POST" })
  .inputValidator((input) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const msisdn = normalizeMsisdn(data.msisdn);

    const { data: participant, error } = await supabaseAdmin
      .from("authorized_participants")
      .select("msisdn, nom_pdv, wilaya, region, distributeur_actuel, password")
      .eq("msisdn", msisdn)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!participant) {
      return { status: "not_authorized" as const };
    }
    if (!participant.password || participant.password !== data.password) {
      return { status: "invalid_password" as const };
    }
    const safe = {
      msisdn: participant.msisdn,
      nom_pdv: participant.nom_pdv,
      wilaya: participant.wilaya,
      region: participant.region,
      distributeur_actuel: participant.distributeur_actuel,
    };

    const { data: existing } = await supabaseAdmin
      .from("responses")
      .select("msisdn")
      .eq("msisdn", msisdn)
      .maybeSingle();

    if (existing) {
      return { status: "already_voted" as const };
    }

    return { status: "ok" as const, participant: safe };
  });

const submitSchema = z.object({
  msisdn: z.string().min(8).max(20),
  choix_1: z.enum(DISTRIBUTEURS),
  choix_2: z.enum(DISTRIBUTEURS),
  choix_3: z.enum(DISTRIBUTEURS),
  choix_4: z.enum(DISTRIBUTEURS),
});

export const submitResponse = createServerFn({ method: "POST" })
  .inputValidator((input) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    const choices = [data.choix_1, data.choix_2, data.choix_3, data.choix_4];
    if (new Set(choices).size !== 4) {
      throw new Error("Chaque distributeur doit être sélectionné une seule fois.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const msisdn = normalizeMsisdn(data.msisdn);

    const { data: participant } = await supabaseAdmin
      .from("authorized_participants")
      .select("msisdn")
      .eq("msisdn", msisdn)
      .maybeSingle();
    if (!participant) throw new Error("Numéro non autorisé.");

    const { data: existing } = await supabaseAdmin
      .from("responses")
      .select("msisdn")
      .eq("msisdn", msisdn)
      .maybeSingle();
    if (existing) throw new Error("Vous avez déjà effectué votre choix.");

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

export const getPublicCounter = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ count: total }, { count: votes }] = await Promise.all([
    supabaseAdmin.from("authorized_participants").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("responses").select("*", { count: "exact", head: true }),
  ]);
  return { total: total ?? 0, votes: votes ?? 0 };
});
