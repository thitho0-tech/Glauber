import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Send, Save, Plus, Trash2, ExternalLink, MapPin, Utensils, ShieldAlert, Sparkles, Car, FileText } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

interface Contato { nome: string; funcao: string; telefone: string; }

interface ODData {
  // Bloco Alimentação
  refeicoes?: { tipo: string; horario: string }[];
  almoco_inicio?: string;
  almoco_fim?: string;
  bebidas?: string;
  // Bloco Estacionamento
  estacionamento_local?: string;
  estacionamento_vagas?: string;
  estacionamento_observacoes?: string;
  // Bloco Segurança
  hospital?: string;
  bloqueio_ruas?: string;
  // Bloco Efeitos especiais
  efeitos_especiais?: string;
  // Bloco Info / Riscos
  clima?: string;
  contatos_emergencia_lista?: Contato[];
  contatos_emergencia?: string; // texto livre legado
  notas_importantes?: string;
  observacoes?: string;
}

const DEPARTAMENTOS = [
  { value: "direcao", label: "Direção" },
  { value: "producao", label: "Produção" },
  { value: "fotografia", label: "Fotografia" },
  { value: "arte", label: "Arte" },
  { value: "som", label: "Som" },
  { value: "elenco", label: "Elenco" },
  { value: "logistica", label: "Logística" },
  { value: "figurino", label: "Figurino" },
  { value: "maquiagem", label: "Maquiagem" },
  { value: "outros", label: "Outros" },
];

const DEPT_LABEL: Record<string, string> = Object.fromEntries(DEPARTAMENTOS.map((d) => [d.value, d.label]));

const TIPO_LABEL: Record<string, string> = {
  filmagem: "Filmagem",
  ensaio: "Ensaio",
  reuniao: "Reunião",
  pesquisa: "Pesquisa",
  outro: "Outro",
};

