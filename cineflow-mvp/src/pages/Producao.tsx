import { NavLink, Outlet, useParams, Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Package2 } from "lucide-react";

const TABS = [
  { to: "equipe",       label: "Equipe" },
  { to: "locacoes",     label: "Locações" },
  { to: "financeiro",   label: "Financeiro" },
  { to: "fornecedores", label: "Fornecedores" },
  { to: "contratos",    label: "Contratos" },
  { to: "prestacao",    label: "Prestação" },
];

export default function Producao() {
  const { id } = useParams<{ id: string }>();

  if (!id) return <Navigate to="/projetos" replace />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Package2 className="h-7 w-7 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Produção</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={`/projetos/${id}/producao/${tab.to}`}
            className={({ isActive }) =>
              cn(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Sub-page content */}
      <Outlet />
    </div>
  );
}
