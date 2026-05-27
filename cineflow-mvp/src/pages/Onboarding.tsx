import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { ChevronLeft, Plus, FileCheck, Trash2, AlertCircle, UserPlus, FolderKanban, ScanText, RefreshCcw, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useOrgs } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";

type Pessoa = { id: string; nome: string; email: string | null };
type DadosOcr = {
  status?: string;
  iniciado_em?: string;
  extraido_em?: string;
  modelo?: string;
  paginas?: number;
  markdown?: string;
  tipo_documento?: string | null;
  usage?: any;
} | null;
type Doc = {
  id: string;
  pessoa_id: string;
  tipo: string;
  arquivo_url: string | null;
  status: string;
  dados_ocr: DadosOcr;
  criado_em: string;
};

const TIPOS = [
  { value: "rg", label: "RG" },
  { value: "cpf", label: "CPF" },
  { value: "comp_endereco", label: "Comprovante de endereço" },
  { value: "contrato", label: "Contrato assinado" },
  { value: "foto", label: "Foto" },
  { value: "outro", label: "Outro" },
];

const STATUS = ["pendente", "recebido", "validado", "rejeitado"];

function DocCard({
  doc,
  onSetStatus,
  onDelete,
  onExtract,
  isExtracting,
}: {
  doc: Doc;
  onSetStatus: (s: string) => void;
  onDelete: () => void;
  onExtract: () => void;
  isExtracting: boolean;
}) {
  const [expand, setExpand] = useState(false);
  const dados = doc.dados_ocr;
  const temMarkdown = !!dados?.markdown;
  const processando = dados?.status === "processando";

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <Badge variant="outline">{TIPOS.find((t) => t.value === doc.tipo)?.label ?? doc.tipo}</Badge>
          {doc.arquivo_url && (
            <a href={doc.arquivo_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
              abrir arquivo
            </a>
          )}
          {temMarkdown && <Badge variant="secondary" className="text-[10px]">OCR: {dados?.paginas ?? 0} pg</Badge>}
          {processando && <Badge variant="secondary" className="text-[10px]">processando...</Badge>}
        </div>
        <div className="flex items-center gap-1">
          {doc.arquivo_url && (
            <Button size="sm" variant="ghost" onClick={onExtract} disabled={isExtracting || processando} title={temMarkdown ? "Re-extrair" : "Extrair texto"}>
              {temMarkdown ? <RefreshCcw className="h-4 w-4" /> : <ScanText className="h-4 w-4" />}
              <span className="ml-1 hidden text-xs sm:inline">{temMarkdown ? "Re-extrair" : "Extrair"}</span>
            </Button>
          )}
          <select
            value={doc.status}
            onChange={(e) => onSetStatus(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-xs"
          >
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      {temMarkdown && (
        <div className="mt-2">
          <button onClick={() => setExpand(!expand)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            {expand ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {expand ? "Ocultar" : "Ver"} texto extraído
            {dados?.extraido_em && ` · ${new Date(dados.extraido_em).toLocaleString("pt-BR")}`}
          </button>
          {expand && (
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs">{dados?.markdown}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function Onboarding() {
  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const orgId = orgs?.[0]?.org.id;
  const qc = useQueryClient();
  const [pessoaSel, setPessoaSel] = useState<string>("");
  const [openNovo, setOpenNovo] = useState(false);
  const [novo, setNovo] = useState<Partial<Doc>>({ tipo: "rg", status: "pendente" });

  const { data: pessoas, isLoading: lp } = useQuery({
    queryKey: ["pessoas-org-min", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pessoas")
        .select("id, nome, email")
        .eq("org_id", orgId!)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Pessoa[];
    },
  });

  const { data: docs } = useQuery({
    queryKey: ["docs-pessoa", pessoaSel],
    enabled: !!pessoaSel,
    refetchInterval: (q) => {
      const data = q.state.data as Doc[] | undefined;
      const algumProcessando = data?.some((d) => d.dados_ocr?.status === "processando");
      return algumProcessando ? 3000 : false;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_pessoa")
        .select("id, pessoa_id, tipo, arquivo_url, status, dados_ocr, criado_em")
        .eq("pessoa_id", pessoaSel)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Doc[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!pessoaSel || !orgId) throw new Error("Selecione uma pessoa");
      if (!novo.tipo) throw new Error("Tipo obrigatório");
      const { error } = await supabase.from("documentos_pessoa").insert({
        pessoa_id: pessoaSel,
        org_id: orgId,
        tipo: novo.tipo,
        arquivo_url: novo.arquivo_url || null,
        status: novo.status || "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento adicionado");
      setOpenNovo(false);
      setNovo({ tipo: "rg", status: "pendente" });
      qc.invalidateQueries({ queryKey: ["docs-pessoa", pessoaSel] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("documentos_pessoa").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["docs-pessoa", pessoaSel] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documentos_pessoa").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["docs-pessoa", pessoaSel] }),
  });

  const extrairOcr = useMutation({
    mutationFn: async (documentoId: string) => {
      const { error } = await supabase.rpc("extrair_ocr_documento", { p_documento_id: documentoId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("OCR enfileirado — em alguns segundos o texto aparece");
      qc.invalidateQueries({ queryKey: ["docs-pessoa", pessoaSel] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (lp) return <Loading />;

  const semPessoas = !pessoas || pessoas.length === 0;

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FileCheck className="h-6 w-6" /> Onboarding & Documentos
        </h1>
        <p className="text-sm text-muted-foreground">Documentos das pessoas cadastradas na produtora.</p>
      </div>

      {semPessoas ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">Nenhuma pessoa cadastrada ainda</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Cadastre pessoas dentro da <strong>Equipe</strong> de algum projeto. Elas vão
                aparecer aqui automaticamente para você gerenciar documentos (RG, CPF, contratos…).
              </p>
            </div>
            <Link to="/projetos">
              <Button><FolderKanban className="h-4 w-4" /> Ir para Projetos</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label>Selecione a pessoa</Label>
            <select
              value={pessoaSel}
              onChange={(e) => setPessoaSel(e.target.value)}
              className="h-10 w-full max-w-md rounded-md border bg-background px-3 text-sm"
            >
              <option value="">— escolher entre {pessoas.length} pessoa(s) —</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} {p.email ? `· ${p.email}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-md border bg-emerald-50 p-3 text-sm dark:bg-emerald-950/30">
            <div className="flex items-start gap-2">
              <ScanText className="mt-0.5 h-4 w-4 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-900 dark:text-emerald-200">OCR automático disponível</p>
                <p className="text-emerald-800 dark:text-emerald-300">
                  Cole o link do PDF ou imagem (Drive público, Dropbox, etc) e clique em <strong>Extrair</strong>.
                  O texto do documento é extraído automaticamente em poucos segundos.
                </p>
              </div>
            </div>
          </div>

          {pessoaSel && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Documentos</CardTitle>
                <Button onClick={() => setOpenNovo(true)}><Plus className="h-4 w-4" /> Adicionar</Button>
              </CardHeader>
              <CardContent>
                {(!docs || docs.length === 0) ? (
                  <Empty icon={<FileCheck className="h-5 w-5" />} title="Sem documentos"
                         description="Cadastre RG, CPF, comprovante de endereço, contrato..." />
                ) : (
                  <div className="space-y-2">
                    {docs.map((d) => (
                      <DocCard
                        key={d.id}
                        doc={d}
                        onSetStatus={(s) => setStatus.mutate({ id: d.id, status: s })}
                        onDelete={() => del.mutate(d.id)}
                        onExtract={() => extrairOcr.mutate(d.id)}
                        isExtracting={extrairOcr.isPending}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={openNovo} onOpenChange={setOpenNovo}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select value={novo.tipo ?? "rg"} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="durl">URL do arquivo (PDF, JPG, PNG…)</Label>
              <Input id="durl" placeholder="https://drive.google.com/uc?id=... ou link público direto" value={novo.arquivo_url ?? ""} onChange={(e) => setNovo({ ...novo, arquivo_url: e.target.value })} />
              <p className="text-xs text-muted-foreground">
                <AlertCircle className="mr-1 inline h-3 w-3" />
                O arquivo precisa ser <strong>acessível publicamente</strong> via URL para o OCR funcionar.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select value={novo.status ?? "pendente"} onChange={(e) => setNovo({ ...novo, status: e.target.value })}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNovo(false)}>Cancelar</Button>
            <Button onClick={() => add.mutate()} disabled={add.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
