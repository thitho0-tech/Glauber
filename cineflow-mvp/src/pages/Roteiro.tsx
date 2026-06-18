import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft, FileText, Sparkles, Upload, RefreshCw,
  MapPin, Users, Shirt, Drama, Sparkle, Music, Camera, AlertCircle,
  AlertTriangle, Printer, Pencil, Check, X, Link2,
} from "lucide-react";
import { extrairTextoDoArquivo, paginasEstimadas } from "@/lib/parseRoteiro";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { useOrgs } from "@/hooks/useOrg";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

type Roteiro = {
  id: string;
  projeto_id: string;
  texto: string;
  arquivo_nome: string | null;
  arquivo_tipo: string | null;
  arquivo_path: string | null;
  paginas_estimadas: number | null;
  status: "cru" | "analisando" | "decupado" | "erro";
  mensagem_erro: string | null;
  modelo_ia: string | null;
  decupado_em: string | null;
  criado_em: string;
};

type Cena = {
  id: string;
  ordem: number;
  numero_cena: string | null;
  cabecalho: string | null;
  ambiente: string | null;
  local: string | null;
  horario: string | null;
  sinopse: string | null;
  personagens: string[];
  arte: string[];
  figurino: Array<{ personagem?: string; item?: string } | string>;
  efeitos: string[];
  som: string[];
  locacao_sugerida: string | null;
  duracao_estimada_min: number | null;
};

type Plano = {
  id: string;
  cena_id: string;
  plano_numero: number;
  tipo_plano: string | null;
  movimento: string | null;
  lente: string | null;
  equipamento: string | null;
  descricao: string | null;
  duracao_estimada_seg: number | null;
};