export default function CallSheetEditor() {
  const { id: projetoId, odId, diaId } = useParams<{ id: string; odId?: string; diaId?: string }>();
  const qc = useQueryClient();
  const [dados, setDados] = useState<ODData>({ refeicoes: [{ tipo: "Almoço", horario: "13:00" }] });

  const { data: od, isLoading: lOd } = useQuery({
    queryKey: ["od-edit", odId ?? diaId],
    enabled: !!(odId || diaId),
    queryFn: async () => {
      if (odId) {
        const { data, error } = await supabase
          .from("ordens_do_dia")
          .select("*, dia:dias_filmagem(data, chamada_geral, locacao:locacoes(nome, endereco, maps_url))")
          .eq("id", odId)
          .single();
        if (error) throw error;
        return data;
      }
      const { data: existente, error: e1 } = await supabase
        .from("ordens_do_dia")
        .select("*, dia:dias_filmagem(data, chamada_geral, locacao:locacoes(nome, endereco, maps_url))")
        .eq("dia_id", diaId!)
        .order("versao", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (e1) throw e1;
      if (existente) return existente;
      const { data: dia, error: eDia } = await supabase
        .from("dias_filmagem")
        .select("projeto_id, data")
        .eq("id", diaId!)
        .single();
      if (eDia) throw eDia;
      const { data: nova, error: e2 } = await supabase
        .from("ordens_do_dia")
        .insert({
          projeto_id: dia.projeto_id,
          dia_id: diaId,
          data: dia.data,
          tipo: "filmagem",
          titulo: "OD de " + dia.data,
          dados_json: {},
        })
        .select("*, dia:dias_filmagem(data, chamada_geral, locacao:locacoes(nome, endereco, maps_url))")
        .single();
      if (e2) throw e2;
      return nova;
    },
  });

  useEffect(() => {
    if (od?.dados_json && typeof od.dados_json === "object") {
      setDados(od.dados_json as ODData);
    }
  }, [od]);

  const { data: secoes } = useQuery({
    queryKey: ["od-secoes", od?.id],
    enabled: !!od?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("od_secoes").select("*").eq("od_id", od!.id).order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const { data: cenas } = useQuery({
    queryKey: ["od-cenas", od?.id],
    enabled: !!od?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("od_cenas").select("*").eq("od_id", od!.id).order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const { data: escalas } = useQuery({
    queryKey: ["escalas-od", od?.dia_id],
    enabled: !!od?.dia_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalas")
        .select("*, pessoa:pessoas(id, nome, funcao, departamento, telefone)")
        .eq("dia_id", od!.dia_id);
      if (error) throw error;
      return data;
    },
  });

  const adicionarSecao = useMutation({
    mutationFn: async (departamento: string) => {
      if (!od?.id) throw new Error("OD não carregada");
      const { error } = await supabase.from("od_secoes").insert({ od_id: od.id, departamento, ordem: (secoes?.length ?? 0) });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["od-secoes", od?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const atualizarSecao = useMutation({
    mutationFn: async (s: any) => {
      const { error } = await supabase.from("od_secoes").update({ titulo: s.titulo, conteudo: s.conteudo }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Seção salva"); qc.invalidateQueries({ queryKey: ["od-secoes", od?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const removerSecao = useMutation({
    mutationFn: async (sid: string) => {
      const { error } = await supabase.from("od_secoes").delete().eq("id", sid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["od-secoes", od?.id] }),
  });

  const adicionarCena = useMutation({
    mutationFn: async () => {
      if (!od?.id) throw new Error("OD não carregada");
      const { error } = await supabase.from("od_cenas").insert({ od_id: od.id, numero: "", descricao: "", ordem: (cenas?.length ?? 0) });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["od-cenas", od?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const atualizarCena = useMutation({
    mutationFn: async (c: any) => {
      const { error } = await supabase
        .from("od_cenas")
        .update({ numero: c.numero, descricao: c.descricao, tempo_estimado_min: c.tempo_estimado_min ? Number(c.tempo_estimado_min) : null })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["od-cenas", od?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const removerCena = useMutation({
    mutationFn: async (cid: string) => {
      const { error } = await supabase.from("od_cenas").delete().eq("id", cid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["od-cenas", od?.id] }),
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (!od) throw new Error("OD não carregada");
      const { error } = await supabase.from("ordens_do_dia").update({ dados_json: dados }).eq("id", od.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ordem do Dia salva"); qc.invalidateQueries({ queryKey: ["od-edit", od?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const publicar = useMutation({
    mutationFn: async () => {
      if (!od) throw new Error("Salve antes de publicar");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("ordens_do_dia")
        .update({ publicada_em: new Date().toISOString(), publicada_por: u.user?.id, versao: od.versao })
        .eq("id", od.id);
      if (error) throw error;
      // D4 — notificacoes in-app para membros com notif_od_inapp = true
      await supabase.rpc("notificar_od_publicada", {
        p_od_id: od.id,
        p_projeto_id: od.projeto_id,
        p_titulo_od: od.titulo ?? "Sem titulo",
      });
      // D5 — notificacao por email via Edge Function (membros com notif_od_email = true)
      try {
        const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notificar-od`;
        const secret = import.meta.env.VITE_EDGE_SHARED_SECRET ?? "";
        if (secret) {
          await fetch(edgeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-glauber-secret": secret },
            body: JSON.stringify({ od_id: od.id }),
          });
        }
      } catch {
        // Email falhou silenciosamente — notificação in-app já foi enviada
      }
    },
    onSuccess: () => { toast.success("Publicada! Membros notificados."); qc.invalidateQueries({ queryKey: ["od-edit", od?.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (lOd) return <Loading />;
  if (!od) return <div>OD não encontrada</div>;

  const linkPublico = od.token_publico ? `${window.location.origin}/od/${od.token_publico}` : null;
  const dataExibicao = od.data ?? od.dia?.data;
  const contatos = dados.contatos_emergencia_lista ?? [];

  function setContato(i: number, patch: Partial<Contato>) {
    const list = [...contatos];
    list[i] = { ...list[i], ...patch };
    setDados({ ...dados, contatos_emergencia_lista: list });
  }
  function addContato() {
    setDados({ ...dados, contatos_emergencia_lista: [...contatos, { nome: "", funcao: "", telefone: "" }] });
  }
  function rmContato(i: number) {
    setDados({ ...dados, contatos_emergencia_lista: contatos.filter((_, j) => j !== i) });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projetos/${projetoId}/ordens-do-dia`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{od.titulo ?? "Ordem do Dia"}</h1>
              <Badge variant="outline">{TIPO_LABEL[od.tipo ?? "filmagem"]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {dataExibicao ? formatDate(dataExibicao) : "Sem data"}
              {od.dia?.chamada_geral ? " · Chamada " + od.dia.chamada_geral : ""}
              {od.dia?.locacao?.nome ? " · Locação: " + od.dia.locacao.nome : ""}
            </p>
            {od.publicada_em && (
              <p className="mt-1 text-xs text-emerald-600">Publicada v{od.versao} em {formatDateTime(od.publicada_em)}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
            <Button onClick={() => publicar.mutate()} disabled={publicar.isPending}>
              <Send className="h-4 w-4" /> Publicar
            </Button>
          </div>
        </div>
      </div>

      {linkPublico && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium">Link público (sem login)</p>
              <p className="break-all text-xs text-muted-foreground">{linkPublico}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(linkPublico); toast.success("Copiado!"); }}>
                Copiar link
              </Button>
              <Button size="sm" asChild>
                <a href={`https://wa.me/?text=${encodeURIComponent("OD: " + linkPublico)}`} target="_blank" rel="noreferrer">
                  Enviar via WhatsApp
                </a>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={linkPublico} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="cenas">Cenas ({cenas?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="departamentos">Departamentos ({secoes?.length ?? 0})</TabsTrigger>
          {od.dia_id && <TabsTrigger value="equipe">Equipe ({escalas?.length ?? 0})</TabsTrigger>}
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          {/* Bloco Locação (somente leitura, vem do dia) */}
          {od.dia?.locacao && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Locação</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{od.dia.locacao.nome}</p>
                {od.dia.locacao.endereco && <p className="text-muted-foreground">{od.dia.locacao.endereco}</p>}
                {od.dia.locacao.maps_url && (
                  <a href={od.dia.locacao.maps_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Abrir no Google Maps</a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bloco Estacionamento */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Car className="h-4 w-4" /> Estacionamento</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="est_local">Local</Label>
                <Input id="est_local" value={dados.estacionamento_local ?? ""} onChange={(e) => setDados({ ...dados, estacionamento_local: e.target.value })} placeholder="Pátio traseiro, rua lateral..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="est_vagas">Vagas / valor</Label>
                <Input id="est_vagas" value={dados.estacionamento_vagas ?? ""} onChange={(e) => setDados({ ...dados, estacionamento_vagas: e.target.value })} placeholder="10 vagas · gratuito" />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="est_obs">Observações</Label>
                <Input id="est_obs" value={dados.estacionamento_observacoes ?? ""} onChange={(e) => setDados({ ...dados, estacionamento_observacoes: e.target.value })} placeholder="Procurar Marcelo (zelador), bloquear entre 6h e 21h..." />
              </div>
            </CardContent>
          </Card>

          {/* Bloco Alimentação */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Utensils className="h-4 w-4" /> Alimentação</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="alm_inicio">Almoço início</Label>
                  <Input id="alm_inicio" type="time" value={dados.almoco_inicio ?? ""} onChange={(e) => setDados({ ...dados, almoco_inicio: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alm_fim">Almoço fim</Label>
                  <Input id="alm_fim" type="time" value={dados.almoco_fim ?? ""} onChange={(e) => setDados({ ...dados, almoco_fim: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bebidas">Bebidas / lanches</Label>
                <Input id="bebidas" value={dados.bebidas ?? ""} onChange={(e) => setDados({ ...dados, bebidas: e.target.value })} placeholder="Café, água e fruta o dia todo · catering Maria" />
              </div>
              <div className="space-y-2">
                <Label>Outras refeições / horários</Label>
                {(dados.refeicoes ?? []).map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={r.tipo} onChange={(e) => {
                      const refs = [...(dados.refeicoes ?? [])];
                      refs[i] = { ...refs[i], tipo: e.target.value };
                      setDados({ ...dados, refeicoes: refs });
                    }} placeholder="Tipo (Café, Lanche...)" />
                    <Input value={r.horario} onChange={(e) => {
                      const refs = [...(dados.refeicoes ?? [])];
                      refs[i] = { ...refs[i], horario: e.target.value };
                      setDados({ ...dados, refeicoes: refs });
                    }} placeholder="Horário" />
                    <Button size="icon" variant="ghost" onClick={() => {
                      const refs = (dados.refeicoes ?? []).filter((_, j) => j !== i);
                      setDados({ ...dados, refeicoes: refs });
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setDados({ ...dados, refeicoes: [...(dados.refeicoes ?? []), { tipo: "", horario: "" }] })}>
                  <Plus className="h-4 w-4" /> Adicionar refeição
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bloco Segurança */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4" /> Segurança</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="hospital">Hospital mais próximo</Label>
                <Input id="hospital" value={dados.hospital ?? ""} onChange={(e) => setDados({ ...dados, hospital: e.target.value })} placeholder="Nome · endereço · telefone (192 SAMU)" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bloqueio">Bloqueio de ruas / autorizações</Label>
                <Input id="bloqueio" value={dados.bloqueio_ruas ?? ""} onChange={(e) => setDados({ ...dados, bloqueio_ruas: e.target.value })} placeholder="Bloqueio Rua X das 7h às 14h · CTTU notificado" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clima">Previsão do tempo</Label>
                <Input id="clima" value={dados.clima ?? ""} onChange={(e) => setDados({ ...dados, clima: e.target.value })} placeholder="Sol, 28°C, vento leve" />
              </div>
            </CardContent>
          </Card>

          {/* Bloco Efeitos especiais */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Efeitos especiais</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={3} value={dados.efeitos_especiais ?? ""} onChange={(e) => setDados({ ...dados, efeitos_especiais: e.target.value })} placeholder="Descrição do efeito · responsável · materiais · riscos · perímetro" />
            </CardContent>
          </Card>

          {/* Bloco Contatos de emergência */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Contatos de emergência</CardTitle>
              <Button size="sm" variant="outline" onClick={addContato}><Plus className="h-4 w-4" /> Adicionar</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {contatos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Liste produtor executivo, dir. de produção, segurança, hospital, bombeiros...</p>
              ) : (
                contatos.map((c, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-4" placeholder="Nome" value={c.nome} onChange={(e) => setContato(i, { nome: e.target.value })} />
                    <Input className="col-span-4" placeholder="Função" value={c.funcao} onChange={(e) => setContato(i, { funcao: e.target.value })} />
                    <Input className="col-span-3" placeholder="Telefone" value={c.telefone} onChange={(e) => setContato(i, { telefone: e.target.value })} />
                    <Button size="icon" variant="ghost" onClick={() => rmContato(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Bloco Notas importantes */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Notas importantes</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={4} value={dados.notas_importantes ?? ""} onChange={(e) => setDados({ ...dados, notas_importantes: e.target.value })} placeholder="Avisos, restrições da locação, alterações de última hora, lembretes..." />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cenas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cenas a filmar</CardTitle>
              <Button size="sm" onClick={() => adicionarCena.mutate()}><Plus className="h-4 w-4" /> Adicionar cena</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {!cenas?.length ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma cena adicionada.</p>
              ) : (
                cenas.map((c: any) => (
                  <div key={c.id} className="rounded-md border p-3">
                    <div className="grid grid-cols-12 gap-2">
                      <Input className="col-span-2" placeholder="Cena Nº" defaultValue={c.numero ?? ""} onBlur={(e) => atualizarCena.mutate({ ...c, numero: e.target.value })} />
                      <Input className="col-span-7" placeholder="Descrição" defaultValue={c.descricao ?? ""} onBlur={(e) => atualizarCena.mutate({ ...c, descricao: e.target.value })} />
                      <Input className="col-span-2" type="number" placeholder="min" defaultValue={c.tempo_estimado_min ?? ""} onBlur={(e) => atualizarCena.mutate({ ...c, tempo_estimado_min: e.target.value })} />
                      <Button size="icon" variant="ghost" onClick={() => removerCena.mutate(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departamentos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Seções por departamento</CardTitle>
              <Select onValueChange={(v) => adicionarSecao.mutate(v)}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="+ Adicionar seção" /></SelectTrigger>
                <SelectContent>
                  {DEPARTAMENTOS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-4">
              {!secoes?.length ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Adicione uma seção (Arte, Câmera, Som...) para escrever instruções específicas de cada departamento.</p>
              ) : (
                secoes.map((s: any) => (
                  <div key={s.id} className="space-y-2 rounded-md border p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{DEPT_LABEL[s.departamento] ?? s.departamento}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => removerSecao.mutate(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Input placeholder="Título da seção (opcional)" defaultValue={s.titulo ?? ""} onBlur={(e) => atualizarSecao.mutate({ ...s, titulo: e.target.value })} />
                    <Textarea rows={4} placeholder="Lista de material, instruções, observações..." defaultValue={s.conteudo ?? ""} onBlur={(e) => atualizarSecao.mutate({ ...s, conteudo: e.target.value })} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {od.dia_id && (
          <TabsContent value="equipe">
            <Card>
              <CardHeader><CardTitle>Equipe escalada (do dia de filmagem)</CardTitle></CardHeader>
              <CardContent>
                {!escalas?.length ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma pessoa escalada no dia de filmagem.</p>
                ) : (
                  <ul className="divide-y">
                    {escalas.map((e: any) => (
                      <li key={e.id} className="py-2 text-sm">
                        <span className="font-medium">{e.pessoa?.nome}</span>
                        {e.pessoa?.funcao && <span className="text-muted-foreground"> · {e.pessoa.funcao}</span>}
                        {e.pessoa?.telefone && <span className="text-muted-foreground"> · {e.pessoa.telefone}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
