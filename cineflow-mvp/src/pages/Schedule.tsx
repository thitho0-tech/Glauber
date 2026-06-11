import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar as CalendarIcon, ChevronLeft, FileText, Users, Wrench, Clapperboard, Scissors, Lightbulb } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const FASES = [
  { value: "pre_producao", label: "Pré-produção", icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200" },
  { value: "producao",     label: "Produção",      icon: Wrench,    color: "text-sky-600",   bg: "bg-sky-50 dark:bg-sky-950/20",     border: "border-sky-200" },
  { value: "dia_filmagem", label: "Filmagem",      icon: Clapperboard, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200" },
  { value: "pos_producao", label: "Pós-produção",  icon: Scissors,  color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/20", border: "border-violet-200" },
];

export default function Schedule() {
  const { id } = useParams<{ id: string }>();
  const [open, setOpen] = useState(false);
  const [periodo, setPeriodo] = useState<"dia" | "semana" | "mes">("dia");
  const qc = useQueryClient();

  const { data: projeto } = useQuery({
    queryKey: ["projeto-periodo", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("periodo_inicio, periodo_fim, nome")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: dias, isLoading } = useQuery({
    queryKey: ["dias", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dias_filmagem")
        .select("*, locacao:locacoes(nome)")
        .eq("projeto_id", id!)
        .order("data");
      if (error) throw error;
      return data;
    },
  });

  const { data: locacoes } = useQuery({
    queryKey: ["locacoes-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locacoes").select("*").eq("projeto_id", id!).is("deleted_at", null).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const criar = useMutation({
    mutationFn: async (form: FormData) => {
      const payload: any = {
        projeto_id: id,
        tipo: form.get("tipo"),
        periodo: form.get("periodo"),
        data: form.get("data"),
        data_fim: form.get("data_fim") || null,
        chamada_geral: form.get("chamada_geral") || null,
        locacao_id: form.get("locacao_id") || null,
        observacoes: form.get("observacoes") || null,
      };
      const { error } = await supabase.from("dias_filmagem").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Planejamento criado");
      qc.invalidateQueries({ queryKey: ["dias", id] });
      setOpen(false);
      setPeriodo("dia");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;

  const minData = projeto?.periodo_inicio ?? undefined;
  const maxData = projeto?.periodo_fim ?? undefined;

  const porFase = FASES.reduce((acc: Record<string, any[]>, f) => {
    acc[f.value] = (dias ?? []).filter((d: any) => (d.tipo ?? "dia_filmagem") === f.value);
    return acc;
  }, {});

  const total = dias?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/projetos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
          </Link>
          <h1 className="text-2xl font-bold">Cronograma e Planejamento</h1>
          {projeto?.periodo_inicio && (
            <p className="text-xs text-muted-foreground">
              Período do projeto: {formatDate(projeto.periodo_inicio)} a {formatDate(projeto.periodo_fim)}
            </p>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Planejamento</Button></DialogTrigger>
          <DialogContent>
            <form onSubmit={(e) => { e.preventDefault(); criar.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <DialogHeader><DialogTitle>Novo planejamento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tipo">Fase</Label>
                    <Select name="tipo" defaultValue="dia_filmagem">
                      <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FASES.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="periodo">Período</Label>
                    <Select name="periodo" defaultValue="dia" onValueChange={(v: any) => setPeriodo(v)}>
                      <SelectTrigger id="periodo"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dia">Dia</SelectItem>
                        <SelectItem value="semana">Semana</SelectItem>
                        <SelectItem value="mes">Mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="data">{periodo === "dia" ? "Data" : "Data inicial"}</Label>
                    <Input id="data" name="data" type="date" required min={minData} max={maxData} />
                  </div>
                  {periodo !== "dia" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="data_fim">Data final</Label>
                      <Input id="data_fim" name="data_fim" type="date" required min={minData} max={maxData} />
                    </div>
                  )}
                  {periodo === "dia" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="chamada_geral">Chamada geral</Label>
                      <Input id="chamada_geral" name="chamada_geral" type="time" />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="locacao_id">Locação principal</Label>
                  <Select name="locacao_id">
                    <SelectTrigger id="locacao_id"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      {(locacoes ?? []).map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Input id="observacoes" name="observacoes" placeholder="Notas livres..." />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <span title={!minData || !maxData ? "Defina as datas do projeto primeiro" : undefined}>
                  <Button type="submit" disabled={criar.isPending || !minData || !maxData}>
                    {criar.isPending ? "Criando..." : "Criar planejamento"}
                  </Button>
                </span>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {total === 0 ? (
        <Empty
          icon={<CalendarIcon className="h-5 w-5" />}
          title="Nenhum planejamento ainda"
          description="Adicione um planejamento (pré-prod, produção, filmagem ou pós) para começar a montar o cronograma."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Planejamento</Button>}
        />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            {FASES.map((f) => {
              const Icon = f.icon;
              const count = porFase[f.value]?.length ?? 0;
              return (
                <Card key={f.value} className={count > 0 ? f.border : ""}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`rounded-md p-2 ${f.bg}`}>
                      <Icon className={`h-5 w-5 ${f.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-6">
            {FASES.map((f) => {
              const items = porFase[f.value] ?? [];
              if (items.length === 0) return null;
              const Icon = f.icon;
              return (
                <Card key={f.value}>
                  <CardHeader className="flex flex-row items-center gap-2 pb-3">
                    <div className={`rounded-md p-1.5 ${f.bg}`}>
                      <Icon className={`h-4 w-4 ${f.color}`} />
                    </div>
                    <CardTitle className="text-base">{f.label}</CardTitle>
                    <Badge variant="outline">{items.length}</Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Período</TableHead>
                          <TableHead>Chamada</TableHead>
                          <TableHead>Locação</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Observações</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((d: any) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">
                              {formatDate(d.data)}
                              {d.data_fim && d.periodo !== "dia" && <> – {formatDate(d.data_fim)}</>}
                              {d.periodo && d.periodo !== "dia" && (
                                <Badge variant="outline" className="ml-2 text-xs">{d.periodo}</Badge>
                              )}
                            </TableCell>
                            <TableCell>{d.chamada_geral ?? "—"}</TableCell>
                            <TableCell>{d.locacao?.nome ?? "—"}</TableCell>
                            <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                            <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{d.observacoes ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button asChild size="sm" variant="ghost">
                                  <Link to={`/projetos/${id}/cronograma/${d.id}`}>
                                    <Users className="h-4 w-4" /> Escala
                                  </Link>
                                </Button>
                                {d.tipo === "dia_filmagem" && (
                                  <Button asChild size="sm" variant="ghost">
                                    <Link to={`/projetos/${id}/ordens-do-dia/${d.id}`}>
                                      <FileText className="h-4 w-4" /> Ordem do Dia
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
