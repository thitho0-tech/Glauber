import { NavLink, useParams } from "react-router-dom";
import { LayoutDashboard, FolderKanban, Calendar, FileText, Users, MapPin, Wallet, Receipt, Settings, Clapperboard, X, MessageSquare, FileSignature, Shirt, Drama, ScrollText, FileCheck, Gauge, Building2, CalendarDays, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Button } from "@/components/ui/button";

const globalItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projetos", icon: FolderKanban, label: "Projetos" },
  { to: "/onboarding", icon: FileCheck, label: "Onboarding" },
  { to: "/lixeira", icon: Trash2, label: "Lixeira" },
];

const projectItems = (id: string) => [
  { to: `/projetos/${id}/dashboard`, icon: Gauge, label: "Command Center" },
  { to: `/projetos/${id}/cronograma`, icon: Calendar, label: "Cronograma" },
  { to: `/projetos/${id}/ordens-do-dia`, icon: FileText, label: "Ordem do Dia" },
  { to: `/projetos/${id}/roteiro`, icon: ScrollText, label: "Roteiro" },
  { to: `/projetos/${id}/equipe`, icon: Users, label: "Equipe" },
  { to: `/projetos/${id}/elenco`, icon: Drama, label: "Elenco" },
  { to: `/projetos/${id}/locacoes`, icon: MapPin, label: "Locacoes" },
  { to: `/projetos/${id}/figurino-arte`, icon: Shirt, label: "Figurino e Arte" },
  { to: `/projetos/${id}/financeiro`, icon: Wallet, label: "Financeiro" },
  { to: `/projetos/${id}/fornecedores`, icon: Building2, label: "Fornecedores" },
  { to: `/projetos/${id}/contrato`, icon: FileSignature, label: "Contrato" },
  { to: `/projetos/${id}/agenda`, icon: CalendarDays, label: "Agenda" },
  { to: `/projetos/${id}/comunicacao`, icon: MessageSquare, label: "Comunicacao" },
  { to: `/projetos/${id}/prestacao`, icon: Receipt, label: "Prestacao" },
];

function NavItems({ projetoId, onNavigate }: { projetoId?: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Geral</div>
      {globalItems.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isActive && "bg-primary/10 text-primary"
            )
          }
        >
          <it.icon className="h-4 w-4" />
          {it.label}
        </NavLink>
      ))}
      {projetoId && (
        <>
          <div className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Projeto</div>
          {projectItems(projetoId).map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-primary/10 text-primary"
                )
              }
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </NavLink>
          ))}
        </>
      )}
    </>
  );
}

function SidebarHeader() {
  return (
    <div className="flex h-16 items-center gap-2 border-b px-6">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Clapperboard className="h-5 w-5" />
      </div>
      <div>
        <p className="text-base font-bold tracking-tight">Glauber</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">MVP</p>
      </div>
    </div>
  );
}

function SettingsLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-t p-3">
      <NavLink
        to="/configuracoes"
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
            isActive && "bg-primary/10 text-primary"
          )
        }
      >
        <Settings className="h-4 w-4" />
        Configuracoes
      </NavLink>
    </div>
  );
}

export function Sidebar() {
  const params = useParams();
  const projetoId = params.id;
  const { open, setOpen } = useSidebar();

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <SidebarHeader />
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavItems projetoId={projetoId} />
        </nav>
        <SettingsLink />
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-card transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b pr-4 pl-6">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Clapperboard className="h-5 w-5" />
            </div>
            <p className="text-base font-bold tracking-tight">Glauber</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavItems projetoId={projetoId} onNavigate={() => setOpen(false)} />
        </nav>
        <SettingsLink onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}
