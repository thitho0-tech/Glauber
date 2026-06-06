import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrgs } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Users, Bell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const PAPEIS = [
  { value: "owner",        label: "Owner",        desc: "Todos os direitos (criador do projeto)" },
  { value: "admin",        label: "Admin",         desc: "Tudo exceto excluir projeto" },
  { value: "producao",     label: "Producao",      desc: "Edita cronograma, OD, financeiro, equipe" },
  { value: "departamento", label: "Departamento",  desc: "Edita apenas seu departamento" },
  { value: "leitor",       label: "Leitor",        desc: "Somente leitura" },
];

type ProjetoMin = { id: string; nome: string; criado_por: string };
type Membro = {
  id: string;
  papel_projeto: string | null;
  pessoa: { nome: string; email: string | null };
  funcao_av: { nome: string; departamento: string } | null;
};

function AutorizacoesPanel({ orgId, userId }: { orgId: string; userId: string }) {
  const qc = useQueryClient();
  const [projetoSel, setProjetoSel] = useState<string>("");

  const { data: projetos, isLoading: lp } = useQuery({
    queryKey: ["projetos-min-rbac", orgId],
    enabled: !!orgId,
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
  if (!projetos || projetos.length === 0) {
    return <Empty icon={<Shield className="h-5 w-5" />} title="Sem projetos" description="Crie um projeto para gerenciar papeis." />;
  }

  const projetoAtual = projetos.find((p) => p.id === projetoSel);
  const ehDono = projetoAtual?.criado_por === userId;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Projeto</Label>
        <select
          value={projetoSel}
          onChange={(e) => setProjetoSel(e.target.value)}
          className="h-10 w-full max-w-md rounded-md border bg-background px-3 text-sm"
        >
          <option value="">escolher projeto</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
        {projetoSel && !ehDono && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Voce nao e o criador deste projeto. Mudancas podem ser bloqueadas pela RLS.
          </p>
        )}
      </div>

      {projetoSel && membros && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Membros e papeis</CardTitle>
            <CardDescription>
              O <strong>owner</strong> e sempre o criador. Para os demais, escolha o nivel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membros.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem membros vinculados. Cadastre em Equipe.</p>
            ) : (
              <div className="space-y-2">
                {membros.map((m) => (
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Legenda</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {PAPEIS.map((p) => (
            <div key={p.value} className="flex items-start gap-2">
              <Badge variant="outline" className="min-w-[100px] justify-center">{p.label}</Badge>
              <span className="text-muted-foreground">{p.desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

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

  // Busca por email match — pessoas não tem user_id confiável (3A.5/04/15)
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
      if (!meuVinculo?.id) throw new Error("Voce nao e membro deste projeto");
      const { error } = await supabase
        .from("projeto_pessoas")
        .update({ [campo]: valor })
        .eq("id", meuVinculo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferencia salva");
      qc.invalidateQueries({ queryKey: ["meu-vinculo-notif", projetoSel, userId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notificacoes por projeto</CardTitle>
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
            <p className="text-sm text-muted-foreground">Voce nao e membro deste projeto.</p>
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
                  <p className="font-medium">E-mail (via Resend)</p>
                  <p className="text-xs text-muted-foreground">
                    Requer RESEND_API_KEY configurada no painel do Vercel.
                  </p>
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
    </div>
  );
}

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
    onSuccess: () => toast.success("Cadastro pessoal atualizado"),
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
        <h1 className="text-2xl font-bold">Configuracoes</h1>
        <p className="text-sm text-muted-foreground">Dados da produtora, conta e cadastro pessoal.</p>
      </div>

      <Tabs defaultValue="pessoal">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pessoal">Cadastro pessoal</TabsTrigger>
          <TabsTrigger value="produtora">Produtora</TabsTrigger>
          <TabsTrigger value="conta">Conta</TabsTrigger>
          <TabsTrigger value="autorizacoes">Autorizacoes</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificacoes</TabsTrigger>
          <TabsTrigger value="lixeira">Lixeira</TabsTrigger>
        </TabsList>

        <TabsContent value="pessoal">
          <Card>
            <CardHeader>
              <CardTitle>Cadastro pessoal</CardTitle>
              <CardDescription>Seus dados aparecem nas ordens do dia em que voce esta escalado.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); salvarPessoal.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
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
                <Button type="submit" disabled={salvarPessoal.isPending}>{salvarPessoal.isPending ? "Salvando..." : "Salvar"}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produtora">
          <Card>
            <CardHeader>
              <CardTitle>Produtora</CardTitle>
              <CardDescription>Estes dados aparecem no cabecalho de Ordens do Dia e relatorios.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); salvarOrg.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome da produtora</Label>
                  <Input id="nome" name="nome" defaultValue={org?.nome ?? ""} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" name="cnpj" defaultValue={org?.cnpj ?? ""} placeholder="00.000.000/0000-00" />
                </div>
                <Button type="submit" disabled={salvarOrg.isPending}>{salvarOrg.isPending ? "Salvando..." : "Salvar"}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conta">
          <Card>
            <CardHeader><CardTitle>Conta</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">E-mail:</span> <span className="font-medium">{user?.email}</span></p>
              <p><span className="text-muted-foreground">Papel na produtora:</span> <span className="font-medium">{orgs?.[0]?.membership.papel}</span></p>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Trocar senha</CardTitle>
              <CardDescription>Minimo 8 caracteres.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => { e.preventDefault(); trocarSenha.mutate(new FormData(e.currentTarget)); (e.target as HTMLFormElement).reset(); }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="nova_senha">Nova senha</Label>
                  <Input id="nova_senha" name="nova_senha" type="password" minLength={8} required />
                </div>
                <Button type="submit" disabled={trocarSenha.isPending}>{trocarSenha.isPending ? "Atualizando..." : "Atualizar senha"}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="autorizacoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Autorizacoes por projeto</CardTitle>
              <CardDescription>
                Defina o papel de cada membro. Controla o que cada um pode ver e editar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orgId && user?.id ? <AutorizacoesPanel orgId={orgId} userId={user.id} /> : <Loading />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <NotificacoesPanel userId={user?.id ?? ""} />
        </TabsContent>

        <TabsContent value="lixeira">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Lixeira
              </CardTitle>
              <CardDescription>
                Itens excluidos ficam aqui por 30 dias. Voce pode restaurar ou remover definitivamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/lixeira">
                  <Trash2 className="h-4 w-4 mr-2" /> Abrir lixeira
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
