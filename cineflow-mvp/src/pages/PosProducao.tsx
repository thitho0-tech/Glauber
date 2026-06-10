import { Card, CardContent } from "@/components/ui/card";
import { Film } from "lucide-react";

export default function PosProducao() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Film className="h-7 w-7 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Pós-Produção</h1>
          <p className="text-sm text-muted-foreground">Edição, cor, som e entrega final.</p>
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Film className="h-12 w-12 text-muted-foreground opacity-30" />
          <p className="font-medium">Em desenvolvimento</p>
          <p className="text-sm text-muted-foreground">Módulo de pós-produção disponível na Sprint 4D.</p>
        </CardContent>
      </Card>
    </div>
  );
}
