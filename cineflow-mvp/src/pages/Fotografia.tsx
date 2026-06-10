import { Card, CardContent } from "@/components/ui/card";
import { Camera } from "lucide-react";

export default function Fotografia() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Camera className="h-7 w-7 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Dep. de Fotografia</h1>
          <p className="text-sm text-muted-foreground">Equipamentos, referências e boletins.</p>
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Camera className="h-12 w-12 text-muted-foreground opacity-30" />
          <p className="font-medium">Em desenvolvimento</p>
          <p className="text-sm text-muted-foreground">Módulo de fotografia disponível na Sprint 4D.</p>
        </CardContent>
      </Card>
    </div>
  );
}
