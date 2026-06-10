import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function Administrativo() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-7 w-7 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Administrativo</h1>
          <p className="text-sm text-muted-foreground">Contratos, documentos e status de pagamento por pessoa.</p>
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <ClipboardList className="h-12 w-12 text-muted-foreground opacity-30" />
          <p className="font-medium">Em desenvolvimento</p>
          <p className="text-sm text-muted-foreground">
            Módulo administrativo (contrato pessoal, docs, status de pagamento) disponível na Sprint 4D.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
