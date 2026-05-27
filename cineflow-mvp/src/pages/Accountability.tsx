import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Receipt, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/utils";

export default function Accountability() {
  const { id } = useParams<{ id: string }>();

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

  if (isLoading) return <Loading />;

  const oks = (despesas ?? []).filter((d: any) => d.validacao?.[0]?.status === "ok");
  const warns = (despesas ?? []).filter((d: any) => d.validacao?.[0]?.status === "warn");
  const fails = (despesas ?? []).filter((d: any) => d.validacao?.[0]?.status === "fail");

  // Agregação por rubrica
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
        <h1 className="text-2xl font-bold">Prestação de Contas</h1>
        {projeto?.edital ? (
          <p className="text-sm text-muted-foreground">
            Edital: <span className="font-medium text-foreground">{projeto.edital.nome}</span> · {projeto.edital.orgao} · prazo {projeto.edital.prazo_prestacao_meses ?? "—"} meses
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Sem edital vinculado — adicione um na ficha do projeto para ativar as validações.</p>
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
            <CardTitle className="text-sm text-muted-foreground">Atenção</CardTitle>
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
          <CardHeader><CardTitle>Rubricas — consolidação</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rubrica</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">% do projeto</TableHead>
                  <TableHead className="text-right">% máx. edital</TableHead>
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
        <CardHeader><CardTitle>Despesas com avisos ou erros</CardTitle></CardHeader>
        <CardContent className="p-0">
          {[...warns, ...fails].length === 0 ? (
            <div className="p-6"><Empty icon={<Receipt className="h-5 w-5" />} title="Tudo em ordem!" description="Nenhum aviso ou erro nas validações atuais." /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
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
                        {d.validacao?.[0]?.status === "fail" ? <XCircle className="h-4 w-4 text-destructive" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
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
    </div>
  );
}
