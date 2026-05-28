import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, Calendar, FileText, Users, MapPin, Wallet, Receipt, Trash2, AlertTriangle, MessageSquare, FileSignature, Shirt, Drama, ScrollText, Gauge } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProjectRole } from "@/hooks/useProjectRole";
import { toast } from "sonner";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useProjectRole(id);
  const [openDelete, setOpenDelete] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState<string | null>(null);
  const [codigoInput, setCodigoInput] = useState("");

  const { data: projeto, isLoading } = useQuery({
    queryKey: ["projeto", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("*, edital:editais(nome, orgao)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: contadores } = useQuery({
    queryKey: ["projeto", id, "counts"],
    enabled: !!id,
    queryFn: async () => {
      const [dias, escalas, despesas] = await Promise.all([
        supabase.from("dias_filmagem").select("id", { count: "exact", head: true }).eq("projeto_id", id!),
        supabase.from("escalas").select("id, dia:dias_filmagem!inner(projeto_id)", { count: "exact", head: true }).eq("dia.projeto_id", id!),
        supabase.from("despesas").select("valor").eq("projeto_id", id!),
      ]);
      const realizado = (despesas.data ?? []).reduce((s: number, d: any) => s + Number(d.valor ?? 0), 0);
      return { diasCount: dias.count ?? 0, escalasCount: escalas.count ?? 0, realizado };
    },
  });

  const pedirCodigo = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("request_delete_project", { p_projeto_id: id! });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (resultado) => {
      setCodigoEnviado(resultado);
      if (resultado === "enviado") {
        toast.success("Codigo enviado para seu e-mail. Verifique a caixa de entrada.");
      } else {
        toast.success("Codigo gerado. Confirme abaixo.");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const confirmar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("confirm_delete_project", {
        p_projeto_id: id!,
        p_codigo: codigoInput,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projeto excluido");
      setOpenDelete(false);
      navigate("/projetos");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Loading />;
  if (!projeto) return <Empty icon={<FileText className="h-5 w-5" />} title="Projeto nao encontrado" />;

  const isCriador = !!user?.id && projeto.criado_por === user.id;

  const cards = [
    { label: "Dias de filmagem", value: contadores?.diasCount ?? 0, icon: Calendar, to: `/projetos/${id}/cronograma` },
    { label: "Pessoas escaladas", value: contadores?.escalasCount ?? 0, icon: Users, to: `/projetos/${id}/equipe` },
    { label: "Orcamento total", value: formatBRL(projeto.orcamento_total), icon: Wallet, to: `/projetos/${id}/financeiro` },
    { label: "Ja gasto", value: formatBRL(contadores?.realizado ?? 0), icon: Receipt, to: `/projetos/${id}/prestacao` },
  ];

  const atalhos = [
    { to: `/projetos/${id}/dashboard`, label: "Command Center", icon: Gauge, descricao: "KPIs, eventos e alertas em tempo real" },
    { to: `/projetos/${id}/cronograma`, label: "Cronograma", icon: Calendar, descricao: "Datas, locacoes e status de cada dia" },
    { to: `/projetos/${id}/ordens-do-dia`, label: "Ordem do Dia", icon: FileText, descricao: "Editar, publicar e compartilhar" },
    { to: `/projetos/${id}/roteiro`, label: "Roteiro", icon: ScrollText, descricao: "Upload + decupagem automatica (IA)" },
    { to: `/projetos/${id}/equipe`, label: "Equipe tecnica", icon: Users, descricao: "Pessoas, funcoes e diarias" },
    { to: `/projetos/${id}/elenco`, label: "Elenco", icon: Drama, descricao: "Personagens e atores escalados" },
    { to: `/projetos/${id}/locacoes`, label: "Locacoes", icon: MapPin, descricao: "Enderecos, contatos e valores" },
    { to: `/projetos/${id}/figurino-arte`, label: "Figurino e Arte", icon: Shirt, descricao: "Pecas e objetos cenicos" },
    { to: `/projetos/${id}/financeiro`, label: "Financeiro", icon: Wallet, descricao: "Rubricas e lancamentos" },
    { to: `/projetos/${id}/contrato`, label: "Contrato", icon: FileSignature, descricao: "Dados, valor e vigencia" },
    { to: `/projetos/${id}/comunicacao`, label: "Comunicacao", icon: MessageSquare, descricao: "Chat por departamento, com texto e audio" },
    { to: `/projetos/${id}/prestacao`, label: "Prestacao", icon: Receipt, descricao: "Validacoes contra o edital" },
  ];

  return (
    <div className="space-y-6">
      <Link to="/projetos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Projetos
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{projeto.nome}</h1>
            <Badge variant="outline">{projeto.tipo}</Badge>
            <Badge>{projeto.status.replace("_", " ")}</Badge>
            {role && <Badge variant="secondary" title="Seu papel neste projeto">papel: {role}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {projeto.edital ? <>Edital: <span className="font-medium text-foreground">{projeto.edital.nome}</span> · {projeto.edital.orgao}</> : "Sem edital vinculado"}
          </p>
          <p className="text-xs text-muted-foreground">
            Execucao: {formatDate(projeto.periodo_inicio)} a {formatDate(projeto.periodo_fim)}
          </p>
        </div>
        {isCriador && (
          <Button variant="outline" onClick={() => { setOpenDelete(true); setCodigoEnviado(null); setCodigoInput(""); }}>
            <Trash2 className="h-4 w-4 text-destructive" /> Excluir projeto
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Atalhos do projeto</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {atalhos.map((a) => (
            <Link key={a.to} to={a.to}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary"><a.icon className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.descricao}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir projeto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">Esta acao e irreversivel.</p>
              <p className="text-muted-foreground">
                Serao apagados: cronograma, escalas, ordens do dia, equipe vinculada ao projeto, orcamentos e despesas.
                O catalogo da produtora e locacoes continuam.
              </p>
            </div>

            {!codigoEnviado ? (
              <div className="space-y-3">
                <p className="text-sm">
                  Para confirmar, vamos enviar um codigo de 6 digitos para <strong>{user?.email}</strong>.
                </p>
                <Button onClick={() => pedirCodigo.mutate()} disabled={pedirCodigo.isPending}>
                  {pedirCodigo.isPending ? "Enviando..." : "Enviar codigo por e-mail"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border bg-muted p-3">
                  {codigoEnviado === "enviado" ? (
                    <p className="text-sm">
                      Codigo enviado para <strong>{user?.email}</strong>. Confira sua caixa de entrada (e spam) e digite abaixo.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Modo provisorio: o codigo aparece aqui.
                      </p>
                      <p className="mt-2 text-center font-mono text-2xl tracking-widest">{codigoEnviado}</p>
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="codigo">Digite o codigo acima para confirmar</Label>
                  <Input
                    id="codigo"
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
              disabled={!codigoEnviado || codigoInput.length !== 6 || confirmar.isPending}
              onClick={() => confirmar.mutate()}
            >
              {confirmar.isPending ? "Excluindo..." : "Excluir definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
