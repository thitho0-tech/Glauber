import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, ChevronLeft, Trash2, UserPlus, Pencil, FolderOpen, Lock } from "lucide-react";
import { useOrgs } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { formatBRL } from "@/lib/utils";
import { toast } from "sonner";
import { InviteButton } from "@/components/InviteButton";
import { temDDD } from "@/lib/phone";

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
  outros: "Outros",
};

const REGIME_LABEL: Record<string, string> = {
  rpa: "RPA",
  clt: "CLT",
  mei: "MEI",
  pj: "PJ",
  diarista: "Diarista",
  voluntario: "Voluntário",
};

const REGIME_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  rpa: "default",
  clt: "secondary",
  mei: "outline",
  pj: "outline",
  diarista: "secondary",
  voluntario: "outline",
};

const DEPARTAMENTOS_AV = [
  { value: "producao",        label: "Produção" },
  { value: "desenvolvimento", label: "Roteiro" },
  { value: "direcao",         label: "Direção" },
  { value: "fotografia",      label: "Fotografia" },
  { value: "arte",            label: "Arte" },
  { value: "som",             label: "Som" },
  { value: "elenco",          label: "Elenco" },
  { value: "pos_producao",    label: "Pós-produção" },
];

function FuncoesProjetoSelect({
  funcoes,
  selected,
  principal,
  onToggle,
  onSetPrincipal,
  deptSelecionado = false,
  outrosAtivo = false,
  onOutrosToggle,
  outrosTexto = "",
  onOutrosChange,
}: {
  funcoes: any[];
  selected: string[];
  principal: string;
  onToggle: (id: string) => void;
  onSetPrincipal: (id: string) => void;
  deptSelecionado?: boolean;
  outrosAtivo?: boolean;
  onOutrosToggle?: (on: boolean) => void;
  outrosTexto?: string;
  onOutrosChange?: (v: string) => void;
}) {
  if (!deptSelecionado) {
    return (
      <p className="text-xs text-muted-foreground py-1">
        Selecione um departamento para ver as funções disponíveis.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <Label>Funções no projeto</Label>
      <div className="border rounded-md divide-y max-h-36 overflow-y-auto">
        {funcoes.map((f) => {
          const isSelected = selected.includes(f.id);
          const isPrincipal = principal === f.id;
          return (
            <div key={f.id} className="flex items-center gap-2 px-3 py-2">
              <input
                type="checkbox"
                id={`fn-${f.id}`}
                checked={isSelected}
                onChange={() => onToggle(f.id)}
                className="h-4 w-4 accent-primary cursor-pointer"
              />
              <label htmlFor={`fn-${f.id}`} className="text-sm flex-1 cursor-pointer">
                {f.nome}
              </label>
              {isSelected && (
                <button
                  type="button"
                  onClick={() => onSetPrincipal(f.id)}
                  className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                    isPrincipal
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground hover:text-foreground border-border"
                  }`}
                  title={isPrincipal ? "Função principal" : "Marcar como principal"}
                >
                  {isPrincipal ? "★ principal" : "☆"}
                </button>
              )}
            </div>
          );
        })}
        {/* Opção "Outros": função fora do catálogo → entra como Leitor */}
        {onOutrosToggle && (
        <div className="px-3 py-2 space-y-1.5 bg-muted/30">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fn-outros"
              checked={outrosAtivo}
              onChange={(e) => onOutrosToggle?.(e.target.checked)}
              className="h-4 w-4 accent-primary cursor-pointer"
            />
            <label htmlFor="fn-outros" className="text-sm flex-1 cursor-pointer">
              Outros <span className="text-muted-foreground">(descrever função)</span>
            </label>
          </div>
          {outrosAtivo && (
            <Input
              value={outrosTexto}
              onChange={(e) => onOutrosChange?.(e.target.value)}
              placeholder="Ex.: Consultor de dialeto"
              className="h-8 text-sm"
              autoFocus
            />
          )}
        </div>
        )}
      </div>
      {selected.length === 0 && !outrosAtivo && (
        <p className="text-xs text-muted-foreground">Selecione ao menos uma função para o organograma.</p>
      )}
      {outrosAtivo && (
        <p className="text-xs text-amber-600">Função personalizada — a pessoa entra no projeto como <strong>Leitor</strong> (pode ser promovida depois).</p>
      )}
    </div>
  );
}

function getPrincipalFuncao(v: any): string | null {
  const lista: any[] = v.funcoes ?? [];
  const p = lista.find((f: any) => f.principal) ?? lista[0];
  return p?.funcao_av?.nome ?? v.papel_descricao ?? null;
}

function getPrincipalDept(v: any): string | null {
  const lista: any[] = v.funcoes ?? [];
  const p = lista.find((f: any) => f.principal) ?? lista[0];
  return p?.funcao_av?.departamento ?? null;
}

export default function Team() {
  const { id: projetoId } = useParams();
  const { can, isLoading: permsLoading } = usePermissions(projetoId);
  const canVer = can('equipe', 'ver');
  const canEditEquipe = can('equipe', 'editar');
  const canRemoverEquipe = can('equipe', 'remover');
  const [open, setOpen] = useState(false);
  const [openRegime, setOpenRegime] = useState<string | null>(null);
  const [openDocs, setOpenDocs] = useState<string | null>(null);
  const [docsData, setDocsData] = useState<Record<string, string>>({});
  const [pendingDocs, setPendingDocs] = useState<Record<string, File>>({});

  // Editar membro — state
  const [editVinculo, setEditVinculo] = useState<any | null>(null);
  const [editDept, setEditDept] = useState("");
  const [editFuncoes, setEditFuncoes] = useState<string[]>([]);
  const [editPrincipal, setEditPrincipal] = useState("");

  // Nova pessoa — multi-function state
  const [deptNova, setDeptNova] = useState("");
  const [novaFuncoes, setNovaFuncoes] = useState<string[]>([]);
  const [novaPrincipal, setNovaPrincipal] = useState("");
  const [novaOutros, setNovaOutros] = useState(""); // texto da função personalizada
  const [novaOutrosOn, setNovaOutrosOn] = useState(false); // "Outros" marcado → entra como Leitor

  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  // FIX: pessoas devem nascer no org do PROJETO, não no org pessoal de quem cadastra
  const { data: projOrg } = useQuery({
    queryKey: ["projeto-org", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("projetos").select("org_id").eq("id", projetoId!).single();
      if (error) throw error;
      return data as { org_id: string };
    },
  });
  const orgId = projOrg?.org_id ?? orgs?.[0]?.org.id;
  const qc = useQueryClient();

  function toggleFuncao(
    id: string,
    selected: string[],
    setSelected: (v: string[]) => void,
    principal: string,
    setPrincipal: (v: string) => void,
  ) {
    if (selected.includes(id)) {
      const next = selected.filter((x) => x !== id);
      setSelected(next);
      if (principal === id) setPrincipal(next[0] ?? "");
    } else {
      const next = [...selected, id];
      setSelected(next);
      if (!principal) setPrincipal(id);
    }
  }

  function resetNovaForm() {
    setDeptNova(""); setNovaFuncoes([]); setNovaPrincipal(""); setNovaOutros(""); setNovaOutrosOn(false);
  }

  function openEdit(v: any) {
    const dept = getPrincipalDept(v) ?? "";
    const funcoes = (v.funcoes ?? []).map((f: any) => f.funcao_av?.id).filter(Boolean);
    const principal = (v.funcoes ?? []).find((f: any) => f.principal)?.funcao_av?.id ?? funcoes[0] ?? "";
    setEditVinculo(v);
    setEditDept(dept);
    setEditFuncoes(funcoes);
    setEditPrincipal(principal);
  }

  const { data: vinculos, isLoading } = useQuery({
    queryKey: ["projeto-pessoas", projetoId],
    enabled: !!projetoId && canVer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select(`
          *,
          pessoa:pessoas(id, nome, email, telefone, departamento, funcao, documentos, foto_url),
          funcoes:projeto_pessoa_funcoes(id, principal, funcao_av:funcoes_av(id, nome, departamento))
        `)
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .order("criado_em");
      if (error) throw error;
      return data;
    },
  });

  const { data: funcoesAv } = useQuery({
    queryKey: ["funcoes-av"],
    enabled: canVer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcoes_av")
        .select("*")
        .order("departamento")
        .order("nivel");
      if (error) throw error;
      return data;
    },
  });

  const { data: regimes } = useQuery({
    queryKey: ["regimes-contratacao", projetoId],
    enabled: !!projetoId && canVer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regimes_contratacao")
        .select("*")
        .eq("projeto_id", projetoId!);
      if (error) {
        if (error.code === "42P01") return [];
        throw error;
      }
      return data;
    },
  });

  // Email do criador do projeto — identifica linha do owner para bloquear remoção
  const { data: ownerEmail } = useQuery({
    queryKey: ["project-owner-email", projetoId],
    enabled: !!projetoId && canVer,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.rpc("project_owner_email", { p_projeto: projetoId });
      return (data as string | null)?.toLowerCase() ?? null;
    },
  });

  // L8: funções filtradas por departamento selecionado (lista vazia se sem depto)
  const funcoesAvFiltNova = deptNova
    ? (funcoesAv ?? []).filter((f: any) => f.departamento === deptNova)
    : [];

  const funcoesAvFiltEdit = editDept
    ? (funcoesAv ?? []).filter((f: any) => f.departamento === editDept)
    : [];

  async function insertFuncoes(ppId: string, funcoes: string[], principal: string) {
    if (funcoes.length === 0) return;
    const payload = funcoes.map((fid) => ({
      projeto_pessoa_id: ppId,
      funcao_av_id: fid,
      principal: fid === (principal || funcoes[0]),
    }));
    const { error } = await supabase.from("projeto_pessoa_funcoes").insert(payload);
    if (error) throw error;
  }

  // L9: apenas "nova pessoa" (sem catálogo)
  const criarEVincular = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId || !projetoId) throw new Error("Contexto inválido");
      const telNova = String(form.get("telefone") ?? "").trim();
      if (telNova && !temDDD(telNova)) throw new Error("Informe o telefone com DDD (ex: (81) 9 9999-9999).");
      const pessoaPayload: any = {
        org_id: orgId,
        nome: form.get("nome"),
        funcao: null,
        departamento: deptNova || null,
        telefone: telNova || null,
        email: form.get("email") || null,
      };
      const { data: pessoa, error: e1 } = await supabase
        .from("pessoas")
        .insert(pessoaPayload)
        .select()
        .single();
      if (e1) throw e1;
      const outrosTexto = novaOutrosOn ? novaOutros.trim() : "";
      const vinculoPayload: any = {
        projeto_id: projetoId,
        pessoa_id: pessoa.id,
        funcao_av_id: novaPrincipal || novaFuncoes[0] || null,
        valor_contratacao: Number(form.get("valor_contratacao") ?? 0),
        // Função personalizada ("Outros") → entra como Leitor; senão papel padrão do depto
        papel_projeto: outrosTexto ? "leitor" : "departamento", // FIX: papel null escondia menus (agenda etc.)
        papel_descricao: outrosTexto || null,
      };
      const { data: pp, error: e2 } = await supabase
        .from("projeto_pessoas")
        .insert(vinculoPayload)
        .select("id")
        .single();
      if (e2) throw e2;
      await insertFuncoes(pp.id, novaFuncoes, novaPrincipal);
    },
    onSuccess: () => {
      toast.success("Pessoa criada e vinculada ao projeto");
      qc.invalidateQueries({ queryKey: ["projeto-pessoas", projetoId] });
      setOpen(false);
      resetNovaForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const atualizarVinculo = useMutation({
    mutationFn: async (form: FormData) => {
      if (!editVinculo) return;
      const ppId = editVinculo.id;
      const pessoaId = editVinculo.pessoa?.id;
      const telEdit = String(form.get("telefone") ?? "").trim();
      if (telEdit && !temDDD(telEdit)) throw new Error("Informe o telefone com DDD (ex: (81) 9 9999-9999).");
      const emailEdit = String(form.get("email") ?? "").trim().toLowerCase();
      if (emailEdit && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailEdit)) throw new Error("E-mail invalido.");
      if (pessoaId) {
        const { error } = await supabase.from("pessoas").update({
          nome: String(form.get("nome")),
          email: emailEdit || null,
          telefone: telEdit || null,
          departamento: editDept || null,
        }).eq("id", pessoaId);
        if (error) throw error;
      }
      const { error: e2 } = await supabase.from("projeto_pessoas").update({
        funcao_av_id: editPrincipal || editFuncoes[0] || null,
        valor_contratacao: Number(form.get("valor_contratacao") ?? 0),
      }).eq("id", ppId);
      if (e2) throw e2;
      const { error: e3 } = await supabase.from("projeto_pessoa_funcoes").delete().eq("projeto_pessoa_id", ppId);
      if (e3) throw e3;
      await insertFuncoes(ppId, editFuncoes, editPrincipal);
    },
    onSuccess: () => {
      toast.success("Membro atualizado com sucesso");
      qc.invalidateQueries({ queryKey: ["projeto-pessoas", projetoId] });
      setEditVinculo(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const desvincular = useMutation({
    mutationFn: async (vinculoId: string) => {
      const { error } = await supabase.rpc("soft_delete_item", {
        p_tabela: "projeto_pessoas",
        p_id: vinculoId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa movida para a lixeira. Acesse Configurações → Lixeira para restaurar.");
      qc.invalidateQueries({ queryKey: ["projeto-pessoas", projetoId] });
    },
  });

  async function uploadDoc(pessoaId: string, tipo: string, file: File) {
    const ext = file.name.split(".").pop();
    const path = `pessoas/${pessoaId}/${tipo}.${ext}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  }

  async function verDoc(path: string) {
    const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Não foi possível gerar link");
  }

  const salvarDocs = useMutation({
    mutationFn: async (pessoaId: string) => {
      const docUrls: Record<string, string> = { ...docsData };
      let novaFoto: string | undefined;
      for (const [tipo, file] of Object.entries(pendingDocs)) {
        const url = await uploadDoc(pessoaId, tipo, file);
        if (tipo === "foto_url") { novaFoto = url; }
        else { docUrls[tipo] = url; }
      }
      const payload: any = { documentos: docUrls };
      if (novaFoto) payload.foto_url = novaFoto;
      const { error } = await supabase.from("pessoas").update(payload).eq("id", pessoaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documentos salvos");
      setOpenDocs(null);
      setDocsData({});
      setPendingDocs({});
      qc.invalidateQueries({ queryKey: ["projeto-pessoas", projetoId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const salvarRegime = useMutation({
    mutationFn: async (form: FormData) => {
      const pessoaId = String(form.get("_pessoa_id"));
      const bruto = Number(form.get("valor_bruto") ?? 0);
      const tipo = String(form.get("tipo"));
      const inss_pct = Number(form.get("inss_pct") ?? 20) / 100;
      let valorLiquido = bruto;
      if (tipo === "rpa") {
        const { data: liq } = await supabase.rpc("fn_calcular_liquido_rpa", {
          p_bruto: bruto,
          p_inss_pct: inss_pct,
        });
        if (liq !== null && liq !== undefined) valorLiquido = Number(liq);
      }
      const payload: any = {
        pessoa_id: pessoaId,
        projeto_id: projetoId,
        tipo,
        valor_bruto: bruto,
        valor_liquido: valorLiquido,
        dias_contrato: Number(form.get("dias_contrato") ?? 1),
        dados_rpa: tipo === "rpa" ? { inss_pct, observacao: form.get("observacao") ?? "" } : {},
      };
      const existente = (regimes ?? []).find((r: any) => r.pessoa_id === pessoaId);
      if (existente) {
        const { error } = await supabase.from("regimes_contratacao").update(payload).eq("id", existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("regimes_contratacao").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Regime salvo");
      qc.invalidateQueries({ queryKey: ["regimes-contratacao", projetoId] });
      setOpenRegime(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (permsLoading) return <Loading />;
  if (!canVer) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
      <Lock className="h-10 w-10" />
      <p className="text-sm">Conteúdo restrito. Você não tem permissão para visualizar esta seção.</p>
    </div>
  );
  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={`/projetos/${projetoId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
          </Link>
          <h1 className="text-2xl font-bold">Equipe e Elenco do projeto</h1>
          <p className="text-sm text-muted-foreground">
            Adicione pessoas à equipe deste projeto.
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            if (canEditEquipe) { setOpen(v); if (!v) resetNovaForm(); }
          }}
        >
          <DialogTrigger asChild disabled={!canEditEquipe}>
            <Button disabled={!canEditEquipe}><Plus className="h-4 w-4" /> Adicionar ao projeto</Button>
          </DialogTrigger>
          <DialogContent className="flex flex-col max-h-[90vh] p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
              <DialogTitle>Adicionar pessoa ao projeto</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => { e.preventDefault(); criarEVincular.mutate(new FormData(e.currentTarget)); }}
              className="flex flex-col flex-1 min-h-0"
              autoComplete="off"
            >
              {/* campos roláveis */}
              <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" name="nome" required />
                </div>

                {/* L8: Departamento obrigatório antes de ver funções */}
                <div className="space-y-1.5">
                  <Label>Departamento</Label>
                  <Select value={deptNova} onValueChange={(v) => { setDeptNova(v); setNovaFuncoes([]); setNovaPrincipal(""); setNovaOutros(""); setNovaOutrosOn(false); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTAMENTOS_AV.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <FuncoesProjetoSelect
                  funcoes={funcoesAvFiltNova}
                  selected={novaFuncoes}
                  principal={novaPrincipal}
                  onToggle={(id) => toggleFuncao(id, novaFuncoes, setNovaFuncoes, novaPrincipal, setNovaPrincipal)}
                  onSetPrincipal={setNovaPrincipal}
                  deptSelecionado={!!deptNova}
                  outrosAtivo={novaOutrosOn}
                  onOutrosToggle={setNovaOutrosOn}
                  outrosTexto={novaOutros}
                  onOutrosChange={setNovaOutros}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="telefone">Telefone (com DDD)</Label>
                    <Input id="telefone" name="telefone" placeholder="(81) 9 9999-9999" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="valor_contratacao_n">Valor de contratação (R$)</Label>
                  <Input id="valor_contratacao_n" name="valor_contratacao" type="number" step="0.01" defaultValue="0" />
                </div>
              </div>

              {/* footer fixo */}
              <DialogFooter className="px-6 py-3 border-t shrink-0">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetNovaForm(); }}>Cancelar</Button>
                <Button type="submit" disabled={criarEVincular.isPending}>
                  {criarEVincular.isPending ? "Criando..." : "Criar e adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!vinculos?.length ? (
        <Empty
          icon={<Users className="h-5 w-5" />}
          title="Sem pessoas neste projeto"
          description="Adicione pessoas à equipe deste projeto."
          action={
            canEditEquipe ? (
              <Button onClick={() => setOpen(true)}>
                <UserPlus className="h-4 w-4" /> Adicionar ao projeto
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Mobile: cards */}
            <div className="md:hidden divide-y">
              {vinculos.map((v: any) => {
                const dept = getPrincipalDept(v);
                const funcaoNome = getPrincipalFuncao(v);
                const todasFuncoes: any[] = v.funcoes ?? [];
                const regime = (regimes ?? []).find((r: any) => r.pessoa_id === v.pessoa?.id);
                const isOwnerRow = ownerEmail ? v.pessoa?.email?.toLowerCase() === ownerEmail : false;
                return (
                  <div key={v.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{v.pessoa?.nome ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {funcaoNome ?? "—"}
                          {todasFuncoes.length > 1 && (
                            <span className="ml-1 text-muted-foreground/70">+{todasFuncoes.length - 1}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" title="Documentos" onClick={() => {
                          setOpenDocs(v.pessoa?.id ?? null);
                          setDocsData(v.pessoa?.documentos ?? {});
                          setPendingDocs({});
                        }}>
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        <InviteButton projetoPessoaId={v.id} pessoaEmail={v.pessoa?.email} pessoaNome={v.pessoa?.nome} pessoaTelefone={v.pessoa?.telefone} />
                        {canEditEquipe && !isOwnerRow && (
                          <Button size="icon" variant="ghost" title="Editar membro" onClick={() => openEdit(v)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canRemoverEquipe && !isOwnerRow && (
                          <Button size="icon" variant="ghost" onClick={() => desvincular.mutate(v.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {dept && <Badge variant="outline" className="text-xs">{DEPT_LABEL[dept] ?? dept}</Badge>}
                      {regime && <Badge variant={REGIME_VARIANT[regime.tipo] ?? "outline"} className="text-xs">{REGIME_LABEL[regime.tipo] ?? regime.tipo}</Badge>}
                      {v.pessoa?.user_id
                        ? <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">Ativo</Badge>
                        : <Badge variant="outline" className="text-xs text-muted-foreground">Sem acesso</Badge>}
                      <span className="text-xs text-muted-foreground">{formatBRL(v.valor_contratacao)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: tabela */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função no projeto</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Contratação</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vinculos.map((v: any) => {
                  const dept = getPrincipalDept(v);
                  const funcaoNome = getPrincipalFuncao(v);
                  const todasFuncoes: any[] = v.funcoes ?? [];
                  const regime = (regimes ?? []).find((r: any) => r.pessoa_id === v.pessoa?.id);
                  const isOwnerRow = ownerEmail ? v.pessoa?.email?.toLowerCase() === ownerEmail : false;
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.pessoa?.nome ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span>{funcaoNome ?? v.papel_descricao ?? "—"}</span>
                          {todasFuncoes.length > 1 && (
                            <Badge variant="outline" className="text-xs">+{todasFuncoes.length - 1}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {dept ? <Badge variant="outline">{DEPT_LABEL[dept] ?? dept}</Badge> : "—"}
                      </TableCell>
                      <TableCell>
                        {regime ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant={REGIME_VARIANT[regime.tipo] ?? "outline"}>{REGIME_LABEL[regime.tipo] ?? regime.tipo}</Badge>
                            {regime.tipo === "rpa" && regime.valor_liquido > 0 && (
                              <span className="text-xs text-muted-foreground">{formatBRL(regime.valor_liquido)} liq.</span>
                            )}
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={() => setOpenRegime(v.pessoa?.id)}>+ Regime</Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {v.pessoa?.user_id
                          ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">Ativo</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Sem acesso</Badge>}
                      </TableCell>
                      <TableCell>{v.pessoa?.telefone ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatBRL(v.valor_contratacao)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {regime && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpenRegime(v.pessoa?.id)} title="Editar regime">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Documentos" onClick={() => {
                            setOpenDocs(v.pessoa?.id ?? null);
                            setDocsData(v.pessoa?.documentos ?? {});
                            setPendingDocs({});
                          }}>
                            <FolderOpen className="h-3.5 w-3.5" />
                          </Button>
                          <InviteButton projetoPessoaId={v.id} pessoaEmail={v.pessoa?.email} pessoaNome={v.pessoa?.nome} pessoaTelefone={v.pessoa?.telefone} />
                          {canEditEquipe && !isOwnerRow && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar membro" onClick={() => openEdit(v)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canRemoverEquipe && !isOwnerRow && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => desvincular.mutate(v.id)}
                              title="Remover do projeto (mantém no catálogo)"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Documentos da pessoa */}
      <Dialog open={!!openDocs} onOpenChange={(v) => { if (!v) { setOpenDocs(null); setDocsData({}); setPendingDocs({}); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {openDocs && (() => {
            const pessoa = vinculos?.find((v: any) => v.pessoa?.id === openDocs)?.pessoa;
            const DOC_TIPOS = [
              { key: "foto_url",                   label: "Foto (perfil)",           accept: "image/*" },
              { key: "rg_url",                     label: "RG",                      accept: ".pdf,image/*" },
              { key: "cpf_url",                    label: "CPF",                     accept: ".pdf,image/*" },
              { key: "cnpj_url",                   label: "Cartão CNPJ",             accept: ".pdf,image/*" },
              { key: "comprovante_residencia_url",  label: "Comprovante de residência", accept: ".pdf,image/*" },
              { key: "comprovante_bancario_url",    label: "Comprovante bancário",    accept: ".pdf,image/*" },
            ];
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Documentos — {pessoa?.nome}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {DOC_TIPOS.map(({ key, label, accept }) => {
                    const existing = key === "foto_url" ? pessoa?.foto_url : docsData[key];
                    const pending = pendingDocs[key];
                    return (
                      <div key={key} className="space-y-1.5">
                        <Label>{label}</Label>
                        <div className="flex items-center gap-2 flex-wrap">
                          <input type="file" accept={accept} className="text-sm"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) setPendingDocs((prev) => ({ ...prev, [key]: f }));
                            }} />
                          {pending && <span className="text-xs text-emerald-600">{pending.name}</span>}
                          {!pending && existing && (
                            <Button size="sm" variant="outline" onClick={() => verDoc(existing)}>Ver</Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setOpenDocs(null); setDocsData({}); setPendingDocs({}); }}>Cancelar</Button>
                  <Button onClick={() => salvarDocs.mutate(openDocs)} disabled={salvarDocs.isPending}>
                    {salvarDocs.isPending ? "Salvando..." : "Salvar documentos"}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog: Regime de contratação */}
      <Dialog open={!!openRegime} onOpenChange={(v) => { if (!v) setOpenRegime(null); }}>
        <DialogContent>
          {openRegime && (() => {
            const pessoaRegime = (regimes ?? []).find((r: any) => r.pessoa_id === openRegime);
            const pessoa = vinculos?.find((v: any) => v.pessoa?.id === openRegime)?.pessoa;
            return (
              <form
                onSubmit={(e) => { e.preventDefault(); salvarRegime.mutate(new FormData(e.currentTarget)); }}
                className="space-y-4"
                autoComplete="off"
              >
                <DialogHeader>
                  <DialogTitle>Regime de contratação — {pessoa?.nome}</DialogTitle>
                </DialogHeader>
                <input type="hidden" name="_pessoa_id" value={openRegime} />
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Tipo de contrato</Label>
                    <Select name="tipo" defaultValue={pessoaRegime?.tipo ?? "rpa"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rpa">RPA — Recibo de Pagamento Autônomo</SelectItem>
                        <SelectItem value="clt">CLT — Contrato com carteira</SelectItem>
                        <SelectItem value="mei">MEI</SelectItem>
                        <SelectItem value="pj">PJ — Pessoa Jurídica</SelectItem>
                        <SelectItem value="diarista">Diarista</SelectItem>
                        <SelectItem value="voluntario">Voluntário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="r_bruto">Valor bruto (R$)</Label>
                      <Input id="r_bruto" name="valor_bruto" type="number" step="0.01" defaultValue={pessoaRegime?.valor_bruto ?? 0} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="r_dias">Dias de contrato</Label>
                      <Input id="r_dias" name="dias_contrato" type="number" min="1" defaultValue={pessoaRegime?.dias_contrato ?? 1} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r_inss">INSS % (RPA, padrão 20)</Label>
                    <Input id="r_inss" name="inss_pct" type="number" step="0.1" min="0" max="100"
                      defaultValue={pessoaRegime?.dados_rpa?.inss_pct != null
                        ? Number(pessoaRegime.dados_rpa.inss_pct) * 100
                        : 20} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r_obs">Observação</Label>
                    <Input id="r_obs" name="observacao" defaultValue={pessoaRegime?.dados_rpa?.observacao ?? ""} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpenRegime(null)}>Cancelar</Button>
                  <Button type="submit" disabled={salvarRegime.isPending}>
                    {salvarRegime.isPending ? "Salvando..." : "Salvar regime"}
                  </Button>
                </DialogFooter>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar membro */}
      <Dialog open={!!editVinculo} onOpenChange={(v) => { if (!v) setEditVinculo(null); }}>
        <DialogContent className="flex flex-col max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle>Editar membro — {editVinculo?.pessoa?.nome}</DialogTitle>
          </DialogHeader>
          {editVinculo && (
            <form
              key={editVinculo.id}
              onSubmit={(e) => { e.preventDefault(); atualizarVinculo.mutate(new FormData(e.currentTarget)); }}
              className="flex flex-col flex-1 min-h-0"
              autoComplete="off"
            >
              <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_nome">Nome completo</Label>
                  <Input id="edit_nome" name="nome" required defaultValue={editVinculo.pessoa?.nome ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit_email">E-mail</Label>
                  <Input id="edit_email" name="email" type="email" placeholder="nome@exemplo.com" defaultValue={editVinculo.pessoa?.email ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Departamento</Label>
                  <Select value={editDept} onValueChange={(v) => { setEditDept(v); setEditFuncoes([]); setEditPrincipal(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTAMENTOS_AV.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FuncoesProjetoSelect
                  funcoes={funcoesAvFiltEdit}
                  selected={editFuncoes}
                  principal={editPrincipal}
                  onToggle={(id) => toggleFuncao(id, editFuncoes, setEditFuncoes, editPrincipal, setEditPrincipal)}
                  onSetPrincipal={setEditPrincipal}
                  deptSelecionado={!!editDept}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_tel">Telefone (com DDD)</Label>
                    <Input id="edit_tel" name="telefone" placeholder="(81) 9 9999-9999" defaultValue={editVinculo.pessoa?.telefone ?? ""} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_valor">Valor de contratação (R$)</Label>
                    <Input id="edit_valor" name="valor_contratacao" type="number" step="0.01" defaultValue={editVinculo.valor_contratacao ?? 0} />
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 py-3 border-t shrink-0">
                <Button type="button" variant="outline" onClick={() => setEditVinculo(null)}>Cancelar</Button>
                <Button type="submit" disabled={atualizarVinculo.isPending}>
                  {atualizarVinculo.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
