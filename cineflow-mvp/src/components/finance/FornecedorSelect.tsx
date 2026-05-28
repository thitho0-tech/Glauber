import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface FornecedorSelectProps {
  orgId: string;
  value?: string;
  onChange: (id: string | undefined) => void;
}

export function FornecedorSelect({ orgId, value, onChange }: FornecedorSelectProps) {
  const qc = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [busca, setBusca] = useState("");

  const { data: fornecedores } = useQuery({
    queryKey: ["fornecedores", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome, cnpj, cpf, tipo")
        .eq("org_id", orgId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const criarFornecedor = useMutation({
    mutationFn: async (form: FormData) => {
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
      };
      const { data, error } = await supabase.from("fornecedores").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (novo) => {
      toast.success("Fornecedor cadastrado");
      qc.invalidateQueries({ queryKey: ["fornecedores", orgId] });
      onChange(novo.id);
      setOpenDialog(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtrados = (fornecedores ?? []).filter((f) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return f.nome.toLowerCase().includes(q) || (f.cnpj ?? "").includes(busca) || (f.cpf ?? "").includes(busca);
  });

  const selecionado = (fornecedores ?? []).find((f) => f.id === value);

  return (
    <>
      <div className="space-y-1.5">
        <Label>Fornecedor</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por nome ou CNPJ..."
              value={selecionado ? selecionado.nome : busca}
              onChange={(e) => {
                setBusca(e.target.value);
                if (value) onChange(undefined);
              }}
            />
          </div>
          <Button type="button" size="icon" variant="outline" onClick={() => setOpenDialog(true)} title="Novo fornecedor">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {busca && !selecionado && filtrados.length > 0 && (
          <div className="rounded-md border bg-popover shadow-md">
            {filtrados.slice(0, 8).map((f) => (
              <button
                key={f.id}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted"
                onClick={() => { onChange(f.id); setBusca(""); }}
              >
                <span className="font-medium">{f.nome}</span>
                <span className="text-xs text-muted-foreground">{f.cnpj ?? f.cpf ?? f.tipo.toUpperCase()}</span>
              </button>
            ))}
          </div>
        )}

        {selecionado && (
          <p className="text-xs text-muted-foreground">
            {selecionado.cnpj ?? selecionado.cpf} · {selecionado.tipo.toUpperCase()}
            <button type="button" className="ml-2 text-destructive underline" onClick={() => onChange(undefined)}>remover</button>
          </p>
        )}
      </div>

      {/* Dialog: Novo fornecedor rápido */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <form onSubmit={(e) => { e.preventDefault(); criarFornecedor.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
            <DialogHeader><DialogTitle>Novo fornecedor</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fn_nome">Nome / Razão Social *</Label>
                <Input id="fn_nome" name="nome" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fn_tipo">Tipo</Label>
                <Select name="tipo" defaultValue="pj">
                  <SelectTrigger id="fn_tipo"><SelectValue /></SelectTrigger>
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
                  <Label htmlFor="fn_cnpj">CNPJ</Label>
                  <Input id="fn_cnpj" name="cnpj" placeholder="00.000.000/0001-00" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fn_cpf">CPF</Label>
                  <Input id="fn_cpf" name="cpf" placeholder="000.000.000-00" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fn_email">E-mail</Label>
                <Input id="fn_email" name="email" type="email" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={criarFornecedor.isPending}>
                {criarFornecedor.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
