import type { ProjectKPIs } from "@/types/dashboard";
import { AlertsCard } from "../AlertsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Bell, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Props = { kpis: ProjectKPIs; projectId: string };

export function CollaboratorView({ kpis, projectId }: Props) {
  const { user } = useAuth();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Card 1 — Minhas Tarefas */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <CheckSquare className="h-4 w-4 text-violet-500" />
          <CardTitle className="text-sm font-semibold">Minhas Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Tarefas atribuídas a você aparecerão aqui em breve.
          </p>
        </CardContent>
      </Card>

      {/* Card 2 — Prazos */}
      <AlertsCard prazos={kpis.prazos_criticos} />

      {/* Card 3 — Notificações */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Bell className="h-4 w-4 text-yellow-500" />
          <CardTitle className="text-sm font-semibold">Notificações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Nenhuma notificação pendente.
          </p>
        </CardContent>
      </Card>

      {/* Card 4 — Perfil */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <User className="h-4 w-4 text-slate-500" />
          <CardTitle className="text-sm font-semibold">Meu Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{user?.email ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Colaborador</p>
          <a
            href="/configuracoes"
            className="mt-2 inline-block text-xs underline text-primary"
          >
            Editar perfil
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
