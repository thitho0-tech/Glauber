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
import { FileText, ChevronLeft, Plus, Calendar, ExternalLink, Copy, Check, Trash2, AlertTriangle } from "lucide-react";
import { useProjectDeptAccess } from "@/hooks/useProjectDeptAccess";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

const TIPO_LABEL: Record<string, string> = {
  filmagem: "Filmagem",
  ensaio: "Ensaio",
  reuniao: "Reuniao",
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

const APROVACAO_OD_LABEL: Record<string, string> = {
  pendente: "Aguardando aprovação",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};
const APROVACAO_OD_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "secondary",
  aprovada: "default",
  rejeitada: "destructive",
};

export default function CallSheets() {
  const { id: projetoId } = useParams<{ id: string }>();
  const { canEditSection } = useProjectDeptAccess(projetoId);
  const canEdit = canEditSection("od");
  const [open, setOpen] = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = useState<string | null>(null);
  const [linkOdId, setLinkOdId] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const qc = useQueryClient();

  const { data: ods, isLoading } = useQuery({
    queryKey: ["ods", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_do_dia")
        .select("id, titulo, tipo, data, versao, publicada_em, atualizada_em, token_publico, aprovacao_status, dia:dias_filmagem(data, chamada_geral, locacao:locacoes(nome))")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
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
        .eq("tipo", "dia_gravacao")
        .order("data");
      if (error) throw error;
      return data;
    },
  });

  const criar = useMutation({
    mutationFn: async (form: FormData) => {
      if (!projetoId) throw new Error("Projeto invalido");
      const dia_id = form.get("dia_id") ? String(form.get("dia_id")) : null;
      const dataOd = form.get("data") ? String(form.get("data")) : null;

      let dataFinal = dataOd;
      if (dia_id && !dataFinal) {
        const dia = (diasFilmagem ?? []).find((d: any) => d.id === dia_id);
        dataFinal = dia?.data ?? null;
      }

      const payload: any = {
        projeto_id: projetoId,
        tipo: "filmagem",
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
      window.location.href = `/projetos/${projetoId}/ordens-do-dia/od/${od.id}`;
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletar = useMutation({
    mutationFn: async (odId: string) => {
      const { error } = await supabase.rpc("soft_delete_item", { p_tabela: "ordens_do_dia", p_id: odId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("OD movida para a lixeira");
      qc.invalidateQueries({ queryKey: ["ods", projetoId] });
      setConfirmarExcluir(null);
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
            Crie ODs de filmagem, ensaio, reuniao ou pesquisa. Cada OD e independente e pode ou nao estar vinculada a um dia do cronograma.
          </p>
        </div>
        <Dialog open={open} onOpenChange={canEdit ? setOpen : undefined}>
          {canEdit && (
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Nova OD</Button>
          </DialogTrigger>
          )}
          <DialogContent>
            <form
              onSubmit={(e) => { e.preventDefault(); criar.mutate(new FormData(e.currentTarget)); }}
              className="space-y-4"
              autoComplete="off"
            >
              <DialogHeader><DialogTitle>Nova Ordem do Dia</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="titulo">Titulo</Label>
                    <Input id="titulo" name="titulo" required placeholder="Ex.: Dia 1 — Sequencia casa do Joao" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="data">Data (opcional)</Label>
                    <Input id="data" name="data" type="date" />
                  </div>
                </div>
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
          title="Nenhuma Ordem do Dia ainda"
          description="Crie a primeira OD deste projeto para comecar a organizar os dias."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ods.map((od: any) => {
            const dataOd = od.data ?? od.dia?.data;
            const tipoOd = od.tipo ?? "filmagem";
            const publicLink = od.token_publico ? `${window.location.origin}/od/${od.token_publico}` : null;
            return (
              <div key={od.id} className="relative">
                {canEdit && (
                  <button
                    className="absolute right-2 top-2 z-10 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmarExcluir(od.id)}
                    title="Excluir OD"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <Link to={`/projetos/${projetoId}/ordens-do-dia/od/${od.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="space-y-2 p-5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-lg font-semibold truncate">{od.titulo ?? "Sem titulo"}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {od.aprovacao_status && (
                            <Badge variant={APROVACAO_OD_VARIANT[od.aprovacao_status] ?? "outline"} className="text-xs">
                              {APROVACAO_OD_LABEL[od.aprovacao_status] ?? od.aprovacao_status}
                            </Badge>
                          )}
                          <Badge variant={TIPO_VARIANT[tipoOd]}>{TIPO_LABEL[tipoOd] ?? tipoOd}</Badge>
                        </div>
                      </div>
                      {dataOd && (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" /> {formatDate(dataOd)}
                        </p>
                      )}
                      {od.dia?.locacao?.nome && (
                        <p className="text-xs text-muted-foreground">Locacao: {od.dia.locacao.nome}</p>
                      )}
                      <div className="flex items-center justify-between border-t pt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                            {od.publicada_em ? (
                              <span className="text-emerald-600">Publicada v{od.versao} · {formatDateTime(od.publicada_em)}</span>
                            ) : (
                              <span className="text-amber-600">Rascunho v{od.versao}</span>
                            )}
                          </span>
                          {od.atualizada_em && (
                            <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50">ATUALIZADA</Badge>
                          )}
                        </div>
                        {publicLink && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 gap-1 text-xs text-primary"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setLinkOdId(od.id);
                              setLinkToken(publicLink);
                              setCopiado(false);
                            }}
                          >
                            <ExternalLink className="h-3 w-3" /> Link publico
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog: confirmar exclusão da OD */}
      <Dialog open={!!confirmarExcluir} onOpenChange={(v) => { if (!v) setConfirmarExcluir(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Excluir Ordem do Dia?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A OD será movida para a lixeira e pode ser restaurada em até 30 dias.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarExcluir(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => confirmarExcluir && deletar.mutate(confirmarExcluir)}
              disabled={deletar.isPending}
            >
              {deletar.isPending ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* C7 — Dialog link publico da OD */}
      <Dialog open={!!linkOdId} onOpenChange={(v) => { if (!v) { setLinkOdId(null); setLinkToken(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" /> Link publico da Ordem do Dia
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Compartilhe este link com toda a equipe. Nao e necessario fazer login para visualizar.
            </p>
            <div className="flex items-center gap-2">
              <Input value={linkToken ?? ""} readOnly className="text-xs font-mono" />
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  if (linkToken) {
                    navigator.clipboard.writeText(linkToken);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2000);
                  }
                }}
                title="Copiar link"
              >
                {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLinkOdId(null); setLinkToken(null); }}>Fechar</Button>
            <Button onClick={() => window.open(linkToken ?? "", "_blank", "noopener,noreferrer")}>
              <ExternalLink className="h-4 w-4 mr-1" /> Abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
