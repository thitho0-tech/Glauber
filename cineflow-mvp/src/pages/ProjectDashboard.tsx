import { useParams, Link } from "react-router-dom";
import { CommandCenter } from "@/components/dashboard/CommandCenter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Projeto não encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/projetos/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Projeto
          </Link>
        </Button>
      </div>

      {/* Command Center */}
      <CommandCenter projectId={id} />
    </div>
  );
}
