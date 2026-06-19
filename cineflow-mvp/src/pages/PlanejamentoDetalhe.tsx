import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Users, Trash2, FileText, LogIn, LogOut, Clock, Film, X, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const FASE_LABEL: Record<string, string> = {
  pre_producao: "Pré-produção",
  producao: "Produção",
  dia_gravacao: "Filmagem",
  dia_filmagem: "Filmagem",
  pos_producao: "Pós-produção",
};

const DEPT_LABEL: Record<string, string> = {
  desenvolvimento: "Desenvolvimento",
  direcao: "Direção",
  producao: "Produção",
  fotografia: "Fotografia",
  arte: "Arte",
  som: "Som",
  elenco: "Elenco",
  logistica: "Logística",
  pos_producao: "Pós-produção",
  figurino: "Figurino",
  maquiagem: "Maquiagem",
  pos: "Pós-produção",
  outros: "Outros",
};

function formatHora(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDuracao(entrada: string, saida?: string | null) {
  const ini = new Date(entrada).getTime();
  const fim = saida ? new Date(saida).getTime() : Date.now();
  const min = Math.max(0, Math.floor((fim - ini) / 60000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export default function PlanejamentoDetalhe() {
  const { id: projetoId, diaId } = useParams<{ id: string; diaId: string }>();
  const qc = useQueryClient();

  const { data: dia, isLoading: lDia } = useQuery({
    queryKey: ["planejamento", diaId],
    enabled: !!diaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dias_filmagem")
        .select("*, locacao:locacoes(nome, endereco, maps_url)")
        .eq("id", diaId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: escalas } = useQuery({
    queryKey: ["escalas-planejamento", diaId],
    enabled: !!diaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalas")
        .select("*, projeto_pessoa:projeto_pessoas(id, pessoa:pessoas(id, nome, telefone, funcao), funcao_av:funcoes_av(nome, departamento), papel_descricao, valor_contratacao), pessoa:pessoas(id, nome, funcao, telefone)")
        .eq("dia_id", diaId!)
        .order("hora_chamada");
      if (error) throw error;
      return data;
    },
  });

  const { data: checkIns } = useQuery({
    queryKey: ["check-ins", diaId],
    enabled: !!diaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("dia_id", diaId!)
        .order("entrada");
      if (error) throw error;
      return data;
    },
  });

  const { data: projetoPessoas } = useQuery({
    queryKey: ["projeto-pessoas-disp", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select("id, pessoa_id, pessoa:pessoas(nome, funcao), funcao_av:funcoes_av(nome, departamento)")
        .eq("projeto_id", projetoId!);
      if (error) throw error;
      return data;
    },
  });

  const idsEscalados = new Set(
    (escalas ?? [])
      .map((e: any) => e.projeto_pessoa_id ?? e.pessoa_id)
      .filter(Boolean)
  );

  const disponiveis = (projetoPessoas ?? []).filter(
    (pp: any) => !idsEscalados.has(pp.id) && !idsEscalados.has(pp.pessoa_id)
  );

  const escalar = useMutation({
    mutationFn: async (projetoPessoaId: string) => {
      const pp = (projetoPessoas ?? []).find((x: any) => x.id === projetoPessoaId);
      if (!pp) throw new Error("Pessoa não encontrada no projeto");
      const { error } = await supabase.from("escalas").insert({
        dia_id: diaId,
        pessoa_id: pp.pessoa_id,
        projeto_pessoa_id: projetoPessoaId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa escalada");
      qc.invalidateQueries({ queryKey: ["escalas-planejamento", diaId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const atualizar = useMutation({
    mutationFn: async (e: any) => {
      const { error } = await supabase
        .from("escalas")
        .update({
          hora_chamada: e.hora_chamada || null,
          hora_almoco: e.hora_almoco || null,
          transporte: e.transporte || null,
          observacoes: e.observacoes || null,
        })
        .eq("id", e.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["escalas-planejamento", diaId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const desescalar = useMutation({
    mutationFn: async (eid: string) => {
      const { error } = await supabase.from("escalas").delete().eq("id", eid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["escalas-planejamento", diaId] }),
  });

  const checkIn = useMutation({
    mutationFn: async (projetoPessoaId: string) => {
      const { error } = await supabase.from("check_ins").insert({
        projeto_pessoa_id: projetoPessoaId,
        dia_id: diaId,
        entrada: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in registrado");
      qc.invalidateQueries({ queryKey: ["check-ins", diaId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const checkOut = useMutation({
    mutationFn: async (checkInId: string) => {
      const { error } = await supabase
        .from("check_ins")
        .update({ saida: new Date().toISOString() })
        .eq("id", checkInId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-out registrado");
      qc.invalidateQueries({ queryKey: ["check-ins", diaId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removerCheckIn = useMutation({
    mutationFn: async (cid: string) => {
      const { error } = await supabase.from("check_ins").delete().eq("id", cid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["check-ins", diaId] }),
  });


  // ── Stripboard — cenas alocadas a este dia ───────────────────
  const { data: cenasAlocadas, isLoading: lCenas } = useQuery({
    queryKey: ["stripboard", diaId],
    enabled: !!diaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roteiro_cenas")
        .select("id, numero_cena, cabecalho, sinopse, ambiente, horario, duracao_estimada_min, personagens")
        .eq("dia_id", diaId!)
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: todasCenas } = useQuery({
    queryKey: ["cenas-projeto", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      // Buscar roteiro_id do projeto
      const { data: roteiro } = await supabase
        .from("roteiros")
        .select("id")
        .eq("projeto_id", projetoId!)
        .maybeSingle();
      if (!roteiro) return [];
      const { data, error } = await supabase
        .from("roteiro_cenas")
        .select("id, numero_cena, cabecalho, sinopse, dia_id")
        .eq("roteiro_id", roteiro.id)
        .is("dia_id", null)
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });

  const alocarCena = useMutation({
    mutationFn: async (cenaId: string) => {
      const { error } = await supabase
        .from("roteiro_cenas")
        .update({ dia_id: diaId })
        .eq("id", cenaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cena alocada ao dia");
      qc.invalidateQueries({ queryKey: ["stripboard", diaId] });
      qc.invalidateQueries({ queryKey: ["cenas-projeto", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const desalocarCena = useMutation({
    mutationFn: async (cenaId: string) => {
      const { error } = await supabase
        .from("roteiro_cenas")
        .update({ dia_id: null })
        .eq("id", cenaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cena removida do dia");
      qc.invalidateQueries({ queryKey: ["stripboard", diaId] });
      qc.invalidateQueries({ queryKey: ["cenas-projeto", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (lDia) return <Loading />;
  if (!dia) return <div>Planejamento não encontrado</div>;

  const fase = FASE_LABEL[dia.tipo ?? "dia_gravacao"];

  // Agrupa check-ins por projeto_pessoa
  const checkInsPorPessoa = (checkIns ?? []).reduce((acc: Record<string, any[]>, c: any) => {
    (acc[c.projeto_pessoa_id] ??= []).push(c);
    return acc;
  }, {});

  // Acha check-in aberto (sem saída) por pessoa
  function checkInAberto(ppId: string) {
    return (checkInsPorPessoa[ppId] ?? []).find((c: any) => !c.saida);
  }
  // Total trabalhado por pessoa
  function totalTrabalhadoMin(ppId: string) {
    const all = checkInsPorPessoa[ppId] ?? [];
    return all.reduce((sum, c: any) => {
      const ini = new Date(c.entrada).getTime();
      const fim = c.saida ? new Date(c.saida).getTime() : Date.now();
      return sum + Math.max(0, Math.floor((fim - ini) / 60000));
    }, 0);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projetos/${projetoId}/cronograma`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar ao cronograma
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{fase}</h1>
              <Badge variant="outline">{dia.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(dia.data)}
              {dia.data_fim && dia.periodo !== "dia" && <> a {formatDate(dia.data_fim)}</>}
              {dia.chamada_geral && <> · Chamada {dia.chamada_geral}</>}
              {dia.locacao?.nome && <> · {dia.locacao.nome}</>}
            </p>
            {dia.observacoes && <p className="mt-1 text-xs text-muted-foreground">{dia.observacoes}</p>}
          </div>
          {(dia.tipo === "dia_gravacao" || dia.tipo === "dia_filmagem") && (
            <Button asChild variant="outline">
              <Link to={`/projetos/${projetoId}/ordens-do-dia/${dia.id}`}>
                <FileText className="h-4 w-4" /> Ordem do Dia
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Equipe escalada e check-in</CardTitle>
          <div className="w-[260px]">
            <Select onValueChange={(v) => escalar.mutate(v)}>
              <SelectTrigger><SelectValue placeholder="+ Escalar pessoa do projeto" /></SelectTrigger>
              <SelectContent>
                {disponiveis.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Todas as pessoas do projeto já estão escaladas.</div>
                ) : (
                  disponiveis.map((pp: any) => (
                    <SelectItem key={pp.id} value={pp.id}>
                      {pp.pessoa?.nome} — {pp.funcao_av?.nome ?? pp.pessoa?.funcao ?? "sem função"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!escalas?.length ? (
            <div className="p-6">
              <Empty
                icon={<Users className="h-5 w-5" />}
                title="Nenhuma pessoa escalada"
                description="Adicione pessoas da equipe do projeto neste planejamento. Pessoas precisam estar primeiro em Equipe & Elenco do projeto."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Depto</TableHead>
                  <TableHead>Hora chamada</TableHead>
                  <TableHead>Check-in / Check-out</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalas.map((e: any) => {
                  const nome = e.projeto_pessoa?.pessoa?.nome ?? e.pessoa?.nome ?? "—";
                  const funcao = e.projeto_pessoa?.funcao_av?.nome
                    ?? e.projeto_pessoa?.papel_descricao
                    ?? e.projeto_pessoa?.pessoa?.funcao
                    ?? e.pessoa?.funcao ?? "—";
                  const dept = e.projeto_pessoa?.funcao_av?.departamento;
                  const ppId = e.projeto_pessoa_id;
                  const aberto = ppId ? checkInAberto(ppId) : null;
                  const totalMin = ppId ? totalTrabalhadoMin(ppId) : 0;
                  const totalLabel = totalMin > 0
                    ? (totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}min` : `${totalMin}min`)
                    : "—";
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{nome}</TableCell>
                      <TableCell>{funcao}</TableCell>
                      <TableCell>{dept ? <Badge variant="outline">{DEPT_LABEL[dept] ?? dept}</Badge> : "—"}</TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          defaultValue={e.hora_chamada ?? ""}
                          onBlur={(ev) => atualizar.mutate({ ...e, hora_chamada: ev.target.value })}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        {!ppId ? (
                          <span className="text-xs text-muted-foreground">vínculo legado</span>
                        ) : aberto ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono">
                              <Clock className="mr-1 h-3 w-3" /> Entrou {formatHora(aberto.entrada)}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => checkOut.mutate(aberto.id)}>
                              <LogOut className="h-4 w-4" /> Check-out
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => checkIn.mutate(ppId)}>
                            <LogIn className="h-4 w-4" /> Check-in
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{totalLabel}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => desescalar.mutate(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {checkIns && checkIns.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico de check-ins</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkIns.map((c: any) => {
                  const escala = (escalas ?? []).find((e: any) => e.projeto_pessoa_id === c.projeto_pessoa_id);
                  const nome = escala?.projeto_pessoa?.pessoa?.nome ?? escala?.pessoa?.nome ?? "—";
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{nome}</TableCell>
                      <TableCell className="font-mono text-xs">{formatHora(c.entrada)}</TableCell>
                      <TableCell className="font-mono text-xs">{formatHora(c.saida)}</TableCell>
                      <TableCell className="font-mono text-xs">{formatDuracao(c.entrada, c.saida)}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removerCheckIn.mutate(c.id)} title="Apagar registro">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {dia.locacao && (
        <Card>
          <CardHeader><CardTitle>Locação</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{dia.locacao.nome}</p>
            {dia.locacao.endereco && <p className="text-muted-foreground">{dia.locacao.endereco}</p>}
            {dia.locacao.maps_url && (
              <a href={dia.locacao.maps_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                Abrir no Google Maps
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Stripboard ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Film className="h-4 w-4 text-cyan-600" />
            Cenas do Dia (Stripboard)
          </CardTitle>
          <Badge variant="outline">{cenasAlocadas?.length ?? 0} cenas</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Cenas já alocadas */}
          {lCenas ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : !cenasAlocadas?.length ? (
            <p className="text-xs text-muted-foreground">Nenhuma cena alocada para este dia.</p>
          ) : (
            <div className="space-y-2">
              {cenasAlocadas.map((cena: any) => (
                <div key={cena.id} className="flex items-start gap-3 rounded-lg border p-3 bg-cyan-50/40 dark:bg-cyan-950/10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {cena.numero_cena && (
                        <Badge variant="outline" className="text-xs font-mono">Cena {cena.numero_cena}</Badge>
                      )}
                      {cena.ambiente && <Badge variant="secondary" className="text-xs">{cena.ambiente}</Badge>}
                      {cena.horario && <Badge variant="secondary" className="text-xs">{cena.horario}</Badge>}
                      {cena.duracao_estimada_min && (
                        <span className="text-xs text-muted-foreground">{cena.duracao_estimada_min}min</span>
                      )}
                    </div>
                    {cena.cabecalho && (
                      <p className="text-sm font-medium mt-1 font-mono">{cena.cabecalho}</p>
                    )}
                    {cena.sinopse && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cena.sinopse}</p>
                    )}
                    {Array.isArray(cena.personagens) && cena.personagens.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(cena.personagens as string[]).join(", ")}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => desalocarCena.mutate(cena.id)}
                    title="Remover deste dia"
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Adicionar cenas não alocadas */}
          {todasCenas && todasCenas.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Adicionar cena do roteiro ({todasCenas.length} não alocadas):
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {todasCenas.map((cena: any) => (
                  <div key={cena.id} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                    <div className="min-w-0">
                      <span className="text-xs font-mono text-muted-foreground mr-2">
                        {cena.numero_cena ? `Cena ${cena.numero_cena}` : "—"}
                      </span>
                      <span className="text-sm truncate">{cena.cabecalho ?? cena.sinopse ?? "Sem título"}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-7 text-xs"
                      onClick={() => alocarCena.mutate(cena.id)}
                      disabled={alocarCena.isPending}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Alocar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!todasCenas?.length && !cenasAlocadas?.length && (
            <p className="text-xs text-muted-foreground">
              Nenhuma cena decupada no roteiro.{" "}
              <a href={`/projetos/${projetoId}/roteiro`} className="text-primary underline">
                Enviar roteiro →
              </a>
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
