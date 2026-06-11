import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { ChevronLeft, Plus, Shirt, Boxes, Trash2, Pencil, Camera, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { toast } from "sonner";
import { useProjectDeptAccess } from "@/hooks/useProjectDeptAccess";
import { useAuth } from "@/hooks/useAuth";
import { useOrgs } from "@/hooks/useOrg";

// ── Types ────────────────────────────────────────────────────────────────────

type Figurino = {
  id: string;
  descricao: string;
  tamanho: string | null;
  cor: string | null;
  fonte: string;
  valor_estimado: number | null;
  status: string;
  aprovacao_status: string | null;
  aprovacao_comentarios: string | null;
  foto_url: string | null;
};

type ArteObj = {
  id: string;
  descricao: string;
  categoria: string | null;
  fonte: string;
  valor_estimado: number | null;
  status: string;
  aprovacao_status: string | null;
  aprovacao_comentarios: string | null;
  origem: string | null;
  origem_detalhe: string | null;
  personagem_id: string | null;
  foto_url: string | null;
};

type LocacaoScouting = {
  id: string;
  nome: string;
  endereco: string | null;
  fotos_urls: string[] | null;
  aprovacao_status: string | null;
  aprovacao_comentarios: string | null;
  proposta_por: string | null;
};

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_FIG = ["previsto", "adquirido", "retirado", "devolvido"];
const STATUS_ARTE = ["previsto", "adquirido", "em_set", "devolvido"];
const FONTES = ["compra", "aluguel", "emprestimo", "producao"];
const ORIGENS_ARTE = [
  { value: "acervo", label: "Acervo" },
  { value: "aluguel", label: "Aluguel" },
  { value: "compra", label: "Compra" },
  { value: "emprestimo", label: "Empréstimo" },
];
const APROVACAO_STATUS = [
  { value: "em_analise", label: "Em análise" },
  { value: "visto_pelo_diretor", label: "Visto p/ Diretor" },
  { value: "aprovado", label: "Aprovado" },
  { value: "cancelado", label: "Cancelado" },
];
const APROVACAO_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  em_analise: "outline",
  visto_pelo_diretor: "secondary",
  aprovado: "default",
  cancelado: "destructive",
};
const SCOUTING_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  em_analise: "secondary",
  aprovada: "default",
  rejeitada: "destructive",
};
const SCOUTING_STATUS_LABEL: Record<string, string> = {
  em_analise: "Em análise",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractLatLng(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/,
    /[?&]latlng=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

// ── FotoThumbnail ─────────────────────────────────────────────────────────────

function FotoThumbnail({ path, onView }: { path: string; onView: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from("documentos").createSignedUrl(path, 3600)
      .then(({ data }) => { if (data?.signedUrl) setUrl(data.signedUrl); });
  }, [path]);
  return (
    <button
      onClick={() => url && onView(url)}
      className="w-16 h-16 rounded border overflow-hidden bg-muted flex items-center justify-center shrink-0"
    >
      {url
        ? <img src={url} alt="" className="w-full h-full object-cover" />
        : <Camera className="h-4 w-4 text-muted-foreground" />
      }
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FigurinoArte() {
  const { id: projetoId } = useParams<{ id: string }>();
  const qc = useQueryClient();

  // Auth & RBAC
  const { canEditSection, isSuperUser } = useProjectDeptAccess(projetoId);
  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const orgId = orgs?.[0]?.org.id;

  const canPropor = canEditSection("arte");
  const canAvaliar = canEditSection("direcao");
  const canEfetivar = isSuperUser;

  // Figurino / Arte state
  const [openFig, setOpenFig] = useState(false);
  const [openArte, setOpenArte] = useState(false);
  const [novoFig, setNovoFig] = useState<Partial<Figurino>>({ status: "previsto", fonte: "compra" });
  const [novoArte, setNovoArte] = useState<Partial<ArteObj>>({ status: "previsto", fonte: "compra" });
  const [editFig, setEditFig] = useState<Figurino | null>(null);
  const [editArte, setEditArte] = useState<ArteObj | null>(null);
  const [novoFigFile, setNovoFigFile] = useState<File | null>(null);
  const [novoFigPreview, setNovoFigPreview] = useState<string | null>(null);
  const [novoArteFile, setNovoArteFile] = useState<File | null>(null);
  const [novoArtePreview, setNovoArtePreview] = useState<string | null>(null);

  // Confirmações de exclusão
  const [confirmDelFig, setConfirmDelFig] = useState<string | null>(null);
  const [confirmDelArte, setConfirmDelArte] = useState<string | null>(null);
  const [confirmDelLoc, setConfirmDelLoc] = useState<string | null>(null);

  // Scouting state
  const [openPropor, setOpenPropor] = useState(false);
  const [nomeProposta, setNomeProposta] = useState("");
  const [endProposta, setEndProposta] = useState("");
  const [obsProposta, setObsProposta] = useState("");
  const [propostaFiles, setPropostaFiles] = useState<File[]>([]);
  const [addFotosLocId, setAddFotosLocId] = useState<string | null>(null);
  const [addFotosFiles, setAddFotosFiles] = useState<File[]>([]);
  const [avaliarLoc, setAvaliarLoc] = useState<LocacaoScouting | null>(null);
  const [avaliarComentario, setAvaliarComentario] = useState("");
  const [efetivando, setEfetivando] = useState<LocacaoScouting | null>(null);
  const [mapsUrlEfetiva, setMapsUrlEfetiva] = useState("");
  const [latLngEfetiva, setLatLngEfetiva] = useState<{ lat: number; lng: number } | null>(null);
  const [fotoViewer, setFotoViewer] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: figs, isLoading: lf } = useQuery({
    queryKey: ["figurinos", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("figurinos")
        .select("id, descricao, tamanho, cor, fonte, valor_estimado, status, aprovacao_status, aprovacao_comentarios, foto_url")
        .eq("projeto_id", projetoId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Figurino[];
    },
  });

  const { data: artes, isLoading: la } = useQuery({
    queryKey: ["arte-objetos", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("arte_objetos")
        .select("id, descricao, categoria, fonte, valor_estimado, status, aprovacao_status, aprovacao_comentarios, origem, origem_detalhe, personagem_id, foto_url")
        .eq("projeto_id", projetoId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ArteObj[];
    },
  });

  const { data: personagens } = useQuery({
    queryKey: ["personagens", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personagens")
        .select("id, nome")
        .eq("projeto_id", projetoId!)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: locacoesProposta } = useQuery({
    queryKey: ["locacoes-proposta", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locacoes")
        .select("id, nome, endereco, fotos_urls, aprovacao_status, aprovacao_comentarios, proposta_por")
        .eq("projeto_id", projetoId!)
        .eq("etapa", "proposta")
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as LocacaoScouting[];
    },
  });

  const { data: minhaPessoa } = useQuery({
    queryKey: ["minha-pessoa", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("pessoas")
        .select("nome")
        .ilike("email", user!.email!)
        .maybeSingle();
      return data;
    },
  });

  // ── Mutations: Figurino / Arte ─────────────────────────────────────────────

  const addFig = useMutation({
    mutationFn: async () => {
      if (!novoFig.descricao) throw new Error("Descrição obrigatória");
      let foto_url: string | null = null;
      if (novoFigFile) {
        try {
          const ext = novoFigFile.name.split(".").pop();
          const path = `figurinos/${projetoId}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from("documentos").upload(path, novoFigFile, { upsert: true });
          if (upErr) throw upErr;
          foto_url = path;
        } catch {
          toast.warning("Foto não foi salva, mas o figurino será criado.");
        }
      }
      const { error } = await supabase.from("figurinos").insert({
        projeto_id: projetoId!,
        descricao: novoFig.descricao,
        tamanho: novoFig.tamanho || null,
        cor: novoFig.cor || null,
        fonte: novoFig.fonte ?? "compra",
        valor_estimado: novoFig.valor_estimado ? Number(novoFig.valor_estimado) : null,
        status: novoFig.status ?? "previsto",
        aprovacao_status: "em_analise",
        foto_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Figurino adicionado");
      setOpenFig(false);
      setNovoFig({ status: "previsto", fonte: "compra" });
      setNovoFigFile(null);
      setNovoFigPreview(null);
      qc.invalidateQueries({ queryKey: ["figurinos", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addArte = useMutation({
    mutationFn: async () => {
      if (!novoArte.descricao) throw new Error("Descrição obrigatória");
      let foto_url: string | null = null;
      if (novoArteFile) {
        try {
          const ext = novoArteFile.name.split(".").pop();
          const path = `arte/${projetoId}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from("documentos").upload(path, novoArteFile, { upsert: true });
          if (upErr) throw upErr;
          foto_url = path;
        } catch {
          toast.warning("Foto não foi salva, mas o objeto será criado.");
        }
      }
      const { error } = await supabase.from("arte_objetos").insert({
        projeto_id: projetoId!,
        descricao: novoArte.descricao,
        categoria: novoArte.categoria || null,
        fonte: novoArte.fonte ?? "compra",
        valor_estimado: novoArte.valor_estimado ? Number(novoArte.valor_estimado) : null,
        status: novoArte.status ?? "previsto",
        aprovacao_status: "em_analise",
        foto_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Objeto de arte adicionado");
      setOpenArte(false);
      setNovoArte({ status: "previsto", fonte: "compra" });
      setNovoArteFile(null);
      setNovoArtePreview(null);
      qc.invalidateQueries({ queryKey: ["arte-objetos", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateFig = useMutation({
    mutationFn: async (f: Figurino) => {
      const { error } = await supabase.from("figurinos").update({
        descricao: f.descricao,
        tamanho: f.tamanho || null,
        cor: f.cor || null,
        fonte: f.fonte,
        status: f.status,
        valor_estimado: f.valor_estimado ? Number(f.valor_estimado) : null,
        aprovacao_status: f.aprovacao_status || null,
        aprovacao_comentarios: f.aprovacao_comentarios || null,
        foto_url: f.foto_url || null,
      }).eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Figurino atualizado");
      setEditFig(null);
      qc.invalidateQueries({ queryKey: ["figurinos", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateArte = useMutation({
    mutationFn: async (a: ArteObj) => {
      const { error } = await supabase.from("arte_objetos").update({
        descricao: a.descricao,
        categoria: a.categoria || null,
        fonte: a.fonte,
        status: a.status,
        valor_estimado: a.valor_estimado ? Number(a.valor_estimado) : null,
        aprovacao_status: a.aprovacao_status || null,
        aprovacao_comentarios: a.aprovacao_comentarios || null,
        origem: a.origem || null,
        origem_detalhe: a.origem_detalhe || null,
        personagem_id: a.personagem_id === "__none__" ? null : (a.personagem_id || null),
        foto_url: a.foto_url || null,
      }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Objeto atualizado");
      setEditArte(null);
      qc.invalidateQueries({ queryKey: ["arte-objetos", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delFig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("figurinos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Figurino excluído");
      setConfirmDelFig(null);
      qc.invalidateQueries({ queryKey: ["figurinos", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delArte = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("arte_objetos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Objeto excluído");
      setConfirmDelArte(null);
      qc.invalidateQueries({ queryKey: ["arte-objetos", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delLocScouting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("locacoes")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposta movida para a lixeira");
      setConfirmDelLoc(null);
      qc.invalidateQueries({ queryKey: ["locacoes-proposta", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Upload de fotos ────────────────────────────────────────────────────────

  async function uploadFotoFig(figId: string, file: File) {
    const ext = file.name.split(".").pop();
    const path = `figurinos/${projetoId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { error: e2 } = await supabase.from("figurinos").update({ foto_url: path }).eq("id", figId);
    if (e2) throw e2;
    qc.invalidateQueries({ queryKey: ["figurinos", projetoId] });
    if (editFig?.id === figId) setEditFig({ ...editFig, foto_url: path });
    toast.success("Foto salva");
  }

  async function uploadFotoArte(arteId: string, file: File) {
    const ext = file.name.split(".").pop();
    const path = `arte/${arteId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { error: e2 } = await supabase.from("arte_objetos").update({ foto_url: path }).eq("id", arteId);
    if (e2) throw e2;
    qc.invalidateQueries({ queryKey: ["arte-objetos", projetoId] });
    if (editArte?.id === arteId) setEditArte({ ...editArte, foto_url: path });
    toast.success("Foto salva");
  }

  // ── Mutations: Scouting ────────────────────────────────────────────────────

  const propor = useMutation({
    mutationFn: async () => {
      if (!nomeProposta.trim()) throw new Error("Nome obrigatório");
      if (!orgId) throw new Error("Produtora não encontrada");
      const { data: loc, error } = await supabase.from("locacoes").insert({
        org_id: orgId,
        projeto_id: projetoId!,
        nome: nomeProposta.trim(),
        endereco: endProposta.trim() || null,
        comentarios: obsProposta.trim() || null,
        etapa: "proposta",
        aprovacao_status: "em_analise",
        proposta_por: minhaPessoa?.nome || user?.email || null,
        fotos_urls: [],
      }).select("id").single();
      if (error) throw error;
      if (propostaFiles.length > 0) {
        const paths: string[] = [];
        for (const file of propostaFiles) {
          const ts = Date.now();
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `locacoes/${projetoId}/${ts}-${safeName}`;
          const { error: upErr } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
          if (upErr) throw upErr;
          paths.push(path);
        }
        const { error: updErr } = await supabase.from("locacoes").update({ fotos_urls: paths }).eq("id", loc.id);
        if (updErr) throw updErr;
      }
    },
    onSuccess: () => {
      toast.success("Proposta enviada");
      setOpenPropor(false);
      setNomeProposta("");
      setEndProposta("");
      setObsProposta("");
      setPropostaFiles([]);
      qc.invalidateQueries({ queryKey: ["locacoes-proposta", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const appendFotos = useMutation({
    mutationFn: async () => {
      if (!addFotosLocId || addFotosFiles.length === 0) return;
      const loc = locacoesProposta?.find((l) => l.id === addFotosLocId);
      const existing = loc?.fotos_urls ?? [];
      const newPaths: string[] = [];
      for (const file of addFotosFiles) {
        const ts = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `locacoes/${projetoId}/${ts}-${safeName}`;
        const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
        if (error) throw error;
        newPaths.push(path);
      }
      const { error } = await supabase.from("locacoes").update({ fotos_urls: [...existing, ...newPaths] }).eq("id", addFotosLocId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fotos adicionadas");
      setAddFotosLocId(null);
      setAddFotosFiles([]);
      qc.invalidateQueries({ queryKey: ["locacoes-proposta", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const avaliar = useMutation({
    mutationFn: async (status: "aprovada" | "rejeitada") => {
      if (!avaliarLoc) return;
      const { error } = await supabase.from("locacoes").update({
        aprovacao_status: status,
        aprovacao_comentarios: avaliarComentario.trim() || null,
      }).eq("id", avaliarLoc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação salva");
      setAvaliarLoc(null);
      setAvaliarComentario("");
      qc.invalidateQueries({ queryKey: ["locacoes-proposta", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const efetivar = useMutation({
    mutationFn: async (form: FormData) => {
      if (!efetivando) return;
      const url = String(form.get("maps_url") ?? "");
      const coords = extractLatLng(url);
      const { error } = await supabase.from("locacoes").update({
        etapa: "oficial",
        endereco: (form.get("endereco") as string) || null,
        maps_url: url || null,
        waze_url: (form.get("waze_url") as string) || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        responsavel_nome: (form.get("responsavel_nome") as string) || null,
        responsavel_contato: (form.get("responsavel_contato") as string) || null,
        valor_diaria: form.get("valor_diaria") ? Number(form.get("valor_diaria")) : null,
        restricoes: (form.get("restricoes") as string) || null,
        comentarios: (form.get("comentarios") as string) || null,
      }).eq("id", efetivando.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Locação efetivada na Produção");
      setEfetivando(null);
      setMapsUrlEfetiva("");
      setLatLngEfetiva(null);
      qc.invalidateQueries({ queryKey: ["locacoes-proposta", projetoId] });
      qc.invalidateQueries({ queryKey: ["locacoes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (lf || la) return <Loading />;

  const personagemNome = (pid: string | null) =>
    personagens?.find((p: any) => p.id === pid)?.nome ?? null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
      </Link>

      <h1 className="text-2xl font-bold">Figurino &amp; Arte</h1>

      {/* ── FIGURINOS ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Shirt className="h-5 w-5" /> Figurinos</CardTitle>
          <Button onClick={() => setOpenFig(true)}><Plus className="h-4 w-4" /> Adicionar</Button>
        </CardHeader>
        <CardContent>
          {(!figs || figs.length === 0) ? (
            <Empty icon={<Shirt className="h-5 w-5" />} title="Sem figurinos" description="Cadastre as peças de roupa do projeto." />
          ) : (
            <div className="space-y-2">
              {figs.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-md border p-3">
                  {f.foto_url && (
                    <FotoThumbnail path={f.foto_url} onView={setFotoViewer} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{f.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {[f.tamanho, f.cor, f.fonte].filter(Boolean).join(" · ")}
                      {f.valor_estimado ? ` · ${formatBRL(f.valor_estimado)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {f.aprovacao_status && (
                      <Badge variant={APROVACAO_VARIANT[f.aprovacao_status] ?? "outline"} className="text-xs">
                        {APROVACAO_STATUS.find(a => a.value === f.aprovacao_status)?.label ?? f.aprovacao_status}
                      </Badge>
                    )}
                    <Badge variant="outline">{f.status}</Badge>
                    <Button size="icon" variant="ghost" onClick={() => setEditFig(f)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {canPropor && (
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDelFig(f.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── ARTE ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5" /> Objetos de arte</CardTitle>
          <Button onClick={() => setOpenArte(true)}><Plus className="h-4 w-4" /> Adicionar</Button>
        </CardHeader>
        <CardContent>
          {(!artes || artes.length === 0) ? (
            <Empty icon={<Boxes className="h-5 w-5" />} title="Sem objetos" description="Cadastre setdec, props e objetos cênicos." />
          ) : (
            <div className="space-y-2">
              {artes.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-md border p-3">
                  {a.foto_url && (
                    <FotoThumbnail path={a.foto_url} onView={setFotoViewer} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{a.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {[a.categoria, a.fonte, a.origem].filter(Boolean).join(" · ")}
                      {a.valor_estimado ? ` · ${formatBRL(a.valor_estimado)}` : ""}
                      {a.personagem_id ? ` · ${personagemNome(a.personagem_id)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.aprovacao_status && (
                      <Badge variant={APROVACAO_VARIANT[a.aprovacao_status] ?? "outline"} className="text-xs">
                        {APROVACAO_STATUS.find(ap => ap.value === a.aprovacao_status)?.label ?? a.aprovacao_status}
                      </Badge>
                    )}
                    <Badge variant="outline">{a.status}</Badge>
                    <Button size="icon" variant="ghost" onClick={() => setEditArte(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {canPropor && (
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDelArte(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SCOUTING DE LOCAÇÕES ──────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Scouting de locações</CardTitle>
          {canPropor && (
            <Button onClick={() => setOpenPropor(true)}><Plus className="h-4 w-4" /> Propor locação</Button>
          )}
        </CardHeader>
        <CardContent>
          {(!locacoesProposta || locacoesProposta.length === 0) ? (
            <Empty icon={<MapPin className="h-5 w-5" />} title="Sem propostas" description="Proponha locações para avaliação do diretor." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {locacoesProposta.map((loc) => {
                const bv = SCOUTING_BADGE_VARIANT[loc.aprovacao_status ?? "em_analise"] ?? "secondary";
                const bl = SCOUTING_STATUS_LABEL[loc.aprovacao_status ?? "em_analise"] ?? loc.aprovacao_status;
                return (
                  <Card key={loc.id} className="border-2">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold">{loc.nome}</h3>
                          {loc.endereco && <p className="text-xs text-muted-foreground">{loc.endereco}</p>}
                          {loc.proposta_por && (
                            <p className="text-xs text-muted-foreground">Por: {loc.proposta_por}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={bv}>{bl}</Badge>
                          {canPropor && (
                            <Button size="icon" variant="ghost" onClick={() => setConfirmDelLoc(loc.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {(loc.fotos_urls ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {(loc.fotos_urls ?? []).map((path, i) => (
                            <FotoThumbnail key={i} path={path} onView={setFotoViewer} />
                          ))}
                        </div>
                      )}

                      {loc.aprovacao_comentarios && (
                        <p className="text-xs italic text-muted-foreground border-l-2 pl-2">
                          Diretor: {loc.aprovacao_comentarios}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        {canPropor && (
                          <Button size="sm" variant="outline" onClick={() => { setAddFotosLocId(loc.id); setAddFotosFiles([]); }}>
                            <Camera className="h-3.5 w-3.5 mr-1" /> + fotos
                          </Button>
                        )}
                        {canAvaliar && (
                          <Button size="sm" variant="outline" onClick={() => { setAvaliarLoc(loc); setAvaliarComentario(loc.aprovacao_comentarios ?? ""); }}>
                            Avaliar
                          </Button>
                        )}
                        {canEfetivar && loc.aprovacao_status === "aprovada" && (
                          <Button size="sm" onClick={() => { setEfetivando(loc); setMapsUrlEfetiva(""); setLatLngEfetiva(null); }}>
                            Efetivar na Produção
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog: Novo figurino ──────────────────────────────── */}
      <Dialog open={openFig} onOpenChange={(o) => { setOpenFig(o); if (!o) { setNovoFigFile(null); setNovoFigPreview(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo figurino</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fdesc">Descrição</Label>
              <Input id="fdesc" autoComplete="off" value={novoFig.descricao ?? ""} onChange={(e) => setNovoFig({ ...novoFig, descricao: e.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ftam">Tamanho</Label>
                <Input id="ftam" autoComplete="off" value={novoFig.tamanho ?? ""} onChange={(e) => setNovoFig({ ...novoFig, tamanho: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fcor">Cor</Label>
                <Input id="fcor" autoComplete="off" value={novoFig.cor ?? ""} onChange={(e) => setNovoFig({ ...novoFig, cor: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Fonte</Label>
                <select value={novoFig.fonte} onChange={(e) => setNovoFig({ ...novoFig, fonte: e.target.value })}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {FONTES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={novoFig.status} onChange={(e) => setNovoFig({ ...novoFig, status: e.target.value })}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {STATUS_FIG.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fval">Valor R$</Label>
                <Input id="fval" type="number" step="0.01" autoComplete="off" value={novoFig.valor_estimado ?? ""}
                  onChange={(e) => setNovoFig({ ...novoFig, valor_estimado: e.target.value as unknown as number })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Foto (opcional)</Label>
              <input
                type="file"
                accept="image/*"
                className="text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setNovoFigFile(file);
                  setNovoFigPreview(file ? URL.createObjectURL(file) : null);
                }}
              />
              {novoFigPreview && (
                <img src={novoFigPreview} alt="Preview" className="h-20 w-20 rounded border object-cover mt-1" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenFig(false)}>Cancelar</Button>
            <Button onClick={() => addFig.mutate()} disabled={addFig.isPending}>
              {addFig.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Novo objeto de arte ───────────────────────── */}
      <Dialog open={openArte} onOpenChange={(o) => { setOpenArte(o); if (!o) { setNovoArteFile(null); setNovoArtePreview(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo objeto de arte</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="adesc">Descrição</Label>
              <Input id="adesc" autoComplete="off" value={novoArte.descricao ?? ""} onChange={(e) => setNovoArte({ ...novoArte, descricao: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acat">Categoria</Label>
              <Input id="acat" autoComplete="off" placeholder="setdec, props, especiais..." value={novoArte.categoria ?? ""} onChange={(e) => setNovoArte({ ...novoArte, categoria: e.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Fonte</Label>
                <select value={novoArte.fonte} onChange={(e) => setNovoArte({ ...novoArte, fonte: e.target.value })}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {FONTES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={novoArte.status} onChange={(e) => setNovoArte({ ...novoArte, status: e.target.value })}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {STATUS_ARTE.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aval">Valor R$</Label>
                <Input id="aval" type="number" step="0.01" autoComplete="off" value={novoArte.valor_estimado ?? ""}
                  onChange={(e) => setNovoArte({ ...novoArte, valor_estimado: e.target.value as unknown as number })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Foto (opcional)</Label>
              <input
                type="file"
                accept="image/*"
                className="text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setNovoArteFile(file);
                  setNovoArtePreview(file ? URL.createObjectURL(file) : null);
                }}
              />
              {novoArtePreview && (
                <img src={novoArtePreview} alt="Preview" className="h-20 w-20 rounded border object-cover mt-1" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenArte(false)}>Cancelar</Button>
            <Button onClick={() => addArte.mutate()} disabled={addArte.isPending}>
              {addArte.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar figurino ────────────────────────────── */}
      <Dialog open={!!editFig} onOpenChange={(o) => { if (!o) setEditFig(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar figurino</DialogTitle></DialogHeader>
          {editFig && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input autoComplete="off" value={editFig.descricao} onChange={(e) => setEditFig({ ...editFig, descricao: e.target.value })} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tamanho</Label>
                  <Input autoComplete="off" value={editFig.tamanho ?? ""} onChange={(e) => setEditFig({ ...editFig, tamanho: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cor</Label>
                  <Input autoComplete="off" value={editFig.cor ?? ""} onChange={(e) => setEditFig({ ...editFig, cor: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Fonte</Label>
                  <select value={editFig.fonte} onChange={(e) => setEditFig({ ...editFig, fonte: e.target.value })}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {FONTES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select value={editFig.status} onChange={(e) => setEditFig({ ...editFig, status: e.target.value })}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {STATUS_FIG.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Valor R$</Label>
                  <Input type="number" step="0.01" autoComplete="off" value={editFig.valor_estimado ?? ""}
                    onChange={(e) => setEditFig({ ...editFig, valor_estimado: e.target.value as unknown as number })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Aprovação do Diretor</Label>
                <Select value={editFig.aprovacao_status ?? "em_analise"} onValueChange={(v) => setEditFig({ ...editFig, aprovacao_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APROVACAO_STATUS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Comentários de aprovação</Label>
                <Textarea rows={2} autoComplete="off" value={editFig.aprovacao_comentarios ?? ""} onChange={(e) => setEditFig({ ...editFig, aprovacao_comentarios: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Foto do figurino</Label>
                <div className="flex items-center gap-3">
                  {editFig.foto_url && (
                    <FotoThumbnail path={editFig.foto_url} onView={setFotoViewer} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file && editFig) {
                        try { await uploadFotoFig(editFig.id, file); }
                        catch (err: any) { toast.error(err.message); }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFig(null)}>Cancelar</Button>
            <Button onClick={() => editFig && updateFig.mutate(editFig)} disabled={updateFig.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar objeto de arte ─────────────────────── */}
      <Dialog open={!!editArte} onOpenChange={(o) => { if (!o) setEditArte(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar objeto de arte</DialogTitle></DialogHeader>
          {editArte && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input autoComplete="off" value={editArte.descricao} onChange={(e) => setEditArte({ ...editArte, descricao: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input autoComplete="off" placeholder="setdec, props, especiais..." value={editArte.categoria ?? ""} onChange={(e) => setEditArte({ ...editArte, categoria: e.target.value })} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Fonte</Label>
                  <select value={editArte.fonte} onChange={(e) => setEditArte({ ...editArte, fonte: e.target.value })}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {FONTES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select value={editArte.status} onChange={(e) => setEditArte({ ...editArte, status: e.target.value })}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    {STATUS_ARTE.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Valor R$</Label>
                  <Input type="number" step="0.01" autoComplete="off" value={editArte.valor_estimado ?? ""}
                    onChange={(e) => setEditArte({ ...editArte, valor_estimado: e.target.value as unknown as number })} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Origem</Label>
                  <Select value={editArte.origem ?? "__none__"} onValueChange={(v) => setEditArte({ ...editArte, origem: v === "__none__" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Não informada</SelectItem>
                      {ORIGENS_ARTE.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Detalhe da origem</Label>
                  <Input autoComplete="off" placeholder="De quem, onde, valor..." value={editArte.origem_detalhe ?? ""} onChange={(e) => setEditArte({ ...editArte, origem_detalhe: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Personagem vinculado</Label>
                <Select value={editArte.personagem_id ?? "__none__"} onValueChange={(v) => setEditArte({ ...editArte, personagem_id: v === "__none__" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum personagem</SelectItem>
                    {(personagens ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Aprovação do Diretor</Label>
                <Select value={editArte.aprovacao_status ?? "em_analise"} onValueChange={(v) => setEditArte({ ...editArte, aprovacao_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APROVACAO_STATUS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Comentários de aprovação</Label>
                <Textarea rows={2} autoComplete="off" value={editArte.aprovacao_comentarios ?? ""} onChange={(e) => setEditArte({ ...editArte, aprovacao_comentarios: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Foto do objeto</Label>
                <div className="flex items-center gap-3">
                  {editArte.foto_url && (
                    <FotoThumbnail path={editArte.foto_url} onView={setFotoViewer} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file && editArte) {
                        try { await uploadFotoArte(editArte.id, file); }
                        catch (err: any) { toast.error(err.message); }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditArte(null)}>Cancelar</Button>
            <Button onClick={() => editArte && updateArte.mutate(editArte)} disabled={updateArte.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Propor locação ─────────────────────────────── */}
      <Dialog open={openPropor} onOpenChange={setOpenPropor}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Propor locação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pnome">Nome *</Label>
              <Input id="pnome" autoComplete="off" value={nomeProposta} onChange={(e) => setNomeProposta(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pend">Endereço (opcional)</Label>
              <Input id="pend" autoComplete="off" value={endProposta} onChange={(e) => setEndProposta(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pobs">Observações</Label>
              <Textarea id="pobs" rows={3} autoComplete="off" value={obsProposta} onChange={(e) => setObsProposta(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fotos</Label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="text-sm"
                onChange={(e) => setPropostaFiles(Array.from(e.target.files ?? []))}
              />
              {propostaFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">{propostaFiles.length} foto(s) selecionada(s)</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPropor(false)}>Cancelar</Button>
            <Button onClick={() => propor.mutate()} disabled={propor.isPending}>
              {propor.isPending ? "Enviando..." : "Propor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: + fotos ───────────────────────────────────── */}
      <Dialog open={!!addFotosLocId} onOpenChange={(o) => { if (!o) { setAddFotosLocId(null); setAddFotosFiles([]); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar fotos</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*"
              multiple
              className="text-sm"
              onChange={(e) => setAddFotosFiles(Array.from(e.target.files ?? []))}
            />
            {addFotosFiles.length > 0 && (
              <p className="text-xs text-muted-foreground">{addFotosFiles.length} foto(s) selecionada(s)</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddFotosLocId(null); setAddFotosFiles([]); }}>Cancelar</Button>
            <Button onClick={() => appendFotos.mutate()} disabled={appendFotos.isPending || addFotosFiles.length === 0}>
              {appendFotos.isPending ? "Enviando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Avaliar (Diretor) ──────────────────────────── */}
      <Dialog open={!!avaliarLoc} onOpenChange={(o) => { if (!o) setAvaliarLoc(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Avaliar: {avaliarLoc?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Comentário (opcional)</Label>
              <Textarea rows={3} autoComplete="off" value={avaliarComentario} onChange={(e) => setAvaliarComentario(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAvaliarLoc(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => avaliar.mutate("rejeitada")} disabled={avaliar.isPending}>
              <XCircle className="h-4 w-4 mr-1" /> Rejeitar
            </Button>
            <Button onClick={() => avaliar.mutate("aprovada")} disabled={avaliar.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Efetivar na Produção ───────────────────────── */}
      <Dialog key={efetivando?.id} open={!!efetivando} onOpenChange={(o) => { if (!o) setEfetivando(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={(e) => { e.preventDefault(); efetivar.mutate(new FormData(e.currentTarget)); }}
            className="space-y-4"
            autoComplete="off"
          >
            <DialogHeader><DialogTitle>Efetivar locação na Produção</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={efetivando?.nome ?? ""} readOnly className="bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label>Endereço</Label>
                <Input name="endereco" defaultValue={efetivando?.endereco ?? ""} autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label>Link do Google Maps</Label>
                <Input
                  name="maps_url"
                  placeholder="https://www.google.com/maps/..."
                  value={mapsUrlEfetiva}
                  autoComplete="off"
                  onChange={(e) => {
                    setMapsUrlEfetiva(e.target.value);
                    setLatLngEfetiva(extractLatLng(e.target.value));
                  }}
                />
                {latLngEfetiva && (
                  <p className="text-xs text-emerald-600">Coordenadas: {latLngEfetiva.lat}, {latLngEfetiva.lng}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Link do Waze (opcional)</Label>
                <Input name="waze_url" placeholder="https://waze.com/ul?..." autoComplete="off" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Responsável pelo local</Label>
                  <Input name="responsavel_nome" autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contato do responsável</Label>
                  <Input name="responsavel_contato" autoComplete="off" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Valor da diária (R$)</Label>
                <Input name="valor_diaria" type="number" step="0.01" autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label>Restrições</Label>
                <Textarea name="restricoes" rows={2} autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label>Comentários / regras internas</Label>
                <Textarea name="comentarios" rows={2} autoComplete="off" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEfetivando(null)}>Cancelar</Button>
              <Button type="submit" disabled={efetivar.isPending}>
                {efetivar.isPending ? "Salvando..." : "Efetivar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar exclusão — Figurino ─────────────── */}
      <Dialog open={!!confirmDelFig} onOpenChange={(o) => { if (!o) setConfirmDelFig(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir figurino?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação é permanente e não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelFig(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelFig && delFig.mutate(confirmDelFig)} disabled={delFig.isPending}>
              {delFig.isPending ? "Excluindo..." : "Excluir definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar exclusão — Arte ─────────────────── */}
      <Dialog open={!!confirmDelArte} onOpenChange={(o) => { if (!o) setConfirmDelArte(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir objeto de arte?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação é permanente e não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelArte(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelArte && delArte.mutate(confirmDelArte)} disabled={delArte.isPending}>
              {delArte.isPending ? "Excluindo..." : "Excluir definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar exclusão — Scouting ─────────────── */}
      <Dialog open={!!confirmDelLoc} onOpenChange={(o) => { if (!o) setConfirmDelLoc(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir proposta?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">A proposta será movida para a lixeira e poderá ser restaurada em Configurações.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelLoc(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelLoc && delLocScouting.mutate(confirmDelLoc)} disabled={delLocScouting.isPending}>
              {delLocScouting.isPending ? "Excluindo..." : "Excluir definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Visualizador de foto ───────────────────────── */}
      <Dialog open={!!fotoViewer} onOpenChange={(o) => { if (!o) setFotoViewer(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Foto</DialogTitle></DialogHeader>
          {fotoViewer && <img src={fotoViewer} alt="" className="w-full rounded-md" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
