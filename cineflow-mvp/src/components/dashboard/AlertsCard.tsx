import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  prazos: string[]; // ISO dates
};

function diasRestantes(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function urgencyVariant(dias: number): "destructive" | "secondary" | "outline" {
  if (dias <= 7)  return "destructive";
  if (dias <= 30) return "secondary";
  return "outline";
}

export function AlertsCard({ prazos }: Props) {
  const hoje = new Date();
  const alertas = prazos
    .map((p) => new Date(p))
    .filter((d) => d > hoje)
    .sort((a, b) => a.getTime() - b.getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <CardTitle className="text-sm font-semibold">Prazos Críticos</CardTitle>
      </CardHeader>
      <CardContent>
        {alertas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum prazo próximo.</p>
        ) : (
          <ul className="space-y-2">
            {alertas.map((data) => {
              const dias = diasRestantes(data.toISOString());
              return (
                <li
                  key={data.toISOString()}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {data.toLocaleDateString("pt-BR")}
                  </div>
                  <Badge variant={urgencyVariant(dias)}>
                    {dias === 0 ? "Hoje" : `${dias}d`}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
