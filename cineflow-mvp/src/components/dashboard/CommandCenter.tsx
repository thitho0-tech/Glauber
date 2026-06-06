import { useProjectKPIs } from "@/hooks/useProjectKPIs";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectFunction } from "@/hooks/useProjectFunction";
import { mapRoleToDashboard, mapFuncaoDepartamento } from "@/types/dashboard";
import { Loading } from "@/components/ui/loading";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DPView } from "./views/DPView";
import { DirectorView } from "./views/DirectorView";
import { ADView } from "./views/ADView";
import { CollaboratorView } from "./views/CollaboratorView";
import { ContinuityView } from "./views/ContinuityView";
import { CastView } from "./views/CastView";
import { PostView } from "./views/PostView";

type Props = {
  projectId: string;
};

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="border-destructive bg-destructive/5">
      <CardContent className="flex flex-col items-center gap-3 py-8">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive font-medium">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCcw className="h-4 w-4 mr-1" />
            Tentar novamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function RealtimeDot({ updated_at }: { updated_at: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      Realtime · atualizado{" "}
      {new Date(updated_at).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </div>
  );
}

export function CommandCenter({ projectId }: Props) {
  const { kpis, loading: kpisLoading, error: kpisError } = useProjectKPIs(projectId);
  const { role, isLoading: roleLoading } = useProjectRole(projectId);
  const { funcao, isLoading: funcaoLoading } = useProjectFunction(projectId);

  if (kpisLoading || roleLoading || funcaoLoading) {
    return <Loading />;
  }

  if (kpisError) {
    return (
      <ErrorCard
        message={`Erro ao carregar KPIs: ${kpisError.message}`}
      />
    );
  }

  if (!kpis) {
    return (
      <ErrorCard message="Dados do dashboard ainda não disponíveis para este projeto." />
    );
  }

  // Prioridade: função cinematográfica > papel RBAC
  let dashRole = mapRoleToDashboard(role);
  if (funcao) {
    const funcaoMapped = mapFuncaoDepartamento(funcao.departamento, funcao.nome);
    if (funcaoMapped) dashRole = funcaoMapped;
  }

  const roleLabel = funcao?.nome ?? dashRole;

  return (
    <div className="space-y-4">
      {/* Header com indicador Realtime */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Command Center</h2>
          <p className="text-sm text-muted-foreground capitalize">{roleLabel}</p>
        </div>
        <RealtimeDot updated_at={kpis.updated_at} />
      </div>

      {/* View segmentada por role / função */}
      {(dashRole === "dp" || dashRole === "produtor") && (
        <DPView kpis={kpis} projectId={projectId} />
      )}
      {dashRole === "diretor" && (
        <DirectorView kpis={kpis} projectId={projectId} />
      )}
      {dashRole === "ad" && (
        <ADView kpis={kpis} projectId={projectId} />
      )}
      {dashRole === "continuity" && (
        <ContinuityView kpis={kpis} projectId={projectId} />
      )}
      {dashRole === "elenco" && (
        <CastView kpis={kpis} projectId={projectId} />
      )}
      {dashRole === "pos" && (
        <PostView kpis={kpis} projectId={projectId} />
      )}
      {dashRole === "colaborador" && (
        <CollaboratorView kpis={kpis} projectId={projectId} />
      )}
    </div>
  );
}
