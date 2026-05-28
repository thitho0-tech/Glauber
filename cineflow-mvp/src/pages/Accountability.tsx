import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Receipt, CheckCircle2, AlertCircle, XCircle, History, PlusCircle, RefreshCw, Trash2 } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function Accountability() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [revalidando, setRevalidando] = useState(false);

  const { data: auditLog } = useQuery({
    queryKey: ["audit-despesas", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .eq("tabela", "despesas")
        .eq("projeto_id", id!)
        .order("criado_em", { ascending: false })
        .limit(20);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data;
    },
  });

  const { data: projeto } = useQuery({
    queryKey: ["projeto-prest", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("*, edital:editais(nome, orgao, prazo_prestacao_meses, rubricas_edital(*))")
        .eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: despesas, isLoading } = useQuery({
    queryKey: ["despesas-prest", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("despesas")
        .select("*, validacao:validacoes_edital(status, mensagem), linha:linhas_orcamento(rubrica_codigo, descricao)")
        .eq("projeto_id", id!)
        .order("data");
      if (error) throw error;
      return data;
    },
  });

  async function revalidarTodas() {
    if (!despesas?.length) return;
    setRevalidando(true);
    try {
      await Promise.all(despesas.map((d: any) => supabase.rpc("validar_despesa", { p_despesa_id: d.id })));
      await qc.invalidateQueries({ queryKey: ["despesas-prest", id] });
      const oksN = (despesas ?? []).filter((d: any) => d.validacao?.[0]?.status === "ok").length;
      const warnsN = (despesas ?? []).filter((d: any) => d.validacao?.[0]?.status === "warn").length;
      const failsN = (despesas ?? []).filter((d: any) => d.validacao?.[0]?.status === "fail").length;
      toast.success(`Revalidacao concluida: ${oksN} ok · ${warnsN} alertas · ${failsN} falhas`);
    } catch (e: any) {
      toast.error("Erro ao revalidar: " + e.message);
    } finally {
      setRevalidando(false);
    }
  }

  if (isLoading) return <Loading />;

  const oks = (despesas ?? []).filter((d: any) => d.validacao?.[0]?.status === "ok");
  const warns = (despesas ?? []).filter((d: any) => d.validacao?.[0]?.status === "warn");
  const fails = (despesas ?? []).filter((d: any) => d.validacao?.[0]?.status === "fail");

  const porRubrica = new Map<string, { previsto: number; realizado: number; nome: string; pctMax: number }>();
  for (const r of projeto?.edital?.rubricas_edital ?? []) {
    porRubrica.set(r.codigo, { previsto: 0, realizado: 0, nome: r.nome, pctMax: Number(r.perc_max ?? 0) });
  }
  for (const d of (despesas ?? [])) {
    const cod = d.linha?.rubrica_codigo;
    if (cod && porRubrica.has(cod)) {
      const it = porRubrica.get(cod)!;
      it.realizado += Number(d.valor ?? 0);
    }
  }
  const totalProjeto = Number(projeto?.orcamento_total ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projetos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
        </Link>
        <h1 className="text-2xl font-bold">Prestacao de Contas</h1>
        {projeto?.edital ? (
          <p className="text-sm text-muted-foreground">
            Edital: <span className="font-medium text-foreground">{projeto.edital.nome}</span> · {projeto.edital.orgao} · prazo {projeto.edital.prazo_prestacao_meses ?? "---"} meses
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Sem edital vinculado --- adicione um na ficha do projeto para ativar as validacoes.</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Conformes</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-700">{oks.length}</p></CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Atencao</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-600">{warns.length}</p></CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Erros bloqueantes</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{fails.length}</p></CardContent>
        </Card>
      </div>

      {projeto?.edital && (
        <Card>
          <CardHeader><CardTitle>Rubricas --- consolidacao</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rubrica</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">% do projeto</TableHead>
                  <TableHead className="text-right">% max. edital</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(porRubrica.entries()).map(([cod, v]) => {
                  const pct = totalProjeto > 0 ? v.realizado / totalProjeto : 0;
                  const status = pct > v.pctMax ? "warn" : "ok";
                  return (
                    <TableRow key={cod}>
                      <TableCell><Badge variant="outline">{cod}</Badge> <span className="ml-2">{v.nome}</span></TableCell>
                      <TableCell className="text-right">{formatBRL(v.realizado)}</TableCell>
                      <TableCell className="text-right">{(pct * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{(v.pctMax * 100).toFixed(0)}%</TableCell>
                      <TableCell>{status === "ok" ? <Badge variant="success">OK</Badge> : <Badge variant="warning">Ultrapassou</Badge>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Despesas com avisos ou erros</CardTitle>
          {(despesas?.length ?? 0) > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={revalidarTodas}
              disabled={revalidando}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${revalidando ? "animate-spin" : ""}`} />
              {revalidando ? "Revalidando..." : "Re-validar todas"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {[...warns, ...fails].length === 0 ? (
            <div className="p-6"><Empty icon={<Receipt className="h-5 w-5" />} title="Tudo em ordem!" description="Nenhum aviso ou erro nas validacoes atuais." /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Mensagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...fails, ...warns].map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>{formatDate(d.data)}</TableCell>
                    <TableCell className="font-medium">{d.descricao}</TableCell>
                    <TableCell className="text-right">{formatBRL(d.valor)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {d.validacao?.[0]?.status === "fail"
                          ? <XCircle className="h-4 w-4 text-destructive" />
                          : <AlertCircle className="h-4 w-4 text-amber-500" />}
                        <span className="text-sm">{d.validacao?.[0]?.mensagem}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Historico de alteracoes em despesas</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">Ultimas 20 operacoes</span>
        </CardHeader>
        <CardContent className="p-0">
          {!auditLog?.length ? (
            <div className="p-6">
              <Empty
                icon={<History className="h-5 w-5" />}
                title="Sem registros ainda"
                description="O audit log sera preenchido automaticamente quando despesas forem criadas, editadas ou removidas."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Operacao</TableHead>
                  <TableHead>Despesa</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.map((entry: any) => {
                  const dados = entry.dados_depois ?? entry.dados_antes ?? {};
                  const opIcon = entry.operacao === "insert"
                    ? <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                    : entry.operacao === "delete"
                    ? <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    : <RefreshCw className="h-3.5 w-3.5 text-amber-500" />;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.criado_em).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {opIcon}
                          <span className="text-xs capitalize">{entry.operacao}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{dados.descricao ?? "---"}</TableCell>
                      <TableCell className="text-sm">
                        {dados.valor != null ? formatBRL(Number(dados.valor)) : "---"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
