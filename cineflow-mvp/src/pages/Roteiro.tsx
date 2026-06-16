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
import {
  ChevronLeft, FileText, Sparkles, Upload, RefreshCw,
  MapPin, Users, Shirt, Drama, Sparkle, Music, Camera, AlertCircle,
  AlertTriangle, Printer,
} from "lucide-react";
import { extrairTextoDoArquivo, paginasEstimadas } from "@/lib/parseRoteiro";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

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

export default function Roteiro() {
  const { id: projetoId } = useParams<{ id: string }>();
  const { can } = usePermissions(projetoId);
  const canEditRoteiro = can('roteiro', 'editar');
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const [arquivoNome, setArquivoNome] = useState<string>("");
  const [arquivoTipo, setArquivoTipo] = useState<string>("");
  const [arquivoOriginal, setArquivoOriginal] = useState<File | null>(null);
  const [parsingArquivo, setParsingArquivo] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<string>("roteiro");
  const [pendingSave, setPendingSave] = useState<{ texto: string; nome?: string; tipo?: string } | null>(null);
  const [confirmSubst, setConfirmSubst] = useState(false);

  const { data: roteiro, isLoading } = useQuery({
    queryKey: ["roteiro", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roteiros")
        .select("*")
        .eq("projeto_id", projetoId!)
        .maybeSingle();
      if (error) throw error;
      return data as Roteiro | null;
    },
    refetchInterval: (q) => (q.state.data?.status === "analisando" ? 3000 : false),
  });

  const { data: cenas } = useQuery({
    queryKey: ["roteiro-cenas", roteiro?.id],
    enabled: !!roteiro?.id && roteiro.status === "decupado",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roteiro_cenas")
        .select("*")
        .eq("roteiro_id", roteiro!.id)
        .order("ordem");
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
      const { data, error } = await supabase
        .from("roteiro_planos_sugeridos")
        .select("*")
        .in("cena_id", cenaIds)
        .order("plano_numero");
      if (error) throw error;
      return (data ?? []) as Plano[];
    },
  });

  const salvar = useMutation({
    mutationFn: async (input: { texto: string; nome?: string; tipo?: string }) => {
      let arquivoPath: string | null = null;
      if (arquivoOriginal && projetoId) {
        const path = `roteiros/${projetoId}/${Date.now()}-${arquivoOriginal.name}`;
        const { error: upErr } = await supabase.storage
          .from("documentos")
          .upload(path, arquivoOriginal, { upsert: true });
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
        const { data, error } = await supabase
          .from("roteiros").update(payload).eq("id", roteiro.id).select("*").single();
        if (error) throw error;
        return data as Roteiro;
      }
      const { data, error } = await supabase
        .from("roteiros").insert(payload).select("*").single();
      if (error) throw error;
      return data as Roteiro;
    },
    onSuccess: () => {
      toast.success("Roteiro salvo");
      qc.invalidateQueries({ queryKey: ["roteiro", projetoId] });
      setTexto("");
      setArquivoNome("");
      setArquivoTipo("");
      setArquivoOriginal(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const decupar = useMutation({
    mutationFn: async () => {
      if (!roteiro?.id) throw new Error("Salve o roteiro antes");
      const { data, error } = await supabase.functions.invoke("analisar-roteiro", {
        body: { roteiro_id: roteiro.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
      return data;
    },
    onSuccess: async (res: any) => {
      toast.success(`Decupagem concluída: ${res?.cenas ?? 0} cenas, ${res?.planos ?? 0} planos`);
      qc.invalidateQueries({ queryKey: ["roteiro", projetoId] });
      qc.invalidateQueries({ queryKey: ["roteiro-cenas"] });
      qc.invalidateQueries({ queryKey: ["roteiro-planos"] });

      // F7 — upsert personagens detectados na tabela personagens
      if (roteiro?.id && projetoId) {
        const { data: cenasData } = await supabase
          .from("roteiro_cenas")
          .select("personagens")
          .eq("roteiro_id", roteiro.id);
        const nomes = Array.from(
          new Set(
            (cenasData ?? []).flatMap((c: any) =>
              Array.isArray(c.personagens) ? (c.personagens as string[]) : []
            )
          )
        ).filter(Boolean) as string[];
        if (nomes.length) {
          await supabase.from("personagens").upsert(
            nomes.map((nome) => ({ projeto_id: projetoId, nome })),
            { onConflict: "projeto_id,nome", ignoreDuplicates: true }
          );
          toast.success(`${nomes.length} personagens registados no Elenco`);
        }
      }

      setAbaAtiva("decupagem");
    },
    onError: (e: any) => toast.error("Falha na decupagem: " + e.message),
  });

  async function carregarArquivo(file: File) {
    setParsingArquivo(true);
    setArquivoOriginal(file);
    try {
      const { texto: t, formato } = await extrairTextoDoArquivo(file);
      setTexto(t);
      setArquivoNome(file.name);
      setArquivoTipo(formato);
      toast.success(`${file.name} processado (${paginasEstimadas(t)} pág.)`);
    } catch (e: any) {
      toast.error(e.message ?? String(e));
    } finally {
      setParsingArquivo(false);
    }
  }

  function handleSalvar(input: { texto: string; nome?: string; tipo?: string }) {
    if (roteiro) {
      setPendingSave(input);
      setConfirmSubst(true);
    } else {
      salvar.mutate(input);
    }
  }

  function confirmarSubstituicao() {
    if (pendingSave) {
      salvar.mutate(pendingSave);
      setPendingSave(null);
    }
    setConfirmSubst(false);
  }

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <Link
        to={`/projetos/${projetoId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
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
                    <Button
                      size="sm"
                      onClick={() => decupar.mutate()}
                      disabled={decupar.isPending || roteiro.status === "analisando"}
                    >
                      {roteiro.status === "decupado" ? (
                        <><RefreshCw className="h-4 w-4" /> Re-decupar</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Decupar com IA</>
                      )}
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

          {canEditRoteiro && <Card>
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
                  <Input
                    id="arq"
                    type="file"
                    accept=".pdf,.docx,.fdx,.txt,.md"
                    disabled={parsingArquivo || salvar.isPending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) carregarArquivo(f);
                    }}
                  />
                  {parsingArquivo && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Upload className="h-3.5 w-3.5 animate-pulse" /> Processando arquivo...
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="colar" className="space-y-2 pt-2">
                  <Label htmlFor="colar" className="text-xs">Cole o texto integral do roteiro</Label>
                  <Textarea
                    id="colar"
                    rows={8}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder={"CENA 1\nINT. SALA DE ESTAR - DIA\n\nMaria entra e..."}
                    className="font-mono text-xs"
                  />
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
                <Button
                  variant="outline"
                  onClick={() => { setTexto(""); setArquivoNome(""); setArquivoTipo(""); }}
                  disabled={!texto}
                >
                  Limpar
                </Button>
                <Button
                  onClick={() => handleSalvar({ texto, nome: arquivoNome || undefined, tipo: arquivoTipo || undefined })}
                  disabled={!texto || salvar.isPending}
                >
                  {salvar.isPending ? "Salvando..." : (roteiro ? "Substituir roteiro" : "Salvar roteiro")}
                </Button>
              </div>
            </CardContent>
          </Card>}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => decupar.mutate()}
                  disabled={decupar.isPending || roteiro.status === "analisando"}
                >
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
            <Empty
              icon={<Sparkles className="h-5 w-5" />}
              title="Nenhuma decupagem ainda"
              description="Vá à aba Roteiro e clique em Decupar com IA."
            />
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
                return <CenaCard key={c.id} cena={c} planos={planosCena} />;
              })}
            </div>
          ) : (
            <Empty
              icon={<FileText className="h-5 w-5" />}
              title="Decupagem vazia"
              description="A análise não retornou cenas. Tente re-decupar."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmação ao substituir roteiro */}
      <Dialog open={confirmSubst} onOpenChange={setConfirmSubst}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Substituir roteiro?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso vai substituir o roteiro atual e apagar a decupagem existente. Todas as cenas, planos e personagens associados serão removidos ao re-decupar.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmSubst(false); setPendingSave(null); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarSubstituicao} disabled={salvar.isPending}>
              {salvar.isPending ? "Substituindo..." : "Substituir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoteiroViewer({ roteiro }: { roteiro: Roteiro }) {
  const isPdf = !!(roteiro.arquivo_path?.toLowerCase().endsWith(".pdf"));

  const { data: signedUrl } = useQuery({
    queryKey: ["roteiro-signed-url", roteiro.arquivo_path],
    enabled: isPdf && !!roteiro.arquivo_path,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("documentos")
        .createSignedUrl(roteiro.arquivo_path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  if (isPdf) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Visualização do roteiro
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {signedUrl ? (
            <iframe
              src={signedUrl}
              className="w-full rounded-b-lg border-0"
              style={{ height: "70vh" }}
              title="Roteiro PDF"
            />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">Carregando visualização...</div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" /> Texto do roteiro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed overflow-auto max-h-[70vh]">
          {roteiro.texto}
        </pre>
      </CardContent>
    </Card>
  );
}

function CenaCard({ cena, planos }: { cena: Cena; planos: Plano[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Badge>{cena.numero_cena ?? cena.ordem}</Badge>
          <span className="font-semibold">{cena.cabecalho ?? "Sem cabeçalho"}</span>
          {cena.ambiente && <Badge variant="outline">{cena.ambiente}</Badge>}
          {cena.horario && <Badge variant="outline">{cena.horario}</Badge>}
          {cena.duracao_estimada_min && (
            <Badge variant="secondary">~{cena.duracao_estimada_min} min</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {cena.sinopse && <p className="text-sm">{cena.sinopse}</p>}
        {cena.locacao_sugerida && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Locação sugerida:{" "}
            <strong className="text-foreground">{cena.locacao_sugerida}</strong>
          </p>
        )}

        <Tabs defaultValue="personagens">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="personagens"><Users className="h-3.5 w-3.5" /> Personagens ({cena.personagens.length})</TabsTrigger>
            <TabsTrigger value="arte"><Drama className="h-3.5 w-3.5" /> Arte ({cena.arte.length})</TabsTrigger>
            <TabsTrigger value="figurino"><Shirt className="h-3.5 w-3.5" /> Figurino ({cena.figurino.length})</TabsTrigger>
            <TabsTrigger value="efeitos"><Sparkle className="h-3.5 w-3.5" /> Efeitos ({cena.efeitos.length})</TabsTrigger>
            <TabsTrigger value="som"><Music className="h-3.5 w-3.5" /> Som ({cena.som.length})</TabsTrigger>
            <TabsTrigger value="planos"><Camera className="h-3.5 w-3.5" /> Planos ({planos.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="personagens" className="pt-2">
            {cena.personagens.length ? (
              <div className="flex flex-wrap gap-1.5">
                {cena.personagens.map((p, i) => <Badge key={i} variant="outline">{p}</Badge>)}
              </div>
            ) : <p className="text-xs text-muted-foreground">Nenhum personagem identificado</p>}
          </TabsContent>
          <TabsContent value="arte" className="pt-2">
            {cena.arte.length ? (
              <ul className="space-y-0.5 text-sm">
                {cena.arte.map((a, i) => <li key={i}>· {a}</li>)}
              </ul>
            ) : <p className="text-xs text-muted-foreground">Nenhum objeto cênico identificado</p>}
          </TabsContent>
          <TabsContent value="figurino" className="pt-2">
            {cena.figurino.length ? (
              <ul className="space-y-0.5 text-sm">
                {cena.figurino.map((f, i) => {
                  const obj = typeof f === "string" ? { item: f } : f;
                  return (
                    <li key={i}>
                      · {obj.personagem ? <><strong>{obj.personagem}:</strong> </> : null}
                      {obj.item ?? "—"}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-xs text-muted-foreground">Nenhuma sugestão de figurino</p>}
          </TabsContent>
          <TabsContent value="efeitos" className="pt-2">
            {cena.efeitos.length ? (
              <ul className="space-y-0.5 text-sm">
                {cena.efeitos.map((e, i) => <li key={i}>· {e}</li>)}
              </ul>
            ) : <p className="text-xs text-muted-foreground">Nenhum efeito especial identificado</p>}
          </TabsContent>
          <TabsContent value="som" className="pt-2">
            {cena.som.length ? (
              <ul className="space-y-0.5 text-sm">
                {cena.som.map((s, i) => <li key={i}>· {s}</li>)}
              </ul>
            ) : <p className="text-xs text-muted-foreground">Nenhuma sugestão de sonoplastia</p>}
          </TabsContent>
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
            ) : <p className="text-xs text-muted-foreground">Nenhum plano sugerido</p>}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
