import { Button } from "@/components/ui/button";
import { Bell, LogOut, Menu } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useOrgs } from "@/hooks/useOrg";
import { useSidebar } from "@/hooks/useSidebar";

export function Topbar() {
  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const orgNome = orgs?.[0]?.org.nome ?? "Sua Produtora";
  const toggle = useSidebar((s) => s.toggle);

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggle} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Produtora</p>
          <p className="truncate text-sm font-semibold">{orgNome}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notificações" className="hidden sm:inline-flex">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="hidden text-right text-sm md:block">
          <p className="font-medium">{user?.email}</p>
          <p className="text-xs text-muted-foreground">Owner</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
