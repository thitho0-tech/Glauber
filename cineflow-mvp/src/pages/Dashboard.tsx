import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { FolderKanban, Calendar, Wallet, AlertTriangle, Plus } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/utils";

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [projetos, dias, despesas, validacoes] = await Promise.all([
        supabase.from("projetos").select("*").order("criado_em", { ascending: false }),
        supabase.from("dias_filmagem").select("*").gte("data", new Date().toISOString().slice(0, 10)).order("data").limit(10),
        supabase.from("despesas").select("*").eq("status", "pendente").order("data", { ascending: false }).limit(20),
        supabase.from("validacoes_edital").select("*").eq("status", "fail").limit(10),
      ]);
      return {
        projetos: projetos.data ?? [],
        dias: dias.data ?? [],
        despesas: despesas.data ?? [],
        validacoes: validacoes.data ?? [],
      };
    },
  });

  if (isLoading) return <Loading />;

  const totalOrcado = (data?.projetos ?? []).reduce((s, p: any) => s + Number(p.orcamento_total ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral da sua produtora</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projetos ativos</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.projetos.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dias nos próx. 10</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.dias.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas pendentes</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.despesas.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas de prestação</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.validacoes.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projetos</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.projetos.length ? (
              <Empty
                icon={<FolderKanban className="h-5 w-5" />}
                title="Você ainda não tem projetos"
                description="Crie o primeiro projeto da sua produtora para começar a usar a plataforma."
                action={
                  <Button asChild>
                    <Link to="/projetos">
                      <Plus className="h-4 w-4" /> Criar projeto
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {data.projetos.slice(0, 5).map((p: any) => (
                  <li key={p.id}>
                    <Link to={`/projetos/${p.id}`} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/40">
                      <div>
                        <p className="font-medium">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.tipo} · {formatBRL(p.orcamento_total)}
                        </p>
                      </div>
                      <Badge variant="outline">{p.status.replace("_", " ")}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!!data?.projetos.length && (
              <p className="mt-3 text-xs text-muted-foreground">Orçamento somado: <span className="font-semibold">{formatBRL(totalOrcado)}</span></p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos dias de filmagem</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.dias.length ? (
              <Empty icon={<Calendar className="h-5 w-5" />} title="Nenhum dia agendado" description="Cadastre dias dentro de algum projeto." />
            ) : (
              <ul className="space-y-2">
                {data.dias.map((d: any) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{formatDate(d.data)}</p>
                      <p className="text-xs text-muted-foreground">Chamada {d.chamada_geral ?? "—"}</p>
                    </div>
                    <Badge variant="outline">{d.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
