import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Loading } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, ChevronLeft, Plus, Calendar } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

const TIPO_LABEL: Record<string, string> = {
  filmagem: "Filmagem",
  ensaio: "Ensaio",
  reuniao: "Reunião",
  pesquisa: "Pesquisa",
  outro: "Outro",
};

const TIPO_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
  filmagem: "default",
  ensaio: "secondary",
  reuniao: "outline",
  pesquisa: "outline",
  outro: "outline",
};

export default function CallSheets() {
  const { id: projetoId } = useParams<{ id: string }>();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<string>("filmagem");
  const qc = useQueryClient();

  const { data: ods, isLoading } = useQuery({
    queryKey: ["ods", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_do_dia")
        .select("id, titulo, tipo, data, versao, publicada_em, dia:dias_filmagem(data, chamada_geral, locacao:locacoes(nome))")
        .eq("projeto_id", projetoId!)
        .order("data", { ascending: false, nullsFirst: false })
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: diasFilmagem } = useQuery({
    queryKey: ["dias-filmagem-disponiveis", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dias_filmagem")
        .select("id, data, tipo, locacao:locacoes(nome)")
        .eq("projeto_id", projetoId!)
        .eq("tipo", "dia_filmagem")
        .order("data");
      if (error) throw error;
      return data;
    },
  });

  const criar = useMutation({
    mutationFn: async (form: FormData) => {
      if (!projetoId) throw new Error("Projeto inválido");
      const dia_id = form.get("dia_id") ? String(form.get("dia_id")) : null;
      const dataOd = form.get("data") ? String(form.get("data")) : null;

      // Se vinculou a um dia, herda a data do dia (a menos que usuário tenha forçado outra)
      let dataFinal = dataOd;
      if (dia_id && !dataFinal) {
        const dia = (diasFilmagem ?? []).find((d: any) => d.id === dia_id);
        dataFinal = dia?.data ?? null;
      }

      const payload: any = {
        projeto_id: projetoId,
        tipo: form.get("tipo") || "filmagem",
        titulo: form.get("titulo"),
        data: dataFinal,
        dia_id: dia_id,
        dados_json: {},
      };
      const { data, error } = await supabase.from("ordens_do_dia").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (od) => {
      toast.success("Ordem do Dia criada");
      qc.invalidateQueries({ queryKey: ["ods", projetoId] });
      setOpen(false);
      // Redireciona para o editor
      window.location.href = `/projetos/${projetoId}/ordens-do-dia/od/${od.id}`;
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
          </Link>
          <h1 className="text-2xl font-bold">Ordens do Dia</h1>
          <p className="text-sm text-muted-foreground">
            Crie ODs de filmagem, ensaio, reunião ou pesquisa. Cada OD é independente e pode ou não estar vinculada a um dia do cronograma.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nova OD</Button>
          </DialogTrigger>
          <DialogContent>
            <form
              onSubmit={(e) => { e.preventDefault(); criar.mutate(new FormData(e.currentTarget)); }}
              className="space-y-4"
            >
              <DialogHeader><DialogTitle>Nova Ordem do Dia</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select name="tipo" defaultValue="filmagem" onValueChange={setTipo}>
                      <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filmagem">Filmagem</SelectItem>
                        <SelectItem value="ensaio">Ensaio</SelectItem>
                        <SelectItem value="reuniao">Reunião</SelectItem>
                        <SelectItem value="pesquisa">Pesquisa</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="data">Data (opcional)</Label>
                    <Input id="data" name="data" type="date" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="titulo">Título</Label>
                  <Input id="titulo" name="titulo" required placeholder="Ex.: Dia 1 — Sequência casa do João" />
                </div>
                {tipo === "filmagem" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="dia_id">Vincular a um dia de filmagem (opcional)</Label>
                    <Select name="dia_id">
                      <SelectTrigger id="dia_id"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        {(diasFilmagem ?? []).length === 0 ? (
                          <div className="px-3 py-2 text-xs text-muted-foreground">Sem dias de filmagem cadastrados.</div>
                        ) : (
                          (diasFilmagem ?? []).map((d: any) => (
                            <SelectItem key={d.id} value={d.id}>
                              {formatDate(d.data)} {d.locacao?.nome ? " - " + d.locacao.nome : ""}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={criar.isPending}>
                  {criar.isPending ? "Criando..." : "Criar e abrir"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!ods?.length ? (
        <Empty
          icon={<FileText className="h-5 w-5" />}
          title="Nenhuma OD criada"
          description="Crie uma OD a partir de um dia do cronograma ou avulsa (ensaio, reunião, pesquisa)."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova OD</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ods.map((od: any) => {
            const data = od.data ?? od.dia?.data;
            const tipoOd = od.tipo ?? "filmagem";
            return (
              <Link key={od.id} to={`/projetos/${projetoId}/ordens-do-dia/od/${od.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold">{od.titulo ?? "Sem título"}</p>
                      <Badge variant={TIPO_VARIANT[tipoOd]}>{TIPO_LABEL[tipoOd] ?? tipoOd}</Badge>
                    </div>
                    {data && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" /> {formatDate(data)}
                      </p>
                    )}
                    {od.dia?.locacao?.nome && (
                      <p className="text-xs text-muted-foreground">Locação: {od.dia.locacao.nome}</p>
                    )}
                    <div className="border-t pt-3 text-xs">
                      {od.publicada_em ? (
                        <span className="text-emerald-600">Publicada v{od.versao} · {formatDateTime(od.publicada_em)}</span>
                      ) : (
                        <span className="text-amber-600">Rascunho v{od.versao}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
