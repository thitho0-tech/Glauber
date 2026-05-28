import { Calendar, FileText, CreditCard, Clapperboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProximoEvento } from "@/types/dashboard";

type Props = {
  eventos: ProximoEvento[];
  title?: string;
  /** filtra por tipo se informado */
  filterTipo?: ProximoEvento["tipo"];
};

const tipoIcon = {
  edital:          <FileText className="h-3 w-3" />,
  pagamento:       <CreditCard className="h-3 w-3" />,
  evento_criativo: <Clapperboard className="h-3 w-3" />,
};

const tipoBadge: Record<ProximoEvento["tipo"], string> = {
  edital:          "bg-purple-100 text-purple-700",
  pagamento:       "bg-blue-100 text-blue-700",
  evento_criativo: "bg-orange-100 text-orange-700",
};

export function EventsCard({ eventos, title = "Próximos Eventos", filterTipo }: Props) {
  const hoje = new Date();
  const proximos = eventos
    .filter((e) => new Date(e.data) >= hoje)
    .filter((e) => (filterTipo ? e.tipo === filterTipo : true))
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Calendar className="h-4 w-4 text-blue-500" />
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {proximos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum evento próximo.</p>
        ) : (
          <ul className="space-y-3">
            {proximos.map((evt, i) => (
              <li key={i} className="flex items-start gap-2">
                <div
                  className={`mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${tipoBadge[evt.tipo]}`}
                >
                  {tipoIcon[evt.tipo]}
                  {evt.tipo.replace("_", " ")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{evt.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(evt.data).toLocaleDateString("pt-BR")} · {evt.responsavel}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
