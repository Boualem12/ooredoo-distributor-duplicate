import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { adminListResponses, adminDeleteResponse } from "@/lib/admin.functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/responses")({
  head: () => ({ meta: [{ title: "Admin — Réponses" }, { name: "robots", content: "noindex" }] }),
  component: ResponsesPage,
});

function ResponsesPage() {
  const listFn = useServerFn(adminListResponses);
  const deleteFn = useServerFn(adminDeleteResponse);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-responses"],
    queryFn: () => listFn(),
  });

  const [search, setSearch] = useState("");
  const [confirmMsisdn, setConfirmMsisdn] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows = useMemo(() => {
    if (!data?.rows) return [];
    const s = search.trim().toLowerCase();
    if (!s) return data.rows;
    return data.rows.filter(
      (r) =>
        r.msisdn.toLowerCase().includes(s) ||
        r.nom_cod.toLowerCase().includes(s) ||
        r.wilaya.toLowerCase().includes(s) ||
        r.region.toLowerCase().includes(s),
    );
  }, [data, search]);

  const handleDelete = async (msisdn: string) => {
    setDeleting(true);
    try {
      await deleteFn({ data: { msisdn } });
      toast.success("Réponse supprimée");
      setConfirmMsisdn(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Réponses enregistrées</h1>
          <p className="text-sm text-muted-foreground">
            {data.rows.length} vote{data.rows.length > 1 ? "s" : ""} au total.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher MSISDN, PDV, wilaya…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-72"
            />
          </div>
          <Button variant="outline" onClick={() => refetch()}>Actualiser</Button>
        </div>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Liste des votes</CardTitle>
          <CardDescription>Classement des distributeurs par participant.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MSISDN</TableHead>
                  <TableHead>COD</TableHead>
                  <TableHead>Wilaya</TableHead>
                  <TableHead>Région</TableHead>
                  <TableHead>Distrib. actuel</TableHead>
                  <TableHead>Choix 1</TableHead>
                  <TableHead>Choix 2</TableHead>
                  <TableHead>Choix 3</TableHead>
                  <TableHead>Choix 4</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      Aucune réponse trouvée.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.msisdn}>
                      <TableCell className="font-medium whitespace-nowrap">{r.msisdn}</TableCell>
                      <TableCell>{r.nom_cod}</TableCell>
                      <TableCell>{r.wilaya}</TableCell>
                      <TableCell>{r.region}</TableCell>
                      <TableCell>{r.distributeur_actuel}</TableCell>
                      <TableCell>{r.choix_1}</TableCell>
                      <TableCell>{r.choix_2}</TableCell>
                      <TableCell>{r.choix_3}</TableCell>
                      <TableCell>{r.choix_4}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setConfirmMsisdn(r.msisdn)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!confirmMsisdn} onOpenChange={() => setConfirmMsisdn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer la réponse du MSISDN <strong>{confirmMsisdn}</strong> ?
              Cette action est irréversible et permettra au participant de voter à nouveau.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmMsisdn(null)} disabled={deleting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmMsisdn && handleDelete(confirmMsisdn)}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
