import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { adminImport } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/admin/import")({
  head: () => ({ meta: [{ title: "Admin — Import MSISDN" }, { name: "robots", content: "noindex" }] }),
  component: ImportPage,
});

type Row = { msisdn: string; nom_cod: string; wilaya: string; region: string; distributeur_actuel: string; supervisor_name: string; supervisor_username: string; supervisor_password: string };

function ImportPage() {
  const importFn = useServerFn(adminImport);
  const [rows, setRows] = useState<Row[]>([]);
  const [filename, setFilename] = useState("");
  const [replace, setReplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFile = (file: File) => {
    setFilename(file.name);
    setErrors([]);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (res) => {
        const errs: string[] = [];
        const parsed: Row[] = [];
        res.data.forEach((r, i) => {
          const row: Row = {
            msisdn: (r.msisdn || r.numero || r.number || "").toString().trim(),
            nom_cod: (r.nom_cod || r.nom_pdv || r.cod || r.pdv || r.nom || "").toString().trim(),
            wilaya: (r.wilaya || "").toString().trim(),
            region: (r.region || "").toString().trim(),
            distributeur_actuel: (r.distributeur_actuel || r.distributeur || "").toString().trim(),
            supervisor_name: (r.supervisuer_name || r.supervisor_name || r.nom_superviseur || r.superviseur_nom || "").toString().trim(),
            supervisor_username: (r.supervisor_username || r.superviseur || r.supervisor || "").toString().trim(),
            supervisor_password: (r.supervisor_password || r.mdp_superviseur || r.password_superviseur || "").toString().trim(),
          };
          if (!row.msisdn || !row.nom_cod || !row.wilaya || !row.region || !row.distributeur_actuel || !row.supervisor_name || !row.supervisor_username || !row.supervisor_password) {
            if (errs.length < 5) errs.push(`Ligne ${i + 2} : champ manquant`);
            return;
          }
          parsed.push(row);
        });
        setRows(parsed);
        setErrors(errs);
        toast.success(`${parsed.length} lignes prêtes à importer`);
      },
      error: (e) => toast.error("Erreur de parsing : " + e.message),
    });
  };

  const doImport = async () => {
    if (!rows.length) return;
    setLoading(true);
    try {
      const res = await importFn({ data: { rows, replace } });
      toast.success(`${res.inserted} participants importés`);
      setRows([]);
      setFilename("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Importer la liste des participants autorisés</h1>
        <p className="text-sm text-muted-foreground">
          Fichier CSV avec les colonnes : <code className="rounded bg-muted px-1">msisdn, nom_cod, wilaya, region, distributeur_actuel, supervisuer_name, supervisor_username, supervisor_password</code>
        </p>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Fichier CSV</CardTitle>
          <CardDescription>Séparateur virgule, première ligne = en-têtes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Sélectionner un fichier</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {filename && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="font-medium">{filename}</span>
              <span className="ml-auto text-muted-foreground">{rows.length} lignes valides</span>
            </div>
          )}

          {errors.length > 0 && (
            <ul className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
              {errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={replace} onCheckedChange={(v) => setReplace(!!v)} />
            Remplacer la liste existante (supprime toutes les entrées actuelles)
          </label>

          <Button
            onClick={doImport}
            disabled={loading || !rows.length}
            className="w-full sm:w-auto font-semibold"
            style={{ background: "var(--gradient-hero)" }}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Importer {rows.length > 0 ? `(${rows.length})` : ""}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exemple de fichier CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
{`msisdn,nom_cod,wilaya,region,distributeur_actuel,supervisuer_name,supervisor_username,supervisor_password
0550123456,COD Alger Centre,Alger,Centre,TIMECOM,Mouzai Boualem,sup_centre,supPass1
0661234567,COD Oran Plaza,Oran,Ouest,STI,Benali Karim,sup_ouest,supPass2`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
