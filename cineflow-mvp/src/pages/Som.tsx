import { Card, CardContent } from "@/components/ui/card";
import { Music } from "lucide-react";

export default function Som() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Music className="h-7 w-7 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Dep. de Som</h1>
          <p className="text-sm text-muted-foreground">Equipamentos e boletins de gravação.</p>
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Music className="h-12 w-12 text-muted-foreground opacity-30" />
          <p className="font-medium">Em desenvolvimento</p>
          <p className="text-sm text-muted-foreground">Módulo de som disponível na Sprint 4D.</p>
        </CardContent>
      </Card>
    </div>
  );
}
