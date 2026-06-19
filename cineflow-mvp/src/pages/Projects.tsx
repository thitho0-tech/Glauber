import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderKanban, Plus } from "lucide-react";
import { useOrgs } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { formatBRL } from "@/lib/utils";
import { toast } from "sonner";
import { EquipePrincipalImport } from "@/components/EquipePrincipalImport";
import type { TeamRow } from "@/lib/parseTeamCsv";

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

export default function Projects() {
  const [open, setOpen] = useState(false);
  const [equipe, setEquipe] = useState<TeamRow[]>([]);
  // Owner function selection (3A.4)
  const [ownerDept, setOwnerDept] = useState("");
  const [ownerFuncaoId, setOwnerFuncaoId] = useState("");
  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const orgId = orgs?.[0]?.org.id;
  const qc = useQueryClient();

  const { data: projetos, isLoading } = useQuery({
    queryKey: ["projetos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projetos").select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: editais } = useQuery({
    queryKey: ["editais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("editais").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: funcoesAv } = useQuery({
    queryKey: ["funcoes-av"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcoes_av")
        .select("id, nome, departamento")
        .order("departamento")
        .order("nivel");
      if (error) throw error;
      return data ?? [];
    },
  });

  const funcoesOwner = (funcoesAv ?? []).filter(
    (f: any) => !ownerDept || f.departamento === ownerDept
  );

  const criar = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("Produtora não encontrada");
      const projeto = {
        nome: String(form.get("nome") ?? "").trim(),
        tipo: String(form.get("tipo") ?? "curta"),
        edital_id: form.get("edital_id") ? String(form.get("edital_id")) : null,
        periodo_inicio: form.get("periodo_inicio") || null,
        periodo_fim: form.get("periodo_fim") || null,
        orcamento_total: Number(form.get("orcamento_total") ?? 0),
      };
      if (!projeto.nome) throw new Error("Informe o nome do projeto");

      const equipeLimpa = equipe
        .map((r) => ({
          nome: r.nome.trim(),
          email: (r.email ?? "").trim().toLowerCase(),
          funcao: (r.funcao ?? "").trim(),
          convidar: !!r.convidar,
        }))
        .filter((r) => r.nome);

      const { data, error } = await supabase.rpc("criar_projeto_com_equipe", {
        p_payload: { projeto, equipe: equipeLimpa },
      });
      if (error) throw error;
      const res = data as { projeto_id: string; pessoas_criadas: number; convites_enviados: number };

      // Insert owner's chosen function into projeto_pessoa_funcoes (3A.4)
      if (ownerFuncaoId && res?.projeto_id) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.email) {
          const { data: pps } = await supabase
            .from("projeto_pessoas")
            .select("id, pessoa:pessoas!inner(email)")
            .eq("projeto_id", res.projeto_id);
          const ownerPP = (pps as any[] ?? []).find((p: any) =>
            p.pessoa?.email?.toLowerCase() === authUser.email!.toLowerCase()
          );
          if (ownerPP) {
            await supabase.from("projeto_pessoa_funcoes").insert({
              projeto_pessoa_id: ownerPP.id,
              funcao_av_id: ownerFuncaoId,
              principal: true,
            });
          }
        }
      }

      return res;
    },
    onSuccess: (res) => {
      const partes: string[] = ["Projeto criado"];
      if (res?.pessoas_criadas) partes.push(res.pessoas_criadas + " pessoa(s) cadastrada(s)");
      if (res?.convites_enviados) partes.push(res.convites_enviados + " convite(s) enviado(s)");
      toast.success(partes.join(" · "));
      qc.invalidateQueries({ queryKey: ["projetos"] });
      setOpen(false);
      setEquipe([]);
      setOwnerDept("");
      setOwnerFuncaoId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projetos</h1>
          <p className="text-sm text-muted-foreground">Gerencie todos os projetos da sua produtora</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEquipe([]); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Novo projeto</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                criar.mutate(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>Novo projeto</DialogTitle>
                <DialogDescription>Preencha os dados básicos. Você pode editar tudo depois.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome do projeto</Label>
                  <Input id="nome" name="nome" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select name="tipo" defaultValue="curta">
                      <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="curta">Curta-metragem</SelectItem>
                        <SelectItem value="longa">Longa-metragem</SelectItem>
                        <SelectItem value="serie">Série</SelectItem>
                        <SelectItem value="documentario">Documentário</SelectItem>
                        <SelectItem value="publicidade">Publicidade</SelectItem>
                        <SelectItem value="clipe">Videoclipe</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="orcamento_total">Orçamento total (R$)</Label>
                    <Input id="orcamento_total" name="orcamento_total" type="number" step="0.01" defaultValue="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="periodo_inicio">Início</Label>
                    <Input id="periodo_inicio" name="periodo_inicio" type="date" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="periodo_fim">Fim</Label>
                    <Input id="periodo_fim" name="periodo_fim" type="date" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edital_id">Edital vinculado (opcional)</Label>
                  <Select name="edital_id">
                    <SelectTrigger id="edital_id"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      {(editais ?? []).map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Função inicial do owner — 3A.4 */}
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Sua função no projeto</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Departamento</Label>
                      <Select value={ownerDept} onValueChange={(v) => { setOwnerDept(v); setOwnerFuncaoId(""); }}>
                        <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
                        <SelectContent>
                          {DEPARTAMENTOS_AV.map((d) => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Função (organograma)</Label>
                      <Select value={ownerFuncaoId} onValueChange={setOwnerFuncaoId} disabled={!ownerDept}>
                        <SelectTrigger><SelectValue placeholder={ownerDept ? "Selecione" : "Escolha o depto antes"} /></SelectTrigger>
                        <SelectContent>
                          {funcoesOwner.map((f: any) => (
                            <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <EquipePrincipalImport rows={equipe} onChange={setEquipe} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={criar.isPending}>
                  {criar.isPending ? "Criando..." : "Criar projeto"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!projetos?.length ? (
        <Empty
          icon={<FolderKanban className="h-5 w-5" />}
          title="Nenhum projeto ainda"
          description="Crie seu primeiro projeto. Você pode vincular a um edital (Funcultura, LPG) ou deixar livre."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Criar projeto</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projetos.map((p: any) => (
            <Link key={p.id} to={"/projetos/" + p.id}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold leading-tight">{p.nome}</h3>
                    <Badge variant="outline">{p.tipo}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Status: <span className="font-medium text-foreground">{p.status.replace("_", " ")}</span></p>
                  <p className="text-lg font-bold text-primary">{formatBRL(p.orcamento_total)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
