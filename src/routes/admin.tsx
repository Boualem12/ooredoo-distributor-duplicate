import { createFileRoute, Outlet, Link, useNavigate, redirect, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { adminMe, adminLogout } from "@/lib/admin.functions";
import { OoredooLogo } from "@/components/OoredooLogo";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Upload, FileText } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/login") return;
    const res = await adminMe();
    if (!res.isAdmin) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const logoutFn = useServerFn(adminLogout);
  const queryClient = useQueryClient();

  if (pathname === "/admin/login") {
    return <Outlet />;
  }

  const handleLogout = async () => {
    // Stop any in-flight admin queries so refetchInterval doesn't fire
    // adminStats after logout (which would throw a redirect Response).
    await queryClient.cancelQueries();
    queryClient.clear();
    await logoutFn();
    navigate({ to: "/admin/login" });
  };

  const navItem = (to: string, label: string, Icon: typeof LayoutDashboard) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster richColors position="top-center" />
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <OoredooLogo />
            <span className="hidden sm:inline text-sm font-semibold text-muted-foreground border-l pl-4">
              Administration
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 px-4 pb-2">
          {navItem("/admin/dashboard", "Tableau de bord", LayoutDashboard)}
          {navItem("/admin/responses", "Réponses", FileText)}
          {navItem("/admin/import", "Importer MSISDN", Upload)}
        </nav>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
