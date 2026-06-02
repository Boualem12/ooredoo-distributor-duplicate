import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Phone, CheckCircle2, ShieldCheck, LockKeyhole } from "lucide-react";

import { checkMsisdn, submitResponse, getPublicCounter } from "@/lib/survey.functions";
import { DISTRIBUTEURS, isValidMsisdn } from "@/lib/survey-constants";
import { OoredooLogo } from "@/components/OoredooLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ooredoo — Classement des distributeurs" },
      { name: "description", content: "Co-distributeurs Ooredoo Algérie : classez vos distributeurs préférés." },
    ],
  }),
  component: SurveyPage,
});

type Participant = {
  msisdn: string;
  nom_pdv: string;
  wilaya: string;
  region: string;
  distributeur_actuel: string;
};

function SurveyPage() {
  const checkFn = useServerFn(checkMsisdn);
  const submitFn = useServerFn(submitResponse);
  const counterFn = useServerFn(getPublicCounter);

  const counter = useQuery({
    queryKey: ["public-counter"],
    queryFn: () => counterFn(),
    refetchInterval: 30000,
  });

  const [step, setStep] = useState<"msisdn" | "ranking" | "done">("msisdn");
  const [msisdn, setMsisdn] = useState("");
  const [checking, setChecking] = useState(false);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [choices, setChoices] = useState<(string | undefined)[]>([undefined, undefined, undefined, undefined]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const progress = step === "msisdn" ? 25 : step === "ranking" ? 65 : 100;

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidMsisdn(msisdn)) {
      toast.error("Format invalide", { description: "Saisissez un MSISDN valide (ex : 0550123456)." });
      return;
    }
    setChecking(true);
    try {
      const res = await checkFn({ data: { msisdn } });
      if (res.status === "not_authorized") {
        toast.error("Votre numéro n'est pas autorisé à participer.");
      } else if (res.status === "already_voted") {
        toast.error("Vous avez déjà effectué votre choix.");
      } else {
        setParticipant(res.participant);
        setStep("ranking");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setChecking(false);
    }
  };

  const usedSet = new Set(choices.filter(Boolean) as string[]);
  const duplicates =
    choices.every(Boolean) && new Set(choices as string[]).size !== 4;

  const askConfirm = () => {
    if (!choices.every(Boolean)) {
      toast.error("Veuillez sélectionner les 4 distributeurs.");
      return;
    }
    if (duplicates) {
      toast.error("Chaque distributeur doit être sélectionné une seule fois.");
      return;
    }
    setConfirmOpen(true);
  };

  const doSubmit = async () => {
    if (!participant) return;
    setSubmitting(true);
    try {
      await submitFn({
        data: {
          msisdn: participant.msisdn,
          choix_1: choices[0] as (typeof DISTRIBUTEURS)[number],
          choix_2: choices[1] as (typeof DISTRIBUTEURS)[number],
          choix_3: choices[2] as (typeof DISTRIBUTEURS)[number],
          choix_4: choices[3] as (typeof DISTRIBUTEURS)[number],
        },
      });
      setStep("done");
      setConfirmOpen(false);
      counter.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <OoredooLogo />
          <Link
            to="/admin/login"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <LockKeyhole className="h-3.5 w-3.5" />
            Espace Admin
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0, transparent 40%)" }} />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            Classement des distributeurs
          </h1>
          <p className="mt-3 max-w-2xl text-primary-foreground/90 text-base sm:text-lg">
            Bienvenue. En tant que co-distributeur Ooredoo, classez vos 4 distributeurs préférés par ordre de préférence.
          </p>

          {counter.data && (
            <div className="mt-6 inline-flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
              <span className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4" />
                <strong>{counter.data.votes.toLocaleString("fr-FR")}</strong> participation{counter.data.votes > 1 ? "s" : ""}
                <span className="text-primary-foreground/70">sur {counter.data.total.toLocaleString("fr-FR")}</span>
              </span>
              <span className="text-sm font-medium">
                {counter.data.total > 0
                  ? `${Math.round((counter.data.votes / counter.data.total) * 1000) / 10}%`
                  : "0%"}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Progress */}
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <div className="mb-1 flex justify-between text-xs font-medium text-muted-foreground">
          <span>Étape {step === "msisdn" ? 1 : step === "ranking" ? 2 : 3} sur 3</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main card */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {step === "msisdn" && (
          <Card className="shadow-[var(--shadow-card)] border-border/60 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <CardHeader>
              <CardTitle className="text-2xl">Identifiez-vous</CardTitle>
              <CardDescription>Saisissez votre numéro MSISDN pour commencer.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheck} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="msisdn">Votre MSISDN</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="msisdn"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="0550123456"
                      value={msisdn}
                      onChange={(e) => setMsisdn(e.target.value)}
                      className="pl-9 h-12 text-base"
                      maxLength={15}
                      required
                    />
                  </div>
                  {msisdn.length > 0 && !isValidMsisdn(msisdn) && (
                    <p className="text-xs text-destructive">Format invalide — exemple : 0550123456.</p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={checking || !isValidMsisdn(msisdn)}
                  className="w-full h-12 text-base font-semibold"
                  style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-elegant)" }}
                >
                  {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Continuer
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "ranking" && participant && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="shadow-[var(--shadow-card)] border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Vos informations</CardTitle>
                <CardDescription>Informations récupérées automatiquement.</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Info label="MSISDN" value={participant.msisdn} />
                  <Info label="Nom du PDV" value={participant.nom_pdv} />
                  <Info label="Wilaya" value={participant.wilaya} />
                  <Info label="Région" value={participant.region} />
                  <Info label="Distributeur actuel" value={participant.distributeur_actuel} full />
                </dl>
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-card)] border-border/60">
              <CardHeader>
                <CardTitle className="text-xl">Votre classement</CardTitle>
                <CardDescription>
                  Classez les 4 distributeurs par ordre de préférence. Chacun ne peut être choisi qu'une seule fois.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <Label className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      Choix {i + 1}
                    </Label>
                    <Select
                      value={choices[i]}
                      onValueChange={(v) => {
                        const next = [...choices];
                        next[i] = v;
                        setChoices(next);
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Sélectionnez un distributeur" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRIBUTEURS.map((d) => {
                          const taken = usedSet.has(d) && choices[i] !== d;
                          return (
                            <SelectItem key={d} value={d} disabled={taken}>
                              {d} {taken && <span className="ml-1 text-xs text-muted-foreground">(déjà choisi)</span>}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                {duplicates && (
                  <p className="text-sm text-destructive">
                    Chaque distributeur doit être sélectionné une seule fois.
                  </p>
                )}

                <Button
                  type="button"
                  onClick={askConfirm}
                  disabled={!choices.every(Boolean) || duplicates}
                  className="w-full h-12 text-base font-semibold mt-2"
                  style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-elegant)" }}
                >
                  Valider mon classement
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "done" && (
          <Card className="shadow-[var(--shadow-card)] border-border/60 text-center animate-in fade-in zoom-in-95 duration-500">
            <CardContent className="py-12">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-9 w-9 text-success" />
              </div>
              <h2 className="text-2xl font-bold">Merci pour votre participation.</h2>
              <p className="mt-2 text-muted-foreground">Votre classement a été enregistré avec succès.</p>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Ooredoo Algérie — Sondage interne co-distributeurs.
      </footer>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmez-vous votre classement ?</DialogTitle>
            <DialogDescription>
              Cette action est définitive. Vous ne pourrez plus modifier vos choix.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-2 rounded-lg bg-muted p-4">
            {choices.map((c, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="font-medium">{c}</span>
              </li>
            ))}
          </ol>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              onClick={doSubmit}
              disabled={submitting}
              style={{ background: "var(--gradient-hero)" }}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`rounded-lg border bg-muted/40 px-3 py-2 ${full ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}
