import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Clapperboard } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function PublicCallSheet() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["od-publica", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_do_dia_publico")
        .select("*")
        .eq("token_publico", token!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Loading className="min-h-screen" />;
  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Ordem do Dia indisponível</p>
          <p className="mt-1 text-sm text-muted-foreground">O link expirou ou ainda não foi publicado.</p>
        </div>
      </div>
    );
  }

  const dados: any = data.dados_json ?? {};

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clapperboard className="h-4 w-4" /> Glauber · Ordem do Dia
        </div>
        {data.atualizada_em && (
          <div className="rounded-md border-2 border-amber-400 bg-amber-50 px-4 py-3 text-center">
            <p className="text-sm font-bold text-amber-800">★ ORDEM DO DIA ATUALIZADA</p>
            <p className="text-xs text-amber-700">Versão {data.versao} · atualizada em {formatDate(data.atualizada_em)}</p>
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Ordem do Dia</CardTitle>
            <p className="text-sm text-muted-foreground">Versão {data.versao} · publicada em {formatDate(data.publicada_em)}</p>
          </CardHeader>
        </Card>

        {dados.refeicoes?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Refeições</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {dados.refeicoes.map((r: any, i: number) => (
                  <li key={i} className="flex justify-between border-b py-1.5 last:border-0">
                    <span>{r.tipo}</span>
                    <span className="font-medium">{r.horario}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {(dados.clima || dados.hospital || dados.contatos_emergencia) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Informações de produção</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {dados.clima && <p><span className="font-medium">Previsão:</span> {dados.clima}</p>}
              {dados.hospital && <p><span className="font-medium">Hospital:</span> {dados.hospital}</p>}
              {dados.contatos_emergencia && <p><span className="font-medium">Emergência:</span> {dados.contatos_emergencia}</p>}
            </CardContent>
          </Card>
        )}

        {dados.observacoes && (
          <Card>
            <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm">{dados.observacoes}</p></CardContent>
          </Card>
        )}

        <p className="pt-4 text-center text-xs text-muted-foreground">
          Documento gerado pelo Glauber. Em caso de mudança, uma nova versão será emitida e este link sempre mostrará a mais recente.
        </p>
      </div>
    </div>
  );
}
