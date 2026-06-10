import { Card, CardContent } from "@/components/ui/card";
import { Map } from "lucide-react";

export default function MapaTransporte() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Map className="h-7 w-7 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Mapa de Transporte</h1>
          <p className="text-sm text-muted-foreground">Trechos, veículos, motoristas e links de rota.</p>
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Map className="h-12 w-12 text-muted-foreground opacity-30" />
          <p className="font-medium">Em desenvolvimento</p>
          <p className="text-sm text-muted-foreground">
            O banco de dados já suporta os mapas de transporte (Sprint 4A). A interface completa
            (trechos, links Google Maps, PDF) estará disponível na Sprint 4D.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
