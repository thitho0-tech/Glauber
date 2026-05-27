import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, ChevronLeft, CheckCircle2, AlertCircle, XCircle, AlertTriangle } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function Finance() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [openLinha, setOpenLinha] = useState(false);
  const [openDespesa, setOpenDespesa] = useState(false);

  const { data: projeto } = useQuery({
    queryKey: ["projeto-fin", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("*, edital:editais(nome, teto_global, teto_observacao, rubricas_edital(*))")
        .eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: tetoCheck } = useQuery({
    queryKey: ["teto-check", id, projeto?.orcamento_total],
    enabled: !!id && !!projeto?.edital_id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_orcamento_dentro_teto", { p_projeto_id: id! });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
  });

  const { data: orcamento } = useQuery({
    queryKey: ["orcamento", id],
    enabled: !!id,
    queryFn: async () => {
      let { data } = await supabase.from("orcamentos").select("*").eq("projeto_id", id!).maybeSingle();
      if (!data) {
        const { data: novo } = await supabase.from("orcamentos").insert({ projeto_id: id! }).select().single();
        data = novo;
      }
      return data;
    },
  });

  const { data: linhas } = useQuery({
    queryKey: ["linhas", orcamento?.id],
    enabled: !!orcamento?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("linhas_orcamento").select("*").eq("orcamento_id", orcamento!.id).order("rubrica_codigo");
      if (error) throw error;
      return data;
    },
  });

  const { data: despesas, isLoading: l3 } = useQuery({
    queryKey: ["despesas", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("despesas")
        .select("*, validacao:validacoes_edital(status, mensagem), linha:linhas_orcamento(rubrica_codigo, descricao)")
        .eq("projeto_id", id!)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const criarLinha = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orcamento?.id) throw new Error("Sem orçamento");
      const payload: any = {
        orcamento_id: orcamento.id,
        rubrica_codigo: form.get("rubrica_codigo"),
        descricao: form.get("descricao"),
        valor_previsto: Number(form.get("valor_previsto") ?? 0),
      };
      const { error } = await supabase.from("linhas_orcamento").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rubrica adicionada"); qc.invalidateQueries({ queryKey: ["linhas", orcamento?.id] }); setOpenLinha(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const criarDespesa = useMutation({
    mutationFn: async (form: FormData) => {
      const payload: any = {
        projeto_id: id,
        linha_orcamento_id: form.get("linha_orcamento_id") || null,
        descricao: form.get("descricao"),
        valor: Number(form.get("valor")),
        data: form.get("data"),
        data_emissao_nf: form.get("data_emissao_nf") || null,
        forma_pagamento: form.get("forma_pagamento") || "transferencia",
        departamento: form.get("departamento") || null,
        cnpj_emitente: form.get("cnpj_emitente") || null,
        numero_nf: form.get("numero_nf") || null,
      };
      const { error } = await supabase.from("despesas").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Despesa registrada"); qc.invalidateQueries({ queryKey: ["despesas", id] }); setOpenDespesa(false); },
    onError: (e: any) => toast.error(e.message),
  });

  if (l3) return <Loading />;

  const totalRealizado = (despesas ?? []).reduce((s: number, d: any) => s + Number(d.valor), 0);
  const rubricasEdital = projeto?.edital?.rubricas_edital ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projetos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
        </Link>
        <h1 className="text-2xl font-bold">Financeiro</h1>
      </div>

      {tetoCheck?.status === "warn" && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">Orçamento ultrapassa o teto do edital</p>
              <p className="text-amber-800 dark:text-amber-300">
                Orçamento atual: <strong>{formatBRL(tetoCheck.atual)}</strong> · Teto do edital{projeto?.edital?.nome ? ` (${projeto.edital.nome})` : ""}: <strong>{formatBRL(tetoCheck.teto)}</strong>
              </p>
              {projeto?.edital?.teto_observacao && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{projeto.edital.teto_observacao}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Orçamento total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatBRL(projeto?.orcamento_total ?? 0)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Já gasto</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatBRL(totalRealizado)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatBRL(Number(projeto?.orcamento_total ?? 0) - totalRealizado)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="orcamento">
        <TabsList>
          <TabsTrigger value="orcamento">Rubricas do orçamento</TabsTrigger>
          <TabsTrigger value="despesas">Lançamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="orcamento">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Rubricas</CardTitle>
              <Dialog open={openLinha} onOpenChange={setOpenLinha}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nova rubrica</Button></DialogTrigger>
                <DialogContent>
                  <form onSubmit={(e) => { e.preventDefault(); criarLinha.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                    <DialogHeader><DialogTitle>Nova rubrica do orçamento</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="rubrica_codigo">Código da rubrica</Label>
                        {rubricasEdital.length > 0 ? (
                          <Select name="rubrica_codigo">
                            <SelectTrigger><SelectValue placeholder="Selecione a rubrica do edital" /></SelectTrigger>
                            <SelectContent>
                              {rubricasEdital.map((r: any) => (
                                <SelectItem key={r.id} value={r.codigo}>{r.codigo} · {r.nome} (máx {((r.perc_max ?? 0) * 100).toFixed(0)}%)</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input name="rubrica_codigo" placeholder="Ex.: EQUIPE, ELENCO, EQUIP" />
                        )}
                      </div>
                      <div className="space-y-1.5"><Label htmlFor="descricao">Descrição</Label><Input id="descricao" name="descricao" required /></div>
                      <div className="space-y-1.5"><Label htmlFor="valor_previsto">Valor previsto (R$)</Label><Input id="valor_previsto" name="valor_previsto" type="number" step="0.01" required /></div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpenLinha(false)}>Cancelar</Button>
                      <Button type="submit" disabled={criarLinha.isPending}>{criarLinha.isPending ? "Salvando..." : "Adicionar"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {!linhas?.length ? (
                <div className="p-6"><Empty icon={<Wallet className="h-5 w-5" />} title="Sem rubricas" description="Defina as rubricas do orçamento conforme o edital escolhido." /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Previsto</TableHead>
                      <TableHead className="text-right">Realizado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((l: any) => {
                      const realizado = (despesas ?? []).filter((d: any) => d.linha_orcamento_id === l.id).reduce((s: number, d: any) => s + Number(d.valor), 0);
                      return (
                        <TableRow key={l.id}>
                          <TableCell><Badge variant="outline">{l.rubrica_codigo}</Badge></TableCell>
                          <TableCell className="font-medium">{l.descricao}</TableCell>
                          <TableCell className="text-right">{formatBRL(l.valor_previsto)}</TableCell>
                          <TableCell className="text-right">{formatBRL(realizado)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="despesas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Despesas lançadas</CardTitle>
              <Dialog open={openDespesa} onOpenChange={setOpenDespesa}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nova despesa</Button></DialogTrigger>
                <DialogContent>
                  <form onSubmit={(e) => { e.preventDefault(); criarDespesa.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                    <DialogHeader><DialogTitle>Nova despesa</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1.5"><Label htmlFor="descricao">Descrição</Label><Input id="descricao" name="descricao" required /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label htmlFor="valor">Valor (R$)</Label><Input id="valor" name="valor" type="number" step="0.01" required /></div>
                        <div className="space-y-1.5"><Label htmlFor="data">Data</Label><Input id="data" name="data" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="linha_orcamento_id">Rubrica</Label>
                        <Select name="linha_orcamento_id">
                          <SelectTrigger><SelectValue placeholder="Sem rubrica" /></SelectTrigger>
                          <SelectContent>
                            {(linhas ?? []).map((l: any) => (
                              <SelectItem key={l.id} value={l.id}>{l.rubrica_codigo} · {l.descricao}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label htmlFor="cnpj_emitente">CNPJ emitente</Label><Input id="cnpj_emitente" name="cnpj_emitente" placeholder="00.000.000/0000-00" /></div>
                        <div className="space-y-1.5"><Label htmlFor="numero_nf">Nº da NF</Label><Input id="numero_nf" name="numero_nf" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="data_emissao_nf">Data de emissão da NF</Label>
                          <Input id="data_emissao_nf" name="data_emissao_nf" type="date" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="forma_pagamento">Forma de pagamento</Label>
                          <Select name="forma_pagamento" defaultValue="transferencia">
                            <SelectTrigger id="forma_pagamento"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pix">PIX</SelectItem>
                              <SelectItem value="transferencia">Transferência</SelectItem>
                              <SelectItem value="dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="cartao_debito">Cartão de débito</SelectItem>
                              <SelectItem value="cartao_credito">Cartão de crédito</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpenDespesa(false)}>Cancelar</Button>
                      <Button type="submit" disabled={criarDespesa.isPending}>{criarDespesa.isPending ? "Lançando..." : "Lançar"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              {!despesas?.length ? (
                <div className="p-6"><Empty icon={<Wallet className="h-5 w-5" />} title="Sem despesas lançadas" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Rubrica</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Validação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {despesas.map((d: any) => {
                      const val = d.validacao?.[0];
                      const icon = val?.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  : val?.status === "warn" ? <AlertCircle className="h-4 w-4 text-amber-500" />
                                  : val?.status === "fail" ? <XCircle className="h-4 w-4 text-destructive" />
                                  : null;
                      return (
                        <TableRow key={d.id}>
                          <TableCell>{formatDate(d.data)}</TableCell>
                          <TableCell className="font-medium">{d.descricao}</TableCell>
                          <TableCell>{d.linha?.rubrica_codigo ? <Badge variant="outline">{d.linha.rubrica_codigo}</Badge> : "—"}</TableCell>
                          <TableCell className="text-right">{formatBRL(d.valor)}</TableCell>
                          <TableCell><div className="flex items-center gap-2">{icon}<span className="text-xs text-muted-foreground">{val?.mensagem ?? "—"}</span></div></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
