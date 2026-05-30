import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { Loading } from "@/components/ui/loading";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Trash2, RotateCcw, ChevronLeft, AlertTriangle, FolderOpen,
  Wallet, Calendar, FileText, Users, MapPin,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

type LixeiraItem = {
  id: string;
  tabela: "projetos" | "despesas" | "dias_filmagem" | "ordens_do_dia" | "projeto_pessoas" | "locacoes";
  nome: string;
  subtitulo?: string;
  deleted_at: string;
};

const TABELA_CONFIG: Record<string, { label: string; icon: React.ElementType; cor: string }> = {
  projetos:       { label: "Projeto",         icon: FolderOpen,  cor: "text-violet-600 bg-violet-50 dark:bg-violet-950/20" },
  despesas:       { label: "Despesa",          icon: Wallet,      cor: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" },
  dias_filmagem:  { label: "Dia / Planejamento", icon: Calendar, cor: "text-sky-600 bg-sky-50 dark:bg-sky-950/20" },
  ordens_do_dia:  { label: "Ordem do Dia",     icon: FileText,    cor: "text-amber-600 bg-amber-50 dark:bg-amber-950/20" },
  projeto_pessoas:{ label: "Membro da equipe", icon: Users,       cor: "text-rose-600 bg-rose-50 dark:bg-rose-950/20" },
  locacoes:       { label: "Locação",          icon: MapPin,      cor: "text-orange-600 bg-orange-50 dark:bg-orange-950/20" },
};

function diasRestantes(deletedAt: string): number {
  const diff = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export default function Lixeira() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [confirmEsvaziar, setConfirmEsvaziar] = useState(false);

  // Busca itens deletados de todas as tabelas
  const { data: itens, isLoading } = useQuery({
    queryKey: ["lixeira", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const result: LixeiraItem[] = [];

      // Projetos deletados do usuário
      const { data: projetos } = await supabase
        .from("projetos")
        .select("id, nome, deleted_at")
        .eq("criado_por", user!.id)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      (projetos ?? []).forEach((p: any) =>
        result.push({ id: p.id, tabela: "projetos", nome: p.nome, deleted_at: p.deleted_at })
      );

      // Despesas deletadas (de projetos do usuário)
      const { data: despesas } = await supabase
        .from("despesas")
        .select("id, descricao, valor, deleted_at, projeto:projetos(nome)")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      (despesas ?? []).forEach((d: any) =>
        result.push({
          id: d.id, tabela: "despesas",
          nome: d.descricao ?? "Despesa sem descrição",
          subtitulo: `R$ ${Number(d.valor ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} — ${d.projeto?.nome ?? ""}`,
          deleted_at: d.deleted_at,
        })
      );

      // Dias de filmagem deletados
      const { data: dias } = await supabase
        .from("dias_filmagem")
        .select("id, data, tipo, deleted_at, projeto:projetos(nome)")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      (dias ?? []).forEach((d: any) =>
        result.push({
          id: d.id, tabela: "dias_filmagem",
          nome: `${d.tipo ?? "dia_filmagem"} — ${formatDate(d.data)}`,
          subtitulo: d.projeto?.nome ?? "",
          deleted_at: d.deleted_at,
        })
      );

      // Ordens do dia deletadas
      const { data: ods } = await supabase
        .from("ordens_do_dia")
        .select("id, titulo, deleted_at, projeto:projetos(nome)")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      (ods ?? []).forEach((o: any) =>
        result.push({
          id: o.id, tabela: "ordens_do_dia",
          nome: o.titulo ?? "Sem título",
          subtitulo: o.projeto?.nome ?? "",
          deleted_at: o.deleted_at,
        })
      );

      // Membros de equipe deletados
      const { data: membros } = await supabase
        .from("projeto_pessoas")
        .select("id, deleted_at, pessoa:pessoas(nome), projeto:projetos(nome)")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      (membros ?? []).forEach((m: any) =>
        result.push({
          id: m.id, tabela: "projeto_pessoas",
          nome: m.pessoa?.nome ?? "Pessoa desconhecida",
          subtitulo: m.projeto?.nome ?? "",
          deleted_at: m.deleted_at,
        })
      );

      // Locações deletadas
      const { data: locs } = await supabase
        .from("locacoes")
        .select("id, nome, deleted_at")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      (locs ?? []).forEach((l: any) =>
        result.push({ id: l.id, tabela: "locacoes", nome: l.nome, deleted_at: l.deleted_at })
      );

      // Ordena por data de exclusão (mais recente primeiro)
      return result.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
    },
  });

  const restaurar = useMutation({
    mutationFn: async ({ tabela, id }: { tabela: string; id: string }) => {
      const { error } = await supabase.rpc("restore_item", { p_tabela: tabela, p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item restaurado com sucesso");
      qc.invalidateQueries({ queryKey: ["lixeira"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const purgar = useMutation({
    mutationFn: async ({ tabela, id }: { tabela: string; id: string }) => {
      const { error } = await supabase.rpc("purge_item", { p_tabela: tabela, p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item excluído definitivamente");
      qc.invalidateQueries({ queryKey: ["lixeira"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const esvaziar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("empty_trash", { p_user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lixeira esvaziada");
      qc.invalidateQueries({ queryKey: ["lixeira"] });
      setConfirmEsvaziar(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;

  const total = itens?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/configuracoes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Configurações
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-muted-foreground" /> Lixeira
          </h1>
          <p className="text-sm text-muted-foreground">
            Itens excluídos ficam aqui por 30 dias e depois são removidos permanentemente.
          </p>
        </div>
        {total > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setConfirmEsvaziar(true)}>
            <Trash2 className="h-4 w-4" /> Esvaziar lixeira ({total})
          </Button>
        )}
      </div>

      {total === 0 ? (
        <Empty
          icon={<Trash2 className="h-5 w-5" />}
          title="Lixeira vazia"
          description="Nenhum item excluído. Quando você excluir algo, aparecerá aqui por 30 dias."
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {total} {total === 1 ? "item" : "itens"} na lixeira
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {itens!.map((item) => {
                const cfg = TABELA_CONFIG[item.tabela];
                const Icon = cfg?.icon ?? Trash2;
                const dias = diasRestantes(item.deleted_at);
                return (
                  <div key={`${item.tabela}-${item.id}`} className="flex items-center gap-3 px-5 py-3">
                    <div className={`rounded-md p-2 ${cfg?.cor ?? ""}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.nome}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">{cfg?.label ?? item.tabela}</Badge>
                        {item.subtitulo && <span className="truncate">{item.subtitulo}</span>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      <p>Excluído em {formatDate(item.deleted_at)}</p>
                      <p className={dias <= 3 ? "text-red-500 font-medium" : ""}>
                        {dias > 0 ? `Remove em ${dias}d` : "Remove hoje"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => restaurar.mutate({ tabela: item.tabela, id: item.id })}
                        disabled={restaurar.isPending}
                        title="Restaurar item"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => purgar.mutate({ tabela: item.tabela, id: item.id })}
                        disabled={purgar.isPending}
                        title="Excluir definitivamente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmar esvaziar lixeira */}
      <Dialog open={confirmEsvaziar} onOpenChange={setConfirmEsvaziar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Esvaziar lixeira?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Todos os <strong>{total} itens</strong> serão excluídos permanentemente. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEsvaziar(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => esvaziar.mutate()}
              disabled={esvaziar.isPending}
            >
              {esvaziar.isPending ? "Esvaziando..." : "Sim, esvaziar tudo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