type PgEntry = { id: string; nome: string };
type ElencoEntry = { id: string; personagem_id: string | null; pessoa: { nome: string } };

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseList(text: string): string[] {
  return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

function parseFigurino(text: string): Array<{ personagem?: string; item?: string } | string> {
  return parseList(text).map((line) => {
    const ci = line.indexOf(": ");
    if (ci > 0) return { personagem: line.slice(0, ci), item: line.slice(ci + 2) };
    return line;
  });
}

function figItemText(f: { personagem?: string; item?: string } | string): string {
  if (typeof f === "string") return f;
  return f.personagem ? `${f.personagem}: ${f.item ?? ""}` : (f.item ?? "");
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Roteiro() {
  const { id: projetoId } = useParams<{ id: string }>();
  const { can } = usePermissions(projetoId);
  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const orgId = orgs?.[0]?.org.id ?? null;
  const canEditRoteiro = can("roteiro", "editar");
  const qc = useQueryClient();

  const [texto, setTexto] = useState("");
  const [arquivoNome, setArquivoNome] = useState<string>("");
  const [arquivoTipo, setArquivoTipo] = useState<string>("");
  const [arquivoOriginal, setArquivoOriginal] = useState<File | null>(null);
  const [parsingArquivo, setParsingArquivo] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<string>("roteiro");
  const [pendingSave, setPendingSave] = useState<{ texto: string; nome?: string; tipo?: string } | null>(null);
  const [confirmSubst, setConfirmSubst] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: roteiro, isLoading } = useQuery({
    queryKey: ["roteiro", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("roteiros").select("*").eq("projeto_id", projetoId!).maybeSingle();
      if (error) throw error;
      return data as Roteiro | null;
    },
    refetchInterval: (q) => (q.state.data?.status === "analisando" ? 3000 : false),
  });

  const { data: cenas } = useQuery({
    queryKey: ["roteiro-cenas", roteiro?.id],
    enabled: !!roteiro?.id && roteiro.status === "decupado",
    queryFn: async () => {
      const { data, error } = await supabase.from("roteiro_cenas").select("*").eq("roteiro_id", roteiro!.id).order("ordem");
      if (error) throw error;
      return (data ?? []) as Cena[];
    },
  });

  const { data: planos } = useQuery({
    queryKey: ["roteiro-planos", roteiro?.id],
    enabled: !!roteiro?.id && roteiro.status === "decupado" && (cenas?.length ?? 0) > 0,
    queryFn: async () => {
      const cenaIds = (cenas ?? []).map((c) => c.id);
      if (!cenaIds.length) return [] as Plano[];
      const { data, error } = await supabase.from("roteiro_planos_sugeridos").select("*").in("cena_id", cenaIds).order("plano_numero");
      if (error) throw error;
      return (data ?? []) as Plano[];
    },
  });

  const enabledLinks = !!projetoId && roteiro?.status === "decupado";

  const { data: arteVinculada = [] } = useQuery({
    queryKey: ["arte-vinculada", projetoId],
    enabled: enabledLinks,
    queryFn: async () => {
      const { data, error } = await supabase.from("arte_objetos").select("id, descricao, roteiro_cena_id").eq("projeto_id", projetoId!).not("roteiro_cena_id", "is", null);
      if (error) throw error;
      return (data ?? []) as { id: string; descricao: string; roteiro_cena_id: string }[];
    },
  });

  const { data: figVinculados = [] } = useQuery({
    queryKey: ["fig-vinculados", projetoId],
    enabled: enabledLinks,
    queryFn: async () => {
      const { data, error } = await supabase.from("figurinos").select("id, descricao, roteiro_cena_id").eq("projeto_id", projetoId!).not("roteiro_cena_id", "is", null);
      if (error) throw error;
      return (data ?? []) as { id: string; descricao: string; roteiro_cena_id: string }[];
    },
  });

  const { data: locVinculadas = [] } = useQuery({
    queryKey: ["loc-vinculadas", projetoId],
    enabled: enabledLinks,
    queryFn: async () => {
      const { data, error } = await supabase.from("locacoes").select("id, nome, roteiro_cena_id").eq("projeto_id", projetoId!).eq("etapa", "proposta").not("roteiro_cena_id", "is", null);
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string; roteiro_cena_id: string }[];
    },
  });

  const { data: personagensProj = [] } = useQuery({
    queryKey: ["personagens", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("personagens").select("id, nome").eq("projeto_id", projetoId!).order("nome");
      if (error) throw error;
      return (data ?? []) as PgEntry[];
    },
  });

  const { data: elencoPessoas = [] } = useQuery({
    queryKey: ["elenco-pp", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("projeto_pessoas").select("id, personagem_id, pessoa:pessoas(nome)").eq("projeto_id", projetoId!);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        personagem_id: r.personagem_id,
        pessoa: { nome: r.pessoa?.nome ?? "—" },
      })) as ElencoEntry[];
    },
  });

  function invalidateLinkData() {
    qc.invalidateQueries({ queryKey: ["arte-vinculada", projetoId] });
    qc.invalidateQueries({ queryKey: ["fig-vinculados", projetoId] });
    qc.invalidateQueries({ queryKey: ["loc-vinculadas", projetoId] });
    qc.invalidateQueries({ queryKey: ["elenco-pp", projetoId] });
    qc.invalidateQueries({ queryKey: ["roteiro-cenas", roteiro?.id] });
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  const salvar = useMutation({
    mutationFn: async (input: { texto: string; nome?: string; tipo?: string }) => {
      let arquivoPath: string | null = null;
      if (arquivoOriginal && projetoId) {
        const path = `roteiros/${projetoId}/${Date.now()}-${arquivoOriginal.name}`;
        const { error: upErr } = await supabase.storage.from("documentos").upload(path, arquivoOriginal, { upsert: true });
        if (!upErr) arquivoPath = path;
      }
      const payload: any = {
        projeto_id: projetoId!,
        texto: input.texto,
        arquivo_nome: input.nome ?? null,
        arquivo_tipo: input.tipo ?? null,
        arquivo_path: arquivoPath,
        paginas_estimadas: paginasEstimadas(input.texto),
        status: "cru",
        mensagem_erro: null,
      };
      if (roteiro?.id) {
        const { data, error } = await supabase.from("roteiros").update(payload).eq("id", roteiro.id).select("*").single();
        if (error) throw error;
        return data as Roteiro;
      }
      const { data, error } = await supabase.from("roteiros").insert(payload).select("*").single();
      if (error) throw error;
      return data as Roteiro;
    },
    onSuccess: () => {
      toast.success("Roteiro salvo");
      qc.invalidateQueries({ queryKey: ["roteiro", projetoId] });
      setTexto(""); setArquivoNome(""); setArquivoTipo(""); setArquivoOriginal(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const decupar = useMutation({
    mutationFn: async () => {
      if (!roteiro?.id) throw new Error("Salve o roteiro antes");
      const { data, error } = await supabase.functions.invoke("analisar-roteiro", { body: { roteiro_id: roteiro.id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
      return data;
    },
    onSuccess: async (res: any) => {
      toast.success(`Decupagem concluída: ${res?.cenas ?? 0} cenas, ${res?.planos ?? 0} planos`);
      qc.invalidateQueries({ queryKey: ["roteiro", projetoId] });
      qc.invalidateQueries({ queryKey: ["roteiro-cenas"] });
      qc.invalidateQueries({ queryKey: ["roteiro-planos"] });
      if (roteiro?.id && projetoId) {
        const { data: cenasData } = await supabase.from("roteiro_cenas").select("personagens").eq("roteiro_id", roteiro.id);
        const nomes = Array.from(new Set((cenasData ?? []).flatMap((c: any) => Array.isArray(c.personagens) ? (c.personagens as string[]) : []))).filter(Boolean) as string[];
        if (nomes.length) {
          await supabase.from("personagens").upsert(nomes.map((nome) => ({ projeto_id: projetoId, nome })), { onConflict: "projeto_id,nome", ignoreDuplicates: true });
          toast.success(`${nomes.length} personagens registados no Elenco`);
        }
      }
      setAbaAtiva("decupagem");
    },
    onError: (e: any) => toast.error("Falha na decupagem: " + e.message),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function carregarArquivo(file: File) {
    setParsingArquivo(true);
    setArquivoOriginal(file);
    try {
      const { texto: t, formato } = await extrairTextoDoArquivo(file);
      setTexto(t); setArquivoNome(file.name); setArquivoTipo(formato);
      toast.success(`${file.name} processado (${paginasEstimadas(t)} pág.)`);
    } catch (e: any) {
      toast.error(e.message ?? String(e));
    } finally {
      setParsingArquivo(false);
    }
  }

  function handleSalvar(input: { texto: string; nome?: string; tipo?: string }) {
    if (roteiro) { setPendingSave(input); setConfirmSubst(true); }
    else { salvar.mutate(input); }
  }

  function confirmarSubstituicao() {
    if (pendingSave) { salvar.mutate(pendingSave); setPendingSave(null); }
    setConfirmSubst(false);
  }

  if (isLoading) return <Loading />;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Projeto
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Roteiro &amp; Decupagem</h1>
        <p className="text-sm text-muted-foreground">
          Suba o roteiro e gere análise técnica completa (cenas, personagens, arte, figurino, efeitos e planos sugeridos).
        </p>
      </div>

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <TabsList className="no-print">
          <TabsTrigger value="roteiro">Roteiro</TabsTrigger>
          <TabsTrigger value="decupagem">
            Decupagem {cenas && cenas.length > 0 ? `(${cenas.length})` : ""}
          </TabsTrigger>
        </TabsList>

        {/* ── ABA ROTEIRO ─────────────────────────────────────── */}
        <TabsContent value="roteiro" className="space-y-4">
          {roteiro ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Roteiro atual
                    {roteiro.status === "decupado" && <Badge variant="secondary">decupado</Badge>}
                    {roteiro.status === "analisando" && <Badge>analisando...</Badge>}
                    {roteiro.status === "cru" && <Badge variant="outline">não analisado</Badge>}
                    {roteiro.status === "erro" && <Badge variant="destructive">erro</Badge>}
                  </span>
                  {canEditRoteiro && (
                    <Button size="sm" onClick={() => decupar.mutate()} disabled={decupar.isPending || roteiro.status === "analisando"}>
                      {roteiro.status === "decupado"
                        ? <><RefreshCw className="h-4 w-4" /> Re-decupar</>
                        : <><Sparkles className="h-4 w-4" /> Decupar com IA</>}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Arquivo:</span>{" "}
                  {roteiro.arquivo_nome ? <strong>{roteiro.arquivo_nome}</strong> : <em>colado direto</em>}
                  {roteiro.arquivo_tipo && <Badge variant="outline" className="ml-2">{roteiro.arquivo_tipo}</Badge>}
                </p>
                <p>
                  <span className="text-muted-foreground">Tamanho:</span>{" "}
                  <strong>{(roteiro.texto?.length ?? 0).toLocaleString("pt-BR")} caracteres</strong>
                  {" · "}
                  <strong>~{roteiro.paginas_estimadas ?? 0} páginas</strong>
                </p>
                {roteiro.mensagem_erro && (
                  <p className="flex items-start gap-1 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    {roteiro.mensagem_erro}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Empty
              icon={<FileText className="h-5 w-5" />}
              title="Nenhum roteiro ainda"
              description="Faça upload (PDF, DOCX, FDX) ou cole o roteiro abaixo. Depois clique em Decupar com IA pra análise técnica completa."
            />
          )}

          {roteiro && <RoteiroViewer roteiro={roteiro} />}

          {canEditRoteiro && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{roteiro ? "Substituir roteiro" : "Inserir roteiro"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Tabs defaultValue="arquivo">
                  <TabsList>
                    <TabsTrigger value="arquivo">Arquivo</TabsTrigger>
                    <TabsTrigger value="colar">Colar texto</TabsTrigger>
                  </TabsList>
                  <TabsContent value="arquivo" className="space-y-2 pt-2">
                    <Label htmlFor="arq" className="text-xs">
                      Aceita .pdf, .docx, .fdx, .txt — .doc precisa ser exportado como .docx antes
                    </Label>
                    <Input id="arq" type="file" accept=".pdf,.docx,.fdx,.txt,.md"
                      disabled={parsingArquivo || salvar.isPending}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) carregarArquivo(f); }} />
                    {parsingArquivo && (
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Upload className="h-3.5 w-3.5 animate-pulse" /> Processando arquivo...
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="colar" className="space-y-2 pt-2">
                    <Label htmlFor="colar" className="text-xs">Cole o texto integral do roteiro</Label>
                    <Textarea id="colar" rows={8} value={texto} onChange={(e) => setTexto(e.target.value)}
                      placeholder={"CENA 1\nINT. SALA DE ESTAR - DIA\n\nMaria entra e..."}
                      className="font-mono text-xs" />
                  </TabsContent>
                </Tabs>
                {texto && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      Preview: {texto.length.toLocaleString("pt-BR")} caracteres
                      {arquivoNome && <> · de <strong>{arquivoNome}</strong> ({arquivoTipo})</>}
                    </p>
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                      {texto.slice(0, 600)}{texto.length > 600 ? "..." : ""}
                    </pre>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setTexto(""); setArquivoNome(""); setArquivoTipo(""); }} disabled={!texto}>
                    Limpar
                  </Button>
                  <Button onClick={() => handleSalvar({ texto, nome: arquivoNome || undefined, tipo: arquivoTipo || undefined })}
                    disabled={!texto || salvar.isPending}>
                    {salvar.isPending ? "Salvando..." : (roteiro ? "Substituir roteiro" : "Salvar roteiro")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── ABA DECUPAGEM ───────────────────────────────────── */}
        <TabsContent value="decupagem" className="space-y-4">
          <div className="flex items-center justify-between no-print">
            <p className="text-sm text-muted-foreground">
              {roteiro?.decupado_em
                ? `Decupado em ${new Date(roteiro.decupado_em).toLocaleString("pt-BR")} · modelo: ${roteiro.modelo_ia ?? "—"}`
                : "Rode a decupagem para ver a análise de cenas."}
            </p>
            <div className="flex gap-2">
              {canEditRoteiro && roteiro?.id && (
                <Button variant="outline" size="sm" onClick={() => decupar.mutate()}
                  disabled={decupar.isPending || roteiro.status === "analisando"}>
                  <RefreshCw className="h-4 w-4" /> Re-decupar
                </Button>
              )}
              {cenas && cenas.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Exportar PDF
                </Button>
              )}
            </div>
          </div>

          {!roteiro || roteiro.status === "cru" ? (
            <Empty icon={<Sparkles className="h-5 w-5" />} title="Nenhuma decupagem ainda"
              description="Vá à aba Roteiro e clique em Decupar com IA." />
          ) : roteiro.status === "analisando" ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />
                Analisando roteiro com IA... aguarde.
              </CardContent>
            </Card>
          ) : roteiro.status === "erro" ? (
            <Card>
              <CardContent className="py-6">
                <p className="flex items-start gap-1 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {roteiro.mensagem_erro ?? "Erro desconhecido na decupagem."}
                </p>
              </CardContent>
            </Card>
          ) : cenas && cenas.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{cenas.length} cenas analisadas</h2>
              {cenas.map((c) => {
                const planosCena = (planos ?? []).filter((p) => p.cena_id === c.id);
                return (
                  <CenaCard
                    key={c.id}
                    cena={c}
                    planos={planosCena}
                    projetoId={projetoId!}
                    orgId={orgId}
                    canEditRoteiro={canEditRoteiro}
                    canEditFigurinoArte={can("figurino_arte", "editar")}
                    canEditLocacao={can("locacoes", "editar")}
                    canEditElenco={can("elenco", "editar")}
                    arteVinculada={arteVinculada}
                    figVinculados={figVinculados}
                    locVinculadas={locVinculadas}
                    personagensProj={personagensProj}
                    elencoPessoas={elencoPessoas}
                    onDataChanged={invalidateLinkData}
                  />
                );
              })}
            </div>
          ) : (
            <Empty icon={<FileText className="h-5 w-5" />} title="Decupagem vazia"
              description="A análise não retornou cenas. Tente re-decupar." />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={confirmSubst} onOpenChange={setConfirmSubst}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Substituir roteiro?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso vai substituir o roteiro atual e apagar a decupagem existente. Todas as cenas, planos e personagens associados serão removidos ao re-decupar.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmSubst(false); setPendingSave(null); }}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarSubstituicao} disabled={salvar.isPending}>
              {salvar.isPending ? "Substituindo..." : "Substituir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── RoteiroViewer ─────────────────────────────────────────────────────────────

function RoteiroViewer({ roteiro }: { roteiro: Roteiro }) {
  const isPdf = !!(roteiro.arquivo_path?.toLowerCase().endsWith(".pdf"));
  const { data: signedUrl } = useQuery({
    queryKey: ["roteiro-signed-url", roteiro.arquivo_path],
    enabled: isPdf && !!roteiro.arquivo_path,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("documentos").createSignedUrl(roteiro.arquivo_path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (isPdf) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Visualização do roteiro</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {signedUrl
            ? <iframe src={signedUrl} className="w-full rounded-b-lg border-0" style={{ height: "70vh" }} title="Roteiro PDF" />
            : <div className="p-4 text-sm text-muted-foreground">Carregando visualização...</div>}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Texto do roteiro</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed overflow-auto max-h-[70vh]">{roteiro.texto}</pre>
      </CardContent>
    </Card>
  );
}

// ── CenaCard ──────────────────────────────────────────────────────────────────

interface CenaCardProps {
  cena: Cena;
  planos: Plano[];
  projetoId: string;
  orgId: string | null;
  canEditRoteiro: boolean;
  canEditFigurinoArte: boolean;
  canEditLocacao: boolean;
  canEditElenco: boolean;
  arteVinculada: { id: string; descricao: string; roteiro_cena_id: string }[];
  figVinculados: { id: string; descricao: string; roteiro_cena_id: string }[];
  locVinculadas: { id: string; nome: string; roteiro_cena_id: string }[];
  personagensProj: PgEntry[];
  elencoPessoas: ElencoEntry[];
  onDataChanged: () => void;
}

function CenaCard({
  cena, planos, projetoId, orgId,
  canEditRoteiro, canEditFigurinoArte, canEditLocacao, canEditElenco,
  arteVinculada, figVinculados, locVinculadas, personagensProj, elencoPessoas,
  onDataChanged,
}: CenaCardProps) {
  const qc = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(() => ({
    cabecalho: cena.cabecalho ?? "",
    ambiente: cena.ambiente ?? "",
    horario: cena.horario ?? "",
    sinopse: cena.sinopse ?? "",
    locacao_sugerida: cena.locacao_sugerida ?? "",
    personagensText: cena.personagens.join("\n"),
    arteText: cena.arte.join("\n"),
    figurinoText: cena.figurino.map(figItemText).join("\n"),
    efeitosText: cena.efeitos.join("\n"),
    somText: cena.som.join("\n"),
  }));

  const [escalandoPg, setEscalandoPg] = useState<PgEntry | null>(null);
  const [selectedPpId, setSelectedPpId] = useState("");

  // ── Mutations ──────────────────────────────────────────────────────────────

  const saveCena = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("roteiro_cenas").update({
        cabecalho: editData.cabecalho || null,
        ambiente: editData.ambiente || null,
        horario: editData.horario || null,
        sinopse: editData.sinopse || null,
        locacao_sugerida: editData.locacao_sugerida || null,
        personagens: parseList(editData.personagensText),
        arte: parseList(editData.arteText),
        figurino: parseFigurino(editData.figurinoText),
        efeitos: parseList(editData.efeitosText),
        som: parseList(editData.somText),
      }).eq("id", cena.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cena salva");
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["roteiro-cenas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addArteObj = useMutation({
    mutationFn: async (item: string) => {
      const { error } = await supabase.from("arte_objetos").insert({
        projeto_id: projetoId,
        descricao: item,
        fonte: "compra",
        roteiro_cena_id: cena.id,
        status: "sugestao",
        aprovacao_status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Adicionado como Objeto de Arte"); onDataChanged(); },
    onError: (e: any) => toast.error(e.message),
  });

  const addFig = useMutation({
    mutationFn: async ({ item, pgNome }: { item: string; pgNome?: string }) => {
      const pgEntry = pgNome ? personagensProj.find((p) => p.nome === pgNome) : null;
      const { error } = await supabase.from("figurinos").insert({
        projeto_id: projetoId,
        descricao: item,
        fonte: "compra",
        roteiro_cena_id: cena.id,
        status: "sugestao",
        aprovacao_status: "pendente",
        ...(pgEntry ? { personagem_id: pgEntry.id } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Adicionado como Figurino"); onDataChanged(); },
    onError: (e: any) => toast.error(e.message),
  });

  const addLoc = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("locacoes").insert({
        org_id: orgId,
        projeto_id: projetoId,
        nome,
        etapa: "proposta",
        aprovacao_status: "em_analise",
        roteiro_cena_id: cena.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Locação adicionada ao Scouting"); onDataChanged(); },
    onError: (e: any) => toast.error(e.message),
  });

  const escalarPp = useMutation({
    mutationFn: async () => {
      if (!escalandoPg || !selectedPpId) return;
      const { error } = await supabase.from("projeto_pessoas").update({ personagem_id: escalandoPg.id }).eq("id", selectedPpId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ator escalado"); setEscalandoPg(null); onDataChanged(); },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isArteLinked = (item: string) => arteVinculada.some((a) => a.roteiro_cena_id === cena.id && a.descricao === item);
  const isFigLinked = (item: string) => figVinculados.some((f) => f.roteiro_cena_id === cena.id && f.descricao === item);
  const isLocLinked = locVinculadas.some((l) => l.roteiro_cena_id === cena.id && l.nome === cena.locacao_sugerida);

  function getEscalado(pgNome: string): ElencoEntry | null {
    const pg = personagensProj.find((p) => p.nome === pgNome);
    if (!pg) return null;
    return elencoPessoas.find((pp) => pp.personagem_id === pg.id) ?? null;
  }

  function startEdit() {
    setEditData({
      cabecalho: cena.cabecalho ?? "",
      ambiente: cena.ambiente ?? "",
      horario: cena.horario ?? "",
      sinopse: cena.sinopse ?? "",
      locacao_sugerida: cena.locacao_sugerida ?? "",
      personagensText: cena.personagens.join("\n"),
      arteText: cena.arte.join("\n"),
      figurinoText: cena.figurino.map(figItemText).join("\n"),
      efeitosText: cena.efeitos.join("\n"),
      somText: cena.som.join("\n"),
    });
    setIsEditing(true);
  }

  const figureLink = `/projetos/${projetoId}/figurino-arte`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge>{cena.numero_cena ?? cena.ordem}</Badge>
                <Input className="h-7 text-sm flex-1 min-w-[180px]" value={editData.cabecalho}
                  onChange={(e) => setEditData({ ...editData, cabecalho: e.target.value })} placeholder="Cabeçalho..." />
                <Input className="h-7 text-sm w-24" value={editData.ambiente}
                  onChange={(e) => setEditData({ ...editData, ambiente: e.target.value })} placeholder="INT/EXT" />
                <Input className="h-7 text-sm w-24" value={editData.horario}
                  onChange={(e) => setEditData({ ...editData, horario: e.target.value })} placeholder="DIA/NOITE" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveCena.mutate()} disabled={saveCena.isPending}>
                  <Check className="h-3.5 w-3.5 mr-1" /> {saveCena.isPending ? "Salvando..." : "Salvar"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{cena.numero_cena ?? cena.ordem}</Badge>
              <span className="font-semibold">{cena.cabecalho ?? "Sem cabeçalho"}</span>
              {cena.ambiente && <Badge variant="outline">{cena.ambiente}</Badge>}
              {cena.horario && <Badge variant="outline">{cena.horario}</Badge>}
              {cena.duracao_estimada_min && <Badge variant="secondary">~{cena.duracao_estimada_min} min</Badge>}
              {canEditRoteiro && (
                <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={startEdit} title="Editar cena">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Sinopse */}
        {isEditing ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sinopse</Label>
            <Textarea rows={3} value={editData.sinopse} className="text-sm"
              onChange={(e) => setEditData({ ...editData, sinopse: e.target.value })} placeholder="Sinopse da cena..." />
          </div>
        ) : cena.sinopse ? (
          <p className="text-sm">{cena.sinopse}</p>
        ) : null}

        {/* Locação sugerida */}
        {isEditing ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Locação sugerida</Label>
            <Input className="h-8 text-sm" value={editData.locacao_sugerida}
              onChange={(e) => setEditData({ ...editData, locacao_sugerida: e.target.value })} placeholder="Nome da locação..." />
          </div>
        ) : cena.locacao_sugerida ? (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Locação sugerida:{" "}
              <strong className="text-foreground">{cena.locacao_sugerida}</strong>
            </p>
            {canEditLocacao && (
              isLocLinked ? (
                <Link to={figureLink} className="flex items-center gap-1 text-xs text-emerald-600">
                  <Link2 className="h-3 w-3" /> Vinculada ao Scouting
                </Link>
              ) : (
                <Button size="sm" variant="outline" className="h-6 text-xs"
                  onClick={() => addLoc.mutate(cena.locacao_sugerida!)}
                  disabled={addLoc.isPending || !orgId}>
                  + Scouting
                </Button>
              )
            )}
          </div>
        ) : null}

        {/* Tabs de departamento */}
        <Tabs defaultValue="personagens">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="personagens">
              <Users className="h-3.5 w-3.5" /> Personagens ({isEditing ? parseList(editData.personagensText).length : cena.personagens.length})
            </TabsTrigger>
            <TabsTrigger value="arte">
              <Drama className="h-3.5 w-3.5" /> Arte ({isEditing ? parseList(editData.arteText).length : cena.arte.length})
            </TabsTrigger>
            <TabsTrigger value="figurino">
              <Shirt className="h-3.5 w-3.5" /> Figurino ({isEditing ? parseList(editData.figurinoText).length : cena.figurino.length})
            </TabsTrigger>
            <TabsTrigger value="efeitos">
              <Sparkle className="h-3.5 w-3.5" /> Efeitos ({isEditing ? parseList(editData.efeitosText).length : cena.efeitos.length})
            </TabsTrigger>
            <TabsTrigger value="som">
              <Music className="h-3.5 w-3.5" /> Som ({isEditing ? parseList(editData.somText).length : cena.som.length})
            </TabsTrigger>
            <TabsTrigger value="planos">
              <Camera className="h-3.5 w-3.5" /> Planos ({planos.length})
            </TabsTrigger>
          </TabsList>

          {/* Personagens */}
          <TabsContent value="personagens" className="pt-2">
            {isEditing ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Um personagem por linha</Label>
                <Textarea rows={4} value={editData.personagensText} className="text-sm font-mono"
                  onChange={(e) => setEditData({ ...editData, personagensText: e.target.value })} />
              </div>
            ) : cena.personagens.length ? (
              <div className="flex flex-wrap gap-2">
                {cena.personagens.map((p, i) => {
                  const escalado = getEscalado(p);
                  const pgEntry = personagensProj.find((pg) => pg.nome === p);
                  return (
                    <div key={i} className="flex items-center gap-1">
                      <Badge variant="outline">{p}</Badge>
                      {escalado ? (
                        <span className="text-xs text-emerald-600 font-medium">{escalado.pessoa.nome}</span>
                      ) : canEditElenco && pgEntry ? (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-muted-foreground"
                          onClick={() => { setEscalandoPg(pgEntry); setSelectedPpId(""); }}>
                          Escalar
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum personagem identificado</p>
            )}
          </TabsContent>

          {/* Arte */}
          <TabsContent value="arte" className="pt-2">
            {isEditing ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Um item por linha</Label>
                <Textarea rows={4} value={editData.arteText} className="text-sm font-mono"
                  onChange={(e) => setEditData({ ...editData, arteText: e.target.value })} />
              </div>
            ) : cena.arte.length ? (
              <ul className="space-y-1.5">
                {cena.arte.map((a, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-sm flex-1">· {a}</span>
                    {canEditFigurinoArte && (
                      isArteLinked(a) ? (
                        <Link to={figureLink} className="flex items-center gap-1 text-xs text-emerald-600 shrink-0">
                          <Link2 className="h-3 w-3" /> Vinculado
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" className="h-6 text-xs shrink-0"
                          onClick={() => addArteObj.mutate(a)} disabled={addArteObj.isPending}>
                          + Arte
                        </Button>
                      )
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum objeto cênico identificado</p>
            )}
          </TabsContent>

          {/* Figurino */}
          <TabsContent value="figurino" className="pt-2">
            {isEditing ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Um item por linha. Com personagem: "Nome: item"</Label>
                <Textarea rows={4} value={editData.figurinoText} className="text-sm font-mono"
                  onChange={(e) => setEditData({ ...editData, figurinoText: e.target.value })} />
              </div>
            ) : cena.figurino.length ? (
              <ul className="space-y-1.5">
                {cena.figurino.map((f, i) => {
                  const obj = typeof f === "string" ? { item: f } : f;
                  const itemText = obj.item ?? "—";
                  const linked = isFigLinked(itemText);
                  return (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-sm flex-1">
                        · {obj.personagem ? <><strong>{obj.personagem}:</strong> </> : null}{itemText}
                      </span>
                      {canEditFigurinoArte && (
                        linked ? (
                          <Link to={figureLink} className="flex items-center gap-1 text-xs text-emerald-600 shrink-0">
                            <Link2 className="h-3 w-3" /> Vinculado
                          </Link>
                        ) : (
                          <Button size="sm" variant="outline" className="h-6 text-xs shrink-0"
                            onClick={() => addFig.mutate({ item: itemText, pgNome: obj.personagem })}
                            disabled={addFig.isPending}>
                            + Figurino
                          </Button>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma sugestão de figurino</p>
            )}
          </TabsContent>

          {/* Efeitos */}
          <TabsContent value="efeitos" className="pt-2">
            {isEditing ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Um item por linha</Label>
                <Textarea rows={3} value={editData.efeitosText} className="text-sm font-mono"
                  onChange={(e) => setEditData({ ...editData, efeitosText: e.target.value })} />
              </div>
            ) : cena.efeitos.length ? (
              <ul className="space-y-0.5 text-sm">
                {cena.efeitos.map((e, i) => <li key={i}>· {e}</li>)}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum efeito especial identificado</p>
            )}
          </TabsContent>

          {/* Som */}
          <TabsContent value="som" className="pt-2">
            {isEditing ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Um item por linha</Label>
                <Textarea rows={3} value={editData.somText} className="text-sm font-mono"
                  onChange={(e) => setEditData({ ...editData, somText: e.target.value })} />
              </div>
            ) : cena.som.length ? (
              <ul className="space-y-0.5 text-sm">
                {cena.som.map((s, i) => <li key={i}>· {s}</li>)}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma sugestão de sonoplastia</p>
            )}
          </TabsContent>

          {/* Planos */}
          <TabsContent value="planos" className="pt-2">
            {planos.length ? (
              <div className="space-y-2">
                {planos.map((p) => (
                  <div key={p.id} className="rounded-md border bg-muted/30 p-2 text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge>P{p.plano_numero}</Badge>
                      {p.tipo_plano && <Badge variant="outline">{p.tipo_plano}</Badge>}
                      {p.movimento && <Badge variant="outline">{p.movimento}</Badge>}
                      {p.lente && <Badge variant="outline">{p.lente}</Badge>}
                      {p.equipamento && <Badge variant="outline">{p.equipamento}</Badge>}
                      {p.duracao_estimada_seg && <Badge variant="secondary">{p.duracao_estimada_seg}s</Badge>}
                    </div>
                    {p.descricao && <p className="mt-1 text-xs text-muted-foreground">{p.descricao}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum plano sugerido</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog: Escalar personagem */}
      <Dialog open={!!escalandoPg} onOpenChange={(o) => { if (!o) setEscalandoPg(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Escalar: {escalandoPg?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Selecionar ator da equipe</Label>
              {elencoPessoas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum membro de equipe cadastrado.</p>
              ) : (
                <Select value={selectedPpId} onValueChange={setSelectedPpId}>
                  <SelectTrigger><SelectValue placeholder="Escolher ator..." /></SelectTrigger>
                  <SelectContent>
                    {elencoPessoas.map((pp) => (
                      <SelectItem key={pp.id} value={pp.id}>
                        {pp.pessoa.nome}{pp.personagem_id ? " (já escalado)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalandoPg(null)}>Cancelar</Button>
            <Button onClick={() => escalarPp.mutate()} disabled={!selectedPpId || escalarPp.isPending}>
              {escalarPp.isPending ? "Escalando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
