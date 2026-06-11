import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOrgs } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { useProjectRole } from "@/hooks/useProjectRole";
import { Shield, Users, Bell, Trash2, FolderKanban, User, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { formatBRL } from "@/lib/utils";

// ─────────────────────────────────────────────
// Constantes compartilhadas
// ─────────────────────────────────────────────

const PAPEIS = [
  { value: "owner",        label: "Owner",        desc: "Todos os direitos (criador do projeto)" },
  { value: "admin",        label: "Admin",         desc: "Tudo exceto excluir projeto" },
  { value: "producao",     label: "Produção",      desc: "Edita cronograma, OD, financeiro, equipe" },
  { value: "departamento", label: "Departamento",  desc: "Edita apenas seu departamento" },
  { value: "leitor",       label: "Leitor",        desc: "Somente leitura" },
];

const TIPOS_PROJETO = [
  { value: "curta",        label: "Curta-metragem" },
  { value: "longa",        label: "Longa-metragem" },
  { value: "serie",        label: "Série" },
  { value: "documentario", label: "Documentário" },
  { value: "publicidade",  label: "Publicidade" },
  { value: "clipe",        label: "Videoclipe" },
  { value: "outro",        label: "Outro" },
];

const STATUS_PROJETO = [
  { value: "em_desenvolvimento", label: "Em desenvolvimento" },
  { value: "pre_producao",       label: "Pré-produção" },
  { value: "producao",           label: "Produção" },
  { value: "pos_producao",       label: "Pós-produção" },
  { value: "concluido",          label: "Concluído" },
  { value: "cancelado",          label: "Cancelado" },
];

// ─────────────────────────────────────────────
// AutorizacoesPanel — aceita projetoId externo
// ─────────────────────────────────────────────

type ProjetoMin = { id: string; nome: string; criado_por: string };
type Membro = {
  id: string;
  papel_projeto: string | null;
  pessoa: { nome: string; email: string | null };
  funcao_av: { nome: string; departamento: string } | null;
};

function AutorizacoesPanel({
  orgId,
  userId,
  projetoId: externalProjetoId,
}: {
  orgId: string;
  userId: string;
  projetoId?: string;
}) {
  const qc = useQueryClient();
  const [localProjetoId, setLocalProjetoId] = useState<string>("");
  const projetoSel = externalProjetoId ?? localProjetoId;

  const { data: projetos, isLoading: lp } = useQuery({
    queryKey: ["projetos-min-rbac", orgId],
    enabled: !!orgId && !externalProjetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, nome, criado_por")
        .eq("org_id", orgId)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as ProjetoMin[];
    },
  });

  const { data: membros } = useQuery({
    queryKey: ["membros-rbac", projetoSel],
    enabled: !!projetoSel,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select("id, papel_projeto, pessoa:pessoas(nome, email), funcao_av:funcoes_av(nome, departamento)")
        .eq("projeto_id", projetoSel);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        papel_projeto: r.papel_projeto,
        pessoa: { nome: r.pessoa?.nome ?? "—", email: r.pessoa?.email ?? null },
        funcao_av: r.funcao_av ? { nome: r.funcao_av.nome, departamento: r.funcao_av.departamento } : null,
      })) as Membro[];
    },
  });

  const atualizarPapel = useMutation({
    mutationFn: async ({ ppId, papel }: { ppId: string; papel: string }) => {
      const { error } = await supabase
        .from("projeto_pessoas")
        .update({ papel_projeto: papel || null })
        .eq("id", ppId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel atualizado");
      qc.invalidateQueries({ queryKey: ["membros-rbac", projetoSel] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (lp) return <Loading />;

  const projetoAtual = (projetos ?? []).find((p) => p.id === projetoSel);
  const ehDono = projetoAtual?.criado_por === userId;

  return (
    <div className="space-y-4">
      {/* Seletor de projeto — só exibido quando sem projetoId externo */}
      {!externalProjetoId && (
        <div className="space-y-1.5">
          <Label>Projeto</Label>
          <select
            value={localProjetoId}
            onChange={(e) => setLocalProjetoId(e.target.value)}
            className="h-10 w-full max-w-md rounded-md border bg-background px-3 text-sm"
          >
            <option value="">escolher projeto</option>
            {(projetos ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          {projetoSel && !ehDono && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Você não é o criador deste projeto. Mudanças podem ser bloqueadas pela RLS.
            </p>
          )}
        </div>
      )}

      {projetoSel && membros && (
        <div className="space-y-2">
          {membros.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem membros vinculados. Cadastre em Equipe.</p>
          ) : (
            membros.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{m.pessoa.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.pessoa.email ?? "sem e-mail"}
                    {m.funcao_av && ` · ${m.funcao_av.nome} (${m.funcao_av.departamento})`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={m.papel_projeto ?? ""}
                    onChange={(e) => atualizarPapel.mutate({ ppId: m.id, papel: e.target.value })}
                    className="h-9 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="">sem papel</option>
                    {PAPEIS.filter((p) => p.value !== "owner").map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  {m.papel_projeto && <Badge variant="outline">{m.papel_projeto}</Badge>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Legenda de papéis</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {PAPEIS.map((p) => (
            <div key={p.value} className="flex items-start gap-2">
              <Badge variant="outline" className="min-w-[110px] justify-center shrink-0">{p.label}</Badge>
              <span className="text-muted-foreground">{p.desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// NotificacoesPanel
// ─────────────────────────────────────────────

function NotificacoesPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [projetoSel, setProjetoSel] = useState<string>("");
  const { data: orgs } = useOrgs(userId);
  const orgId = orgs?.[0]?.org.id;

  const { data: projetos } = useQuery({
    queryKey: ["projetos-notif", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, nome")
        .eq("org_id", orgId!)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: meuVinculo } = useQuery({
    queryKey: ["meu-vinculo-notif", projetoSel, userId],
    enabled: !!projetoSel && !!userId,
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) return null;
      const { data: pps } = await supabase
        .from("projeto_pessoas")
        .select("id, notif_od_inapp, notif_od_email, pessoa:pessoas!inner(email)")
        .eq("projeto_id", projetoSel)
        .is("deleted_at", null);
      if (!pps) return null;
      return (pps as any[]).find(
        (p) => p.pessoa?.email?.toLowerCase() === authUser.email!.toLowerCase()
      ) ?? null;
    },
  });

  const salvar = useMutation({
    mutationFn: async ({ campo, valor }: { campo: string; valor: boolean }) => {
      if (!meuVinculo?.id) throw new Error("Você não é membro deste projeto");
      const { error } = await supabase
        .from("projeto_pessoas")
        .update({ [campo]: valor })
        .eq("id", meuVinculo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferência salva");
      qc.invalidateQueries({ queryKey: ["meu-vinculo-notif", projetoSel, userId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notificações por projeto</CardTitle>
        <CardDescription>
          Escolha como quer ser avisado quando uma Ordem do Dia for publicada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Projeto</Label>
          <select
            value={projetoSel}
            onChange={(e) => setProjetoSel(e.target.value)}
            className="h-10 w-full max-w-md rounded-md border bg-background px-3 text-sm"
          >
            <option value="">escolher projeto</option>
            {(projetos ?? []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        {projetoSel && !meuVinculo && (
          <p className="text-sm text-muted-foreground">Você não é membro deste projeto.</p>
        )}

        {projetoSel && meuVinculo && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Sino in-app</p>
                <p className="text-xs text-muted-foreground">Aparece no sino no topo quando uma OD for publicada.</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 cursor-pointer accent-primary"
                checked={meuVinculo.notif_od_inapp ?? true}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => salvar.mutate({ campo: "notif_od_inapp", valor: e.target.checked })}
                disabled={salvar.isPending}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">E-mail</p>
                <p className="text-xs text-muted-foreground">Requer configuração de e-mail no painel de deploy.</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 cursor-pointer accent-primary"
                checked={meuVinculo.notif_od_email ?? false}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => salvar.mutate({ campo: "notif_od_email", valor: e.target.checked })}
                disabled={salvar.isPending}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// ProjetoDadosForm — editar dados do projeto
// ─────────────────────────────────────────────

function ProjetoDadosForm({ projetoId, canEdit }: { projetoId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openDelete, setOpenDelete] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState<string | null>(null);
  const [codigoInput, setCodigoInput] = useState("");

  const { data: projeto, isLoading } = useQuery({
    queryKey: ["projeto-dados-edit", projetoId],
    enabled: !!projetoId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, nome, tipo, periodo_inicio, periodo_fim, orcamento_total, edital_id, status, criado_por")
        .eq("id", projetoId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: editais } = useQuery({
    queryKey: ["editais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("editais").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const salvar = useMutation({
    mutationFn: async (form: FormData) => {
      const payload: any = {
        nome: String(form.get("nome") ?? "").trim(),
        tipo: form.get("tipo") || null,
        periodo_inicio: form.get("periodo_inicio") || null,
        periodo_fim: form.get("periodo_fim") || null,
        orcamento_total: Number(form.get("orcamento_total") ?? 0),
        edital_id: form.get("edital_id") === "__none__" ? null : (form.get("edital_id") || null),
        status: form.get("status") || null,
      };
      if (!payload.nome) throw new Error("Informe o nome do projeto");
      const { error } = await supabase.from("projetos").update(payload).eq("id", projetoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto atualizado");
      qc.invalidateQueries({ queryKey: ["projeto-dados-edit", projetoId] });
      qc.invalidateQueries({ queryKey: ["projetos"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isCriador = !!user?.id && (projeto as any)?.criado_por === user.id;

  const pedirCodigo = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("request_delete_project", { p_projeto_id: projetoId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (resultado) => {
      setCodigoEnviado(resultado);
      toast.success(resultado === "enviado" ? "Código enviado para seu e-mail." : "Código gerado. Confirme abaixo.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const confirmarExclusao = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("confirm_delete_project", { p_projeto_id: projetoId, p_codigo: codigoInput });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto excluído");
      setOpenDelete(false);
      navigate("/projetos");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;
  if (!projeto) return null;

  if (!canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" /> Dados do projeto
          </CardTitle>
          <CardDescription>Somente leitura — você não tem permissão para editar este projeto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{projeto.nome}</span></div>
            <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{projeto.tipo}</span></div>
            <div><span className="text-muted-foreground">Início:</span> <span className="font-medium">{projeto.periodo_inicio ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Fim:</span> <span className="font-medium">{projeto.periodo_fim ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Orçamento:</span> <span className="font-medium">{formatBRL(projeto.orcamento_total ?? 0)}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{projeto.status ?? "—"}</span></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4" /> Dados do projeto
        </CardTitle>
        <CardDescription>
          Nome, tipo, período e orçamento. Alterações salvas imediatamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          key={projeto.id}
          onSubmit={(e) => { e.preventDefault(); salvar.mutate(new FormData(e.currentTarget)); }}
          className="space-y-4"
          autoComplete="off"
        >
          <div className="space-y-1.5">
            <Label htmlFor="proj_nome">Nome do projeto</Label>
            <Input id="proj_nome" name="nome" defaultValue={projeto.nome} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj_tipo">Tipo</Label>
              <Select name="tipo" defaultValue={projeto.tipo ?? "curta"}>
                <SelectTrigger id="proj_tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_PROJETO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj_status">Status</Label>
              <Select name="status" defaultValue={projeto.status ?? "em_desenvolvimento"}>
                <SelectTrigger id="proj_status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_PROJETO.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj_inicio">Início</Label>
              <Input id="proj_inicio" name="periodo_inicio" type="date" defaultValue={projeto.periodo_inicio ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj_fim">Fim</Label>
              <Input id="proj_fim" name="periodo_fim" type="date" defaultValue={projeto.periodo_fim ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj_orc">Orçamento total (R$)</Label>
              <Input id="proj_orc" name="orcamento_total" type="number" step="0.01" defaultValue={projeto.orcamento_total ?? 0} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj_edital">Edital vinculado</Label>
              <Select name="edital_id" defaultValue={projeto.edital_id ?? "__none__"}>
                <SelectTrigger id="proj_edital"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {(editais ?? []).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </CardContent>
    </Card>

    {isCriador && (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Zona de perigo
          </CardTitle>
          <CardDescription>
            Excluir o projeto é irreversível e exige confirmação por código.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => { setOpenDelete(true); setCodigoEnviado(null); setCodigoInput(""); }}
          >
            <Trash2 className="h-4 w-4 text-destructive" /> Excluir projeto
          </Button>
        </CardContent>
      </Card>
    )}

    <Dialog open={openDelete} onOpenChange={setOpenDelete}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Excluir projeto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">Esta ação é irreversível.</p>
            <p className="text-muted-foreground">
              Serão apagados: cronograma, escalas, ordens do dia, equipe vinculada ao projeto, orçamentos e despesas.
              O catálogo da produtora continua; locações deste projeto também são apagadas.
            </p>
          </div>
          {!codigoEnviado ? (
            <div className="space-y-3">
              <p className="text-sm">
                Para confirmar, vamos enviar um código de 6 dígitos para <strong>{user?.email}</strong>.
              </p>
              <Button onClick={() => pedirCodigo.mutate()} disabled={pedirCodigo.isPending}>
                {pedirCodigo.isPending ? "Enviando..." : "Enviar código por e-mail"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted p-3">
                {codigoEnviado === "enviado" ? (
                  <p className="text-sm">
                    Código enviado para <strong>{user?.email}</strong>. Confira a caixa de entrada (e spam) e digite abaixo.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Modo provisório: o código aparece aqui.</p>
                    <p className="mt-2 text-center font-mono text-2xl tracking-widest">{codigoEnviado}</p>
                  </>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="del_codigo">Digite o código para confirmar</Label>
                <Input
                  id="del_codigo"
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-widest"
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpenDelete(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={!codigoEnviado || codigoInput.length !== 6 || confirmarExclusao.isPending}
            onClick={() => confirmarExclusao.mutate()}
          >
            {confirmarExclusao.isPending ? "Excluindo..." : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// GestaoProjetoPanel — seletor único + dados + RBAC
// ─────────────────────────────────────────────

function GestaoProjetoPanel({ orgId, userId }: { orgId: string; userId: string }) {
  const [projetoSel, setProjetoSel] = useState<string>("");
  const { canEdit, isLoading: roleLoading } = useProjectRole(projetoSel);

  const { data: projetos, isLoading: lp } = useQuery({
    queryKey: ["projetos-gestao", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, nome")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (lp) return <Loading />;

  return (
    <div className="space-y-4">
      {/* Seletor de projeto */}
      <div className="space-y-1.5">
        <Label>Projeto</Label>
        <select
          value={projetoSel}
          onChange={(e) => setProjetoSel(e.target.value)}
          className="h-10 w-full max-w-md rounded-md border bg-background px-3 text-sm"
        >
          <option value="">escolher projeto</option>
          {(projetos ?? []).map((p: any) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>

      {!projetoSel && (
        <p className="text-sm text-muted-foreground">Selecione um projeto para gerenciá-lo.</p>
      )}

      {projetoSel && roleLoading && <Loading />}

      {projetoSel && !roleLoading && (
        <>
          {/* Dados do projeto */}
          <ProjetoDadosForm projetoId={projetoSel} canEdit={canEdit} />

          {/* Autorizações RBAC */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Autorizações por projeto
              </CardTitle>
              <CardDescription>
                Defina o papel de cada membro. Controla o que cada um pode ver e editar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AutorizacoesPanel orgId={orgId} userId={userId} projetoId={projetoSel} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Settings — componente principal
// ─────────────────────────────────────────────

export default function Settings() {
  const { user } = useAuth();
  const { data: orgs, isLoading } = useOrgs(user?.id);
  const org = orgs?.[0]?.org;
  const orgId = org?.id;
  const qc = useQueryClient();

  const salvarOrg = useMutation({
    mutationFn: async (form: FormData) => {
      if (!org?.id) throw new Error("Sem produtora");
      const { error } = await supabase.from("orgs").update({
        nome: form.get("nome"),
        cnpj: form.get("cnpj") || null,
      }).eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Produtora atualizada"); qc.invalidateQueries({ queryKey: ["orgs"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const salvarPessoal = useMutation({
    mutationFn: async (form: FormData) => {
      const nome_completo = String(form.get("nome_completo") ?? "");
      const telefone = String(form.get("telefone") ?? "");
      const cargo = String(form.get("cargo") ?? "");
      const { error } = await supabase.auth.updateUser({ data: { nome_completo, telefone, cargo } });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Dados pessoais atualizados"),
    onError: (e: any) => toast.error(e.message),
  });

  const trocarSenha = useMutation({
    mutationFn: async (form: FormData) => {
      const novaSenha = String(form.get("nova_senha") ?? "");
      if (novaSenha.length < 8) throw new Error("Senha precisa ter pelo menos 8 caracteres");
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Senha atualizada"),
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;

  const meta = (user?.user_metadata ?? {}) as Record<string, string>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Conta pessoal e gestão dos projetos.</p>
      </div>

      <Tabs defaultValue="conta">
        <TabsList>
          <TabsTrigger value="conta">Conta</TabsTrigger>
          <TabsTrigger value="projeto">Gestão do Projeto</TabsTrigger>
        </TabsList>

        {/* ══════════════ ABA CONTA ══════════════ */}
        <TabsContent value="conta" className="space-y-4 mt-4">

          {/* Dados pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" /> Dados pessoais
              </CardTitle>
              <CardDescription>Seu nome e contato aparecem nas Ordens do Dia em que você está escalado.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => { e.preventDefault(); salvarPessoal.mutate(new FormData(e.currentTarget)); }}
                className="space-y-4"
                autoComplete="off"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="nome_completo">Nome completo</Label>
                  <Input id="nome_completo" name="nome_completo" defaultValue={meta.nome_completo ?? ""} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" name="telefone" defaultValue={meta.telefone ?? ""} placeholder="(81) 9 9999-9999" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cargo">Cargo principal</Label>
                    <Input id="cargo" name="cargo" defaultValue={meta.cargo ?? ""} placeholder="Ex.: Produtora Executiva" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <p className="text-sm font-medium text-muted-foreground">{user?.email}</p>
                </div>
                <Button type="submit" disabled={salvarPessoal.isPending}>
                  {salvarPessoal.isPending ? "Salvando..." : "Salvar dados pessoais"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Conta / senha */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Segurança da conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Papel na produtora:</span> <Badge variant="outline" className="ml-1">{orgs?.[0]?.membership.papel ?? "—"}</Badge></p>
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); trocarSenha.mutate(new FormData(e.currentTarget)); (e.target as HTMLFormElement).reset(); }}
                className="space-y-3"
                autoComplete="off"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="nova_senha">Nova senha</Label>
                  <Input id="nova_senha" name="nova_senha" type="password" minLength={8} required placeholder="mínimo 8 caracteres" />
                </div>
                <Button type="submit" variant="outline" disabled={trocarSenha.isPending}>
                  {trocarSenha.isPending ? "Atualizando..." : "Alterar senha"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Produtora */}
          <Card>
            <CardHeader>
              <CardTitle>Produtora</CardTitle>
              <CardDescription>Estes dados aparecem no cabeçalho das Ordens do Dia e relatórios.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => { e.preventDefault(); salvarOrg.mutate(new FormData(e.currentTarget)); }}
                className="space-y-4"
                autoComplete="off"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="org_nome">Nome da produtora</Label>
                  <Input id="org_nome" name="nome" defaultValue={org?.nome ?? ""} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org_cnpj">CNPJ</Label>
                  <Input id="org_cnpj" name="cnpj" defaultValue={org?.cnpj ?? ""} placeholder="00.000.000/0000-00" />
                </div>
                <Button type="submit" disabled={salvarOrg.isPending}>
                  {salvarOrg.isPending ? "Salvando..." : "Salvar produtora"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Notificações */}
          <NotificacoesPanel userId={user?.id ?? ""} />

          {/* Lixeira */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Lixeira
              </CardTitle>
              <CardDescription>
                Itens excluídos ficam aqui por 30 dias. Você pode restaurar ou remover definitivamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to="/lixeira">
                  <Trash2 className="h-4 w-4 mr-2" /> Abrir lixeira
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════ ABA GESTÃO DO PROJETO ══════════════ */}
        <TabsContent value="projeto" className="mt-4">
          {orgId && user?.id ? (
            <GestaoProjetoPanel orgId={orgId} userId={user.id} />
          ) : (
            <Loading />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
