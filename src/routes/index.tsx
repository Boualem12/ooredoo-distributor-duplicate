import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, User, KeyRound, LockKeyhole, LogOut, CheckCircle2, Vote, ShieldCheck, Search, Filter } from "lucide-react";

import {
  supervisorLogin,
  supervisorLogout,
  supervisorMe,
  supervisorListMsisdns,
  supervisorSubmitFor,
} from "@/lib/supervisor.functions";
import { getPublicCounter } from "@/lib/survey.functions";
import { DISTRIBUTEURS } from "@/lib/survey-constants";
import { OoredooLogo } from "@/components/OoredooLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ooredoo — Espace Superviseur" },
      { name: "description", content: "Connexion superviseur pour gérer les votes des PDV Ooredoo." },
    ],
  }),
  component: SupervisorPage,
});

type PdvRow = {
  msisdn: string;
  nom_pdv: string;
  wilaya: string;
  region: string;
  distributeur_actuel: string;
  response: {
    msisdn: string;
    choix_1: string;
    choix_2: string;
    choix_3: string;
    choix_4: string;
    created_at: string;
  } | null;
};

function SupervisorPage() {
  const loginFn = useServerFn(supervisorLogin);
  const logoutFn = useServerFn(supervisorLogout);
  const meFn = useServerFn(supervisorMe);
  const listFn = useServerFn(supervisorListMsisdns);
  const submitFn = useServerFn(supervisorSubmitFor);
  const counterFn = useServerFn(getPublicCounter);

  const me = useQuery({ queryKey: ["supervisor-me"], queryFn: () => meFn() });
  const list = useQuery({
    queryKey: ["supervisor-list"],
    queryFn: () => listFn(),
    enabled: !!me.data?.username,
  });
  const counter = useQuery({
    queryKey: ["public-counter"],
    queryFn: () => counterFn(),
    refetchInterval: 30000,
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "voted" | "pending">("all");

  const [active, setActive] = useState<PdvRow | null>(null);
  const [choices, setChoices] = useState<(string | undefined)[]>([undefined, undefined, undefined, undefined]);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginFn({ data: { username, password } });
      setPassword("");
      await me.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutFn();
    setUsername("");
    await me.refetch();
  };

  const openVote = (row: PdvRow) => {
    setActive(row);
    setChoices([undefined, undefined, undefined, undefined]);
  };

  const usedSet = new Set(choices.filter(Boolean) as string[]);
  const duplicates = choices.every(Boolean) && new Set(choices as string[]).size !== 4;

  const doSubmit = async () => {
    if (!active) return;
    if (!choices.every(Boolean) || duplicates) {
      toast.error("Veuillez sélectionner les 4 distributeurs (sans doublon).");
      return;
    }
    setSubmitting(true);
    try {
      await submitFn({
        data: {
          msisdn: active.msisdn,
          choix_1: choices[0] as (typeof DISTRIBUTEURS)[number],
          choix_2: choices[1] as (typeof DISTRIBUTEURS)[number],
          choix_3: choices[2] as (typeof DISTRIBUTEURS)[number],
          choix_4: choices[3] as (typeof DISTRIBUTEURS)[number],
        },
      });
      toast.success("Classement enregistré.");
      setActive(null);
      await list.refetch();
      counter.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const loggedIn = !!me.data?.username;

  const allRows = (list.data?.rows as PdvRow[] | undefined) ?? [];
  const filteredRows = allRows.filter((r) => {
    const voted = !!r.response;
    if (filterStatus === "voted" && !voted) return false;
    if (filterStatus === "pending" && voted) return false;
    if (!filterText.trim()) return true;
    const q = filterText.trim().toLowerCase();
    return (
      r.nom_pdv.toLowerCase().includes(q) ||
      r.msisdn.toLowerCase().includes(q) ||
      r.wilaya.toLowerCase().includes(q) ||
      r.region.toLowerCase().includes(q) ||
      r.distributeur_actuel.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-center" />

      <header className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <OoredooLogo />
          <div className="flex items-center gap-3">
            {loggedIn ? (
              <>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Connecté : <strong>{me.data?.username}</strong>
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="mr-2 h-3.5 w-3.5" /> Déconnexion
                </Button>
              </>
            ) : (
              <Link
                to="/admin/login"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <LockKeyhole className="h-3.5 w-3.5" />
                Espace Admin
              </Link>
            )}
          </div>
        </div>
      </header>

      {!loggedIn && (
        <>
          <section className="relative overflow-hidden text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
            <div className="relative mx-auto max-w-5xl px-4 py-12 sm:py-16">
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Espace Superviseur</h1>
              <p className="mt-3 max-w-2xl text-primary-foreground/90 text-base sm:text-lg">
                Connectez-vous pour gérer les votes des PDV qui vous sont assignés.
              </p>
              {counter.data && (
                <div className="mt-6 inline-flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                  <span className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    <strong>{counter.data.votes.toLocaleString("fr-FR")}</strong> participations
                    <span className="text-primary-foreground/70">sur {counter.data.total.toLocaleString("fr-FR")}</span>
                  </span>
                </div>
              )}
            </div>
          </section>

          <main className="mx-auto max-w-md px-4 py-10">
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="text-2xl">Connexion superviseur</CardTitle>
                <CardDescription>Utilisez votre identifiant et mot de passe.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user">Identifiant</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="user"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-9 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pwd">Mot de passe</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="pwd"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 h-11"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !username || !password}
                    className="w-full h-11 font-semibold"
                    style={{ background: "var(--gradient-hero)" }}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Se connecter
                  </Button>
                </form>
              </CardContent>
            </Card>
          </main>
        </>
      )}

      {loggedIn && (
        <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Mes PDV</h1>
            <p className="text-sm text-muted-foreground">
              Liste des MSISDN qui vous sont assignés. Cliquez sur « Voter » pour enregistrer un classement.
            </p>
          </div>

          {list.isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          )}

          {list.data && list.data.rows.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Aucun PDV ne vous est assigné pour le moment.
              </CardContent>
            </Card>
          )}

          {list.data && list.data.rows.length > 0 && (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher (nom, MSISDN, wilaya, région, distributeur…)"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="voted">Votés</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {filteredRows.length} résultat{filteredRows.length > 1 ? "s" : ""} sur {allRows.length}
              </div>

              {filteredRows.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRows.map((r) => {
                    const voted = !!r.response;
                    return (
                      <Card key={r.msisdn} className="shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base leading-tight">{r.nom_pdv}</CardTitle>
                            {voted ? (
                              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Voté
                              </Badge>
                            ) : (
                              <Badge variant="outline">En attente</Badge>
                            )}
                          </div>
                          <CardDescription className="font-mono text-xs">{r.msisdn}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="text-muted-foreground">
                            {r.wilaya} · {r.region}
                          </div>
                          <div className="text-xs">
                            Distributeur actuel : <strong>{r.distributeur_actuel}</strong>
                          </div>
                          {voted && r.response && (
                            <ol className="mt-2 space-y-1 rounded-md bg-muted p-2 text-xs">
                              {[r.response.choix_1, r.response.choix_2, r.response.choix_3, r.response.choix_4].map((c, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                    {i + 1}
                                  </span>
                                  {c}
                                </li>
                              ))}
                            </ol>
                          )}
                          {!voted && (
                            <Button
                              onClick={() => openVote(r)}
                              size="sm"
                              className="w-full mt-2"
                              style={{ background: "var(--gradient-hero)" }}
                            >
                              <Vote className="mr-2 h-3.5 w-3.5" /> Voter
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    Aucun résultat ne correspond aux filtres sélectionnés.
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Classement pour {active?.nom_pdv}</DialogTitle>
            <DialogDescription>
              MSISDN {active?.msisdn} — {active?.wilaya}, {active?.region}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
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
                  <SelectTrigger className="h-10">
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
              <p className="text-sm text-destructive">Chaque distributeur doit être sélectionné une seule fois.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              onClick={doSubmit}
              disabled={submitting || !choices.every(Boolean) || duplicates}
              style={{ background: "var(--gradient-hero)" }}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Ooredoo Algérie — Espace superviseur.
      </footer>
    </div>
  );
}
