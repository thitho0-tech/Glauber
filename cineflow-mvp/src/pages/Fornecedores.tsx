import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Building2, ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { useOrgs } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const TIPO_LABEL: Record<string, string> = {
  pj: "PJ",
  pf: "PF",
  mei: "MEI",
  outro: "Outro",
};

const TIPO_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  pj: "default",
  pf: "secondary",
  mei: "outline",
  outro: "outline",
};

export default function Fornecedores() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const orgId = orgs?.[0]?.org.id;
  const qc = useQueryClient();
  const [openCriar, setOpenCriar] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const { data: fornecedores, isLoading } = useQuery({
    queryKey: ["fornecedores", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("org_id", orgId!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const criar = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId) throw new Error("Produtora não encontrada");
      const cnpj = String(form.get("cnpj") ?? "").trim();
      const cpf = String(form.get("cpf") ?? "").trim();
      if (!cnpj && !cpf) throw new Error("Informe CNPJ ou CPF");
      const payload: any = {
        org_id: orgId,
        nome: form.get("nome"),
        cnpj: cnpj || null,
        cpf: cpf || null,
        tipo: form.get("tipo") || "pj",
        email: form.get("email") || null,
        telefone: form.get("telefone") || null,
        dados_bancarios: {
          banco: String(form.get("banco") ?? "") || undefined,
          agencia: String(form.get("agencia") ?? "") || undefined,
          conta: String(form.get("conta") ?? "") || undefined,
          chave_pix: String(form.get("chave_pix") ?? "") || undefined,
        },
      };
      const { error } = await supabase.from("fornecedores").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor cadastrado");
      qc.invalidateQueries({ queryKey: ["fornecedores", orgId] });
      setOpenCriar(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const atualizar = useMutation({
    mutationFn: async (form: FormData) => {
      const fid = String(form.get("_id"));
      const cnpj = String(form.get("cnpj") ?? "").trim();
      const cpf = String(form.get("cpf") ?? "").trim();
      if (!cnpj && !cpf) throw new Error("Informe CNPJ ou CPF");
      const payload: any = {
        nome: form.get("nome"),
        cnpj: cnpj || null,
        cpf: cpf || null,
        tipo: form.get("tipo"),
        email: form.get("email") || null,
        telefone: form.get("telefone") || null,
        dados_bancarios: {
          banco: String(form.get("banco") ?? "") || undefined,
          agencia: String(form.get("agencia") ?? "") || undefined,
          conta: String(form.get("conta") ?? "") || undefined,
          chave_pix: String(form.get("chave_pix") ?? "") || undefined,
        },
      };
      const { error } = await supabase.from("fornecedores").update(payload).eq("id", fid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor atualizado");
      qc.invalidateQueries({ queryKey: ["fornecedores", orgId] });
      setEditando(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const desativar = useMutation({
    mutationFn: async (fid: string) => {
      const { error } = await supabase.from("fornecedores").update({ ativo: false }).eq("id", fid);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor removido");
      qc.invalidateQueries({ queryKey: ["fornecedores", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;

  const lista = (fornecedores ?? []).filter((f) =>
    filtroTipo === "todos" ? true : f.tipo === filtroTipo
  );

  function FormFornecedor({ f, onSubmit, isPending }: { f?: any; onSubmit: (fd: FormData) => void; isPending: boolean }) {
    return (
      <div className="space-y-3">
        {f && <input type="hidden" name="_id" value={f.id} />}
        <div className="space-y-1.5">
          <Label htmlFor="f_nome">Nome / Razão Social *</Label>
          <Input id="f_nome" name="nome" required defaultValue={f?.nome} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f_tipo">Tipo</Label>
          <Select name="tipo" defaultValue={f?.tipo ?? "pj"}>
            <SelectTrigger id="f_tipo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pj">PJ — Pessoa Jurídica</SelectItem>
              <SelectItem value="pf">PF — Pessoa Física</SelectItem>
              <SelectItem value="mei">MEI</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="f_cnpj">CNPJ</Label>
            <Input id="f_cnpj" name="cnpj" placeholder="00.000.000/0001-00" defaultValue={f?.cnpj ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f_cpf">CPF</Label>
            <Input id="f_cpf" name="cpf" placeholder="000.000.000-00" defaultValue={f?.cpf ?? ""} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="f_email">E-mail</Label>
            <Input id="f_email" name="email" type="email" defaultValue={f?.email ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f_telefone">Telefone</Label>
            <Input id="f_telefone" name="telefone" defaultValue={f?.telefone ?? ""} />
          </div>
        </div>
        <p className="text-xs font-medium text-muted-foreground pt-1">Dados bancários (opcional)</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="f_banco">Banco</Label>
            <Input id="f_banco" name="banco" placeholder="Ex.: Nubank, Itaú" defaultValue={f?.dados_bancarios?.banco ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f_agencia">Agência</Label>
            <Input id="f_agencia" name="agencia" defaultValue={f?.dados_bancarios?.agencia ?? ""} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="f_conta">Conta</Label>
            <Input id="f_conta" name="conta" defaultValue={f?.dados_bancarios?.conta ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f_pix">Chave PIX</Label>
            <Input id="f_pix" name="chave_pix" defaultValue={f?.dados_bancarios?.chave_pix ?? ""} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/projetos/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
          </Link>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Cadastro de fornecedores e prestadores de serviço da produtora</p>
        </div>

        <Dialog open={openCriar} onOpenChange={setOpenCriar}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Novo fornecedor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form onSubmit={(e) => { e.preventDefault(); criar.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <DialogHeader><DialogTitle>Novo fornecedor</DialogTitle></DialogHeader>
              <FormFornecedor onSubmit={() => {}} isPending={criar.isPending} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCriar(false)}>Cancelar</Button>
                <Button type="submit" disabled={criar.isPending}>{criar.isPending ? "Salvando..." : "Cadastrar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtro por tipo */}
      <Tabs value={filtroTipo} onValueChange={setFiltroTipo}>
        <TabsList>
          <TabsTrigger value="todos">Todos ({(fornecedores ?? []).length})</TabsTrigger>
          <TabsTrigger value="pj">PJ</TabsTrigger>
          <TabsTrigger value="pf">PF</TabsTrigger>
          <TabsTrigger value="mei">MEI</TabsTrigger>
        </TabsList>
      </Tabs>

      {!lista.length ? (
        <Empty
          icon={<Building2 className="h-5 w-5" />}
          title="Sem fornecedores cadastrados"
          description="Cadastre empresas e prestadores para vincular às despesas."
          action={<Button onClick={() => setOpenCriar(true)}><Plus className="h-4 w-4" /> Novo fornecedor</Button>}
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>Fornecedores cadastrados</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ / CPF</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>PIX</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.cnpj ?? f.cpf ?? "—"}</TableCell>
                    <TableCell><Badge variant={TIPO_VARIANT[f.tipo] ?? "outline"}>{TIPO_LABEL[f.tipo] ?? f.tipo}</Badge></TableCell>
                    <TableCell className="text-sm">{f.email ?? "—"}</TableCell>
                    <TableCell className="text-sm">{f.dados_bancarios?.chave_pix ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditando(f)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { if (confirm(`Remover "${f.nome}"?`)) desativar.mutate(f.id); }}
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog de edição */}
      <Dialog open={!!editando} onOpenChange={(v) => { if (!v) setEditando(null); }}>
        <DialogContent className="max-w-lg">
          {editando && (
            <form onSubmit={(e) => { e.preventDefault(); atualizar.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <DialogHeader><DialogTitle>Editar fornecedor</DialogTitle></DialogHeader>
              <FormFornecedor f={editando} onSubmit={() => {}} isPending={atualizar.isPending} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
                <Button type="submit" disabled={atualizar.isPending}>{atualizar.isPending ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
