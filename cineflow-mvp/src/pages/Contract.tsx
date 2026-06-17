import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loading } from "@/components/ui/loading";
import { ChevronLeft, FileSignature, ExternalLink, Lock } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

type Contrato = {
  id: string;
  projeto_id: string;
  numero: string | null;
  objeto: string | null;
  valor: number | null;
  data_assinatura: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  status: "rascunho" | "vigente" | "encerrado" | "cancelado";
  arquivo_url: string | null;
  observacoes: string | null;
};

const STATUS_OPTS: Array<Contrato["status"]> = ["rascunho", "vigente", "encerrado", "cancelado"];

export default function Contract() {
  const { id: projetoId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<Contrato>>({});

  const { can, isLoading: permsLoading } = usePermissions(projetoId);
  const canVer = can('contratos', 'ver');
  const canEdit = can('contratos', 'editar');

  const { data: projeto } = useQuery({
    queryKey: ["projeto-min", projetoId],
    enabled: !!projetoId && canVer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, nome, orcamento_total")
        .eq("id", projetoId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: contrato, isLoading } = useQuery({
    queryKey: ["contrato", projetoId],
    enabled: !!projetoId && canVer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("projeto_id", projetoId!)
        .maybeSingle();
      if (error) throw error;
      return data as Contrato | null;
    },
  });

  useEffect(() => {
    if (contrato) setForm(contrato);
    else setForm({ status: "rascunho" });
  }, [contrato]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        projeto_id: projetoId!,
        numero: form.numero ?? null,
        objeto: form.objeto ?? null,
        valor: form.valor != null && form.valor !== ("" as unknown as number) ? Number(form.valor) : null,
        data_assinatura: form.data_assinatura || null,
        vigencia_inicio: form.vigencia_inicio || null,
        vigencia_fim: form.vigencia_fim || null,
        status: (form.status ?? "rascunho") as Contrato["status"],
        arquivo_url: form.arquivo_url ?? null,
        observacoes: form.observacoes ?? null,
      };
      if (contrato?.id) {
        const { error } = await supabase.from("contratos").update(payload).eq("id", contrato.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contratos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Contrato salvo");
      qc.invalidateQueries({ queryKey: ["contrato", projetoId] });
      navigate(`/projetos/${projetoId}/dashboard`);
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
      <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FileSignature className="h-6 w-6" /> Contrato
        </h1>
        <p className="text-sm text-muted-foreground">{projeto?.nome}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canEdit && (
            <p className="text-xs text-muted-foreground">Somente leitura — você não tem permissão para editar este contrato.</p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="numero">Número</Label>
              <Input id="numero" value={form.numero ?? ""} onChange={(e) => setForm({ ...form, numero: e.target.value })} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.status ?? "rascunho"}
                onChange={(e) => setForm({ ...form, status: e.target.value as Contrato["status"] })}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canEdit}
              >
                {STATUS_OPTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="objeto">Objeto</Label>
            <Textarea id="objeto" value={form.objeto ?? ""} onChange={(e) => setForm({ ...form, objeto: e.target.value })} rows={2} disabled={!canEdit} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input id="valor" type="number" step="0.01" value={form.valor ?? ""} onChange={(e) => setForm({ ...form, valor: e.target.value as unknown as number })} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataAss">Data de assinatura</Label>
              <Input id="dataAss" type="date" value={form.data_assinatura ?? ""} onChange={(e) => setForm({ ...form, data_assinatura: e.target.value })} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vigFim">Vigência até</Label>
              <Input id="vigFim" type="date" value={form.vigencia_fim ?? ""} onChange={(e) => setForm({ ...form, vigencia_fim: e.target.value })} disabled={!canEdit} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="arq">URL do arquivo PDF</Label>
            <div className="flex gap-2">
              <Input id="arq" placeholder="https://..." value={form.arquivo_url ?? ""} onChange={(e) => setForm({ ...form, arquivo_url: e.target.value })} disabled={!canEdit} />
              {form.arquivo_url ? (
                <a href={form.arquivo_url} target="_blank" rel="noreferrer">
                  <Button type="button" variant="outline" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                </a>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações</Label>
            <Textarea id="obs" value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} disabled={!canEdit} />
          </div>

          {canEdit && (
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando..." : contrato ? "Atualizar contrato" : "Criar contrato"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
