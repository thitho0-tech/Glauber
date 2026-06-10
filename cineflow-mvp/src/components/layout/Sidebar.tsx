import { NavLink, useParams } from "react-router-dom";
import {
  LayoutDashboard, FolderKanban, FileCheck,
  Gauge, Calendar, FileText, ScrollText,
  Package2, PenLine, Clapperboard, Shirt, Camera, Music, Drama, Film,
  Map, ClipboardList, Settings, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Button } from "@/components/ui/button";
import novaLogo from "@/assets/nova-logo-glauber.jpeg";

const globalItems = [
  { to: "/",          icon: LayoutDashboard, label: "Página Inicial", end: true },
  { to: "/projetos",  icon: FolderKanban,    label: "Projetos",       end: false },
  { to: "/onboarding",icon: FileCheck,       label: "Onboarding",     end: true },
];

function buildProjectItems(id: string) {
  const p = `/projetos/${id}`;
  return {
    main: [
      { to: `${p}/dashboard`,    icon: Gauge,       label: "Mural",              end: true },
      { to: `${p}/agenda`,       icon: Calendar,    label: "Agenda",             end: false },
      { to: `${p}/ordens-do-dia`,icon: FileText,    label: "Ordem do Dia",       end: false },
      { to: `${p}/roteiro`,      icon: ScrollText,  label: "Roteiro & Decupagem",end: false },
    ],
    deptos: [
      { to: `${p}/producao`,     icon: Package2,    label: "Produção",        end: false },
      { to: `${p}/roteiro-depto`,icon: PenLine,     label: "Roteiro",         end: false },
      { to: `${p}/direcao`,      icon: Clapperboard,label: "Direção",         end: false },
      { to: `${p}/figurino-arte`,icon: Shirt,       label: "Dep. de Arte",    end: false },
      { to: `${p}/fotografia`,   icon: Camera,      label: "Dep. de Fotografia",end: false },
      { to: `${p}/som`,          icon: Music,       label: "Dep. de Som",     end: false },
      { to: `${p}/elenco`,       icon: Drama,       label: "Elenco",          end: false },
      { to: `${p}/pos-producao`, icon: Film,        label: "Pós Produção",    end: false },
    ],
    extra: [
      { to: `${p}/mapa-transporte`, icon: Map,          label: "Mapa de Transporte", end: false },
      { to: `${p}/administrativo`,  icon: ClipboardList, label: "Administrativo",    end: false },
    ],
  };
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
    isActive && "bg-primary/10 text-primary"
  );

function NavItems({ projetoId, onNavigate }: { projetoId?: string; onNavigate?: () => void }) {
  const items = projetoId ? buildProjectItems(projetoId) : null;

  return (
    <>
      {/* GERAL */}
      <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Geral
      </div>
      {globalItems.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} onClick={onNavigate} className={navLinkClass}>
          <it.icon className="h-4 w-4 shrink-0" />
          {it.label}
        </NavLink>
      ))}

      {/* PROJETO */}
      {items && (
        <>
          <div className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Projeto
          </div>
          {items.main.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} onClick={onNavigate} className={navLinkClass}>
              <it.icon className="h-4 w-4 shrink-0" />
              {it.label}
            </NavLink>
          ))}

          <div className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Departamentos
          </div>
          {items.deptos.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} onClick={onNavigate} className={navLinkClass}>
              <it.icon className="h-4 w-4 shrink-0" />
              {it.label}
            </NavLink>
          ))}

          <div className="my-2 mx-3 border-t" />
          {items.extra.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} onClick={onNavigate} className={navLinkClass}>
              <it.icon className="h-4 w-4 shrink-0" />
              {it.label}
            </NavLink>
          ))}

          <NavLink
            to="/configuracoes"
            end={false}
            onClick={onNavigate}
            className={navLinkClass}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Configurações
          </NavLink>
        </>
      )}

      {/* Configurações globais (sem projeto ativo) */}
      {!projetoId && (
        <NavLink to="/configuracoes" end={false} onClick={onNavigate} className={navLinkClass}>
          <Settings className="h-4 w-4 shrink-0" />
          Configurações
        </NavLink>
      )}
    </>
  );
}

function SidebarHeader() {
  return (
    <div className="flex h-16 items-center gap-2 border-b px-4">
      <img src={novaLogo} alt="Glauber" className="h-10 w-auto object-contain rounded" />
    </div>
  );
}

export function Sidebar() {
  const params = useParams();
  const projetoId = params.id;
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <SidebarHeader />
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          <NavItems projetoId={projetoId} />
        </nav>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-card transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b pr-4 pl-6">
          <img src={novaLogo} alt="Glauber" className="h-9 w-auto object-contain rounded" />
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          <NavItems projetoId={projetoId} onNavigate={() => setOpen(false)} />
        </nav>
      </aside>
    </>
  );
}
