import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminStats, adminExport } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Users, CheckCircle2, Hourglass, TrendingUp, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin — Tableau de bord" }, { name: "robots", content: "noindex" }] }),
  component: DashboardPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function toArray(obj: Record<string, number>) {
  return Object.entries(obj)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function DashboardPage() {
  const statsFn = useServerFn(adminStats);
  const exportFn = useServerFn(adminExport);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => statsFn(),
    refetchInterval: 15000,
  });

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const { rows } = await exportFn();
      if (!rows.length) {
        toast.info("Aucune réponse à exporter pour l'instant.");
        return;
      }
      if (format === "csv") {
        const headers = Object.keys(rows[0]);
        const csv = [
          headers.join(";"),
          ...rows.map((r) =>
            headers.map((h) => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`).join(";"),
          ),
        ].join("\n");
        downloadBlob("\uFEFF" + csv, `reponses-ooredoo-${stamp()}.csv`, "text/csv;charset=utf-8");
      } else {
        // simple XML-based Excel? Use SpreadsheetML 2003 (works in Excel)
        const headers = Object.keys(rows[0]);
        const xml = buildExcelXml(headers, rows);
        downloadBlob(xml, `reponses-ooredoo-${stamp()}.xls`, "application/vnd.ms-excel");
      }
      toast.success("Export téléchargé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'export");
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement…
      </div>
    );
  }

  const choice1Data = toArray(data.choice1);
  const choice2Data = toArray(data.choice2);
  const regionData = toArray(data.byRegion);
  const wilayaData = toArray(data.byWilaya).slice(0, 15);
  const distribData = toArray(data.byDistributeur);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Suivi en temps réel des participations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>Actualiser</Button>
          <Button variant="outline" onClick={() => handleExport("csv")}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button onClick={() => handleExport("xlsx")} style={{ background: "var(--gradient-hero)" }}>
            <Download className="mr-2 h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Participants" value={data.kpi.votes} icon={Users} />
        <Kpi label="Autorisés" value={data.kpi.total} icon={CheckCircle2} />
        <Kpi label="Restants" value={data.kpi.remaining} icon={Hourglass} />
        <Kpi label="Taux" value={`${data.kpi.rate}%`} icon={TrendingUp} accent />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Répartition des choix N°1" description="Distributeur préféré en première position">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={choice1Data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {choice1Data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Répartition des choix N°2" description="Distributeur en seconde position">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={choice2Data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Participations par région" description="Réponses agrégées par région">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="name" fontSize={12} width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Participations par distributeur actuel" description="Source actuelle des répondants">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Top wilayas"
          description="15 wilayas les plus actives"
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={wilayaData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={11} angle={-30} textAnchor="end" height={70} interval={0} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/30" : ""} style={accent ? { background: "var(--gradient-hero)", color: "var(--primary-foreground)" } : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className={`text-xs uppercase tracking-wide ${accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {label}
          </span>
          <Icon className={`h-4 w-4 ${accent ? "text-primary-foreground/90" : "text-primary"}`} />
        </div>
        <div className="mt-2 text-3xl font-bold">{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`shadow-[var(--shadow-card)] ${className ?? ""}`}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildExcelXml(headers: string[], rows: Record<string, unknown>[]) {
  const headerRow = `<Row>${headers.map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>`;
  const dataRows = rows
    .map(
      (r) =>
        `<Row>${headers
          .map((h) => `<Cell><Data ss:Type="String">${escapeXml(String(r[h] ?? ""))}</Data></Cell>`)
          .join("")}</Row>`,
    )
    .join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Réponses">
  <Table>${headerRow}${dataRows}</Table>
 </Worksheet>
</Workbook>`;
}
