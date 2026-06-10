import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { FolderKanban, Calendar, Wallet, AlertTriangle, Plus, XCircle, CheckCircle2 } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/utils";

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [projetos, dias, despesas, validacoes] = await Promise.all([
        supabase.from("projetos").select("*").order("criado_em", { ascending: false }),
        supabase.from("dias_filmagem").select("*").gte("data", new Date().toISOString().slice(0, 10)).order("data").limit(10),
        supabase.from("despesas").select("*").eq("status", "pendente").order("data", { ascending: false }).limit(20),
        supabase.from("validacoes_edital").select("*, despesa:despesas(descricao, valor, projeto_id, projeto:projetos(id, nome))").eq("status", "fail").limit(20),
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
          <h1 className="text-2xl font-bold">Página Inicial</h1>
          <p className="text-sm text-muted-foreground">Visao geral da sua produtora</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Dias nos prox. 10</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas de prestacao</CardTitle>
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
                title="Voce ainda nao tem projetos"
                description="Crie o primeiro projeto da sua produtora para comecar a usar a plataforma."
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
              <p className="mt-3 text-xs text-muted-foreground">Orcamento somado: <span className="font-semibold">{formatBRL(totalOrcado)}</span></p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proximos dias de filmagem</CardTitle>
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

      {/* C4 — Painel de alertas de prestacao */}
      <Card className={data?.validacoes.length ? "border-destructive/40" : "border-emerald-200"}>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            {data?.validacoes.length
              ? <XCircle className="h-4 w-4 text-destructive" />
              : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            <CardTitle className="text-base">Alertas de prestacao de contas</CardTitle>
          </div>
          {!!data?.validacoes.length && (
            <Badge variant="destructive">{data.validacoes.length} falha{data.validacoes.length !== 1 ? "s" : ""}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {!data?.validacoes.length ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Nenhuma pendencia de prestacao encontrada em todos os projetos.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.validacoes.map((v: any) => {
                const projetoId = v.despesa?.projeto_id;
                const projetoNome = v.despesa?.projeto?.nome ?? "Projeto";
                return (
                  <li key={v.id} className="flex items-start justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-destructive truncate">{v.mensagem}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {v.despesa?.descricao ?? "—"} · {formatBRL(Number(v.despesa?.valor ?? 0))}
                      </p>
                    </div>
                    {projetoId && (
                      <Link
                        to={`/projetos/${projetoId}/prestacao`}
                        className="shrink-0 text-xs text-primary underline underline-offset-2 hover:no-underline"
                      >
                        {projetoNome}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
