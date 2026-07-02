import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useProjectFunction } from "@/hooks/useProjectFunction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CalendarDays, Send, Mic, Square, Trash2, MessageSquare,
  ChevronRight, Plus, AlertCircle, UserCheck,
} from "lucide-react";
import { toast } from "sonner";

const BUCKET = "mensagens-audio";

const PENDENCIA_LABEL: Record<string, string> = {
  od: "Aprovar OD",
  figurino: "Aprovar figurino",
  arte: "Aprovar objeto de arte",
  locacao: "Aprovar locação",
};

function formatDataHora(iso: string) {
  // Formata a hora "de parede" direto da string ISO, SEM converter fuso,
  // para casar com a Agenda (que usa data_inicio.slice). Evita o -3h do Mural.
  const [data, horaRaw] = (iso ?? "").split("T");
  const [, mes, dia] = (data ?? "").split("-");
  const hhmm = (horaRaw ?? "").slice(0, 5);
  if (!dia || !mes) return iso;
  return `${dia}/${mes}${hhmm ? ` ${hhmm}` : ""}`;
}

function getCanalCategoria(canal: any): "geral" | "departamento" | "privado" {
  if (canal.tipo === "privado") return "privado";
  if (canal.departamento === "geral" || canal.tipo === "geral") return "geral";
  return "departamento";
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────
function ChatPanel({
  canais,
  userId,
  targetCanalId,
  emptyLabel = "Nenhum canal nesta categoria.",
}: {
  canais: any[];
  userId: string | undefined;
  targetCanalId?: string | null;
  emptyLabel?: string;
}) {
  const qc = useQueryClient();
  const [canalId, setCanalId] = useState<string | null>(canais[0]?.id ?? null);
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState(false);
  const [duracao, setDuracao] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canalId && canais.length > 0) setCanalId(canais[0].id);
  }, [canais, canalId]);

  // Navigate to a target canal when requested by parent (e.g., after DM creation)
  useEffect(() => {
    if (targetCanalId && canais.some((c) => c.id === targetCanalId)) {
      setCanalId(targetCanalId);
    }
  }, [targetCanalId, canais]);

  const { data: mensagens } = useQuery({
    queryKey: ["mensagens", canalId],
    enabled: !!canalId,
    queryFn: async () => {
      const { data, error } = await supabase.from("mensagens").select("*").eq("canal_id", canalId!).order("criado_em");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!canalId) return;
    const ch = supabase.channel("chat:" + canalId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens", filter: `canal_id=eq.${canalId}` },
        () => qc.invalidateQueries({ queryKey: ["mensagens", canalId] })
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [canalId, qc]);

  useEffect(() => {
    // Rola apenas o container de mensagens (não a página inteira).
    // scrollIntoView arrastava todos os ancestrais → puxava o Mural para baixo.
    const c = listEndRef.current?.parentElement;
    if (c) c.scrollTop = c.scrollHeight;
  }, [mensagens]);

  const enviar = useMutation({
    mutationFn: async () => {
      if (!canalId || !texto.trim()) return;
      const { error } = await supabase.from("mensagens").insert({ canal_id: canalId, tipo: "texto", conteudo: texto.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setTexto("");
      qc.invalidateQueries({ queryKey: ["mensagens", canalId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const apagar = useMutation({
    mutationFn: async (mid: string) => {
      const { error } = await supabase.from("mensagens").delete().eq("id", mid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mensagens", canalId] }),
    onError: (e: any) => toast.error(e.message),
  });

  async function startGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!canalId || !userId) return;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const fileName = `${canalId}/${Date.now()}-${userId}.webm`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(fileName, blob, { contentType: "audio/webm", upsert: false });
        if (upErr) { toast.error("Falha no upload: " + upErr.message); return; }
        const { error: msgErr } = await supabase.from("mensagens").insert({ canal_id: canalId, tipo: "audio", audio_path: fileName, audio_duracao_seg: duracao });
        if (msgErr) { toast.error("Falha ao registrar áudio: " + msgErr.message); return; }
        qc.invalidateQueries({ queryKey: ["mensagens", canalId] });
        setDuracao(0);
      };
      mr.start();
      mediaRef.current = mr;
      setGravando(true);
      setDuracao(0);
      timerRef.current = setInterval(() => setDuracao((d) => d + 1), 1000);
    } catch (err: any) {
      toast.error("Microfone indisponível: " + err.message);
    }
  }

  function stopGravacao() {
    mediaRef.current?.stop();
    setGravando(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  const canalAtualNome = canais.find((c: any) => c.id === canalId)?.nome ?? "";

  if (canais.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground p-6">
        <MessageSquare className="h-8 w-8 opacity-30 mb-2" />
        <p className="text-sm">{emptyLabel}</p>
      </div>
    );
  }

  const showSidebar = canais.length > 1;

  return (
    <div className="flex flex-1 min-h-0">
      {showSidebar && (
        <div className="w-44 shrink-0 border-r overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {canais.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCanalId(c.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${c.id === canalId ? "bg-accent font-medium" : ""}`}
              >
                <MessageSquare className="inline h-3 w-3 mr-1.5 opacity-60" />
                {c.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-h-0">
        {showSidebar && (
          <div className="border-b px-4 py-2 shrink-0">
            <p className="text-sm font-medium">{canalAtualNome}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!(mensagens?.length) ? (
            <div className="flex flex-col items-center justify-center h-32 text-center text-sm text-muted-foreground">
              <MessageSquare className="mb-2 h-8 w-8 opacity-30" />
              Nenhuma mensagem ainda.
            </div>
          ) : (
            (mensagens ?? []).map((m: any) => {
              const meu = m.autor_id === userId;
              return (
                <div key={m.id} className={`flex ${meu ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 ${meu ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <div className="flex items-center gap-2 text-xs opacity-80">
                      <span className="font-medium">{m.autor_nome ?? "—"}</span>
                      <span>{formatDataHora(m.criado_em)}</span>
                      {meu && (
                        <button onClick={() => apagar.mutate(m.id)} className="ml-1 opacity-60 hover:opacity-100">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {m.tipo === "texto" ? (
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.conteudo}</p>
                    ) : (
                      <div className="mt-1">
                        <audio controls src={supabase.storage.from(BUCKET).getPublicUrl(m.audio_path).data.publicUrl} className="h-9 w-full max-w-xs" />
                        {m.audio_duracao_seg ? <Badge variant="outline" className="text-xs mt-1">{m.audio_duracao_seg}s</Badge> : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={listEndRef} />
        </div>

        <div className="border-t p-3 shrink-0">
          {gravando ? (
            <div className="flex items-center gap-3 rounded-md border border-rose-300 bg-rose-50 dark:bg-rose-950/20 px-3 py-2">
              <Mic className="h-4 w-4 animate-pulse text-rose-600" />
              <span className="font-mono text-sm">Gravando... {duracao}s</span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={stopGravacao}>
                <Square className="h-4 w-4" /> Parar
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); enviar.mutate(); }} className="flex items-center gap-2">
              <Input placeholder="Escreva uma mensagem..." value={texto} onChange={(e) => setTexto(e.target.value)} />
              <Button type="button" variant="outline" size="icon" onClick={startGravacao} title="Gravar áudio">
                <Mic className="h-4 w-4" />
              </Button>
              <Button type="submit" size="icon" disabled={!texto.trim() || enviar.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal: Mural ──────────────────────────────────────────────────
export default function ProjectDashboard() {
  const { id: projetoId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { isSuperUser } = usePermissions(projetoId);
  const { funcao } = useProjectFunction(projetoId);

  const [openNovaDM, setOpenNovaDM] = useState(false);
  const [privadoTarget, setPrivadoTarget] = useState<string | null>(null);

  const { data: proximosEventos, isLoading: lEventos } = useQuery({
    queryKey: ["mural-agenda", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_eventos")
        .select("id, tipo, titulo, data_inicio, local, status, departamento")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .gte("data_inicio", new Date().toISOString())
        .order("data_inicio")
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: canais, isLoading: lCanais } = useQuery({
    queryKey: ["canais", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canais")
        .select("*")
        .eq("projeto_id", projetoId!)
        .order("departamento");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Current user's projeto_pessoas.id — needed to look up event participations
  const { data: myPpId } = useQuery({
    queryKey: ["my-pp-id", projetoId, user?.email],
    enabled: !!projetoId && !!user?.email && !isSuperUser,
    queryFn: async () => {
      const { data: pps } = await supabase
        .from("projeto_pessoas")
        .select("id, pessoa:pessoas!inner(email)")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null);
      const meu = ((pps ?? []) as any[]).find(
        (p: any) => p.pessoa?.email?.toLowerCase() === user!.email!.toLowerCase()
      );
      return (meu?.id ?? null) as string | null;
    },
  });

  // Events the current user is explicitly listed as participant (+ confirmação de presença)
  const { data: minhasParticipacoes } = useQuery({
    queryKey: ["minhas-participacoes-mural", myPpId],
    enabled: !!myPpId && !isSuperUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_participantes")
        .select("evento_id, confirmado")
        .eq("projeto_pessoa_id", myPpId!);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      return {
        todos: new Set(rows.map((r) => r.evento_id as string)),
        naoConfirmados: new Set(rows.filter((r) => !r.confirmado).map((r) => r.evento_id as string)),
      };
    },
  });

  // Pendências de aprovação do usuário corrente (OD, figurino, arte, locação).
  // O RPC já filtra pelo pode() — só volta o que ESTA pessoa pode aprovar.
  const { data: pendencias } = useQuery({
    queryKey: ["minhas-pendencias", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("minhas_pendencias", { p_projeto: projetoId! });
      if (error) throw error;
      return (data ?? []) as { tipo: string; titulo: string; link: string; gerado_em: string }[];
    },
  });

  // Project members list (for DM dialog)
  const { data: pessoasDM } = useQuery({
    queryKey: ["pessoas-dm-dialog", projetoId],
    enabled: openNovaDM && !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_pessoas")
        .select("pessoa:pessoas(id, nome, email)")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .order("criado_em");
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => r.pessoa).filter(Boolean) as { id: string; nome: string; email: string }[];
    },
  });

  const criarOuAbrirDM = useMutation({
    mutationFn: async (targetPessoa: { id: string; nome: string }) => {
      // FIX: RPC SECURITY DEFINER — o insert direto falhava porque a policy de
      // SELECT de canal privado bloqueava o RETURNING antes dos membros existirem
      const { data, error } = await supabase.rpc("criar_dm", {
        p_projeto: projetoId!,
        p_target_pessoa: targetPessoa.id,
      });
      if (error) throw error;
      return { canalId: data as string };
    },
    onSuccess: ({ canalId }) => {
      qc.invalidateQueries({ queryKey: ["canais", projetoId] });
      setPrivadoTarget(canalId);
      setOpenNovaDM(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (lEventos || lCanais) return <Loading />;

  const eventosFiltrados = isSuperUser
    ? (proximosEventos ?? [])
    : (proximosEventos ?? []).filter((ev: any) =>
        ev.tipo === "ordem_do_dia" ||
        (ev.departamento != null && ev.departamento === (funcao?.departamento ?? null)) ||
        (minhasParticipacoes?.todos.has(ev.id) ?? false)
      );

  const canaisGeral   = (canais ?? []).filter((c: any) => getCanalCategoria(c) === "geral");
  const canaisDept    = (canais ?? []).filter((c: any) => getCanalCategoria(c) === "departamento");
  const canaisPrivado = (canais ?? []).filter((c: any) => getCanalCategoria(c) === "privado");

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100vh-96px)] md:h-[calc(100vh-112px)]">
      <h1 className="text-2xl font-bold shrink-0 mb-4">Mural</h1>

      <div className="flex-1 min-h-0 grid gap-4 md:grid-cols-[340px_1fr]">

        {/* ── Coluna: Próximos eventos ───────────────────────────────────── */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="shrink-0 flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Próximos eventos
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
              <Link to={`/projetos/${projetoId}/agenda`}>
                Ver todos <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 pb-4">
            {/* Pendências de aprovação (topo; somem ao aprovar/rejeitar) */}
            {(pendencias ?? []).map((p) => (
              <Link
                key={p.tipo + p.link + p.gerado_em}
                to={p.link}
                className="block rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-1 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <Badge variant="outline" className="border-amber-400 text-amber-700 text-[10px]">Pendência</Badge>
                  <span className="text-xs font-medium text-amber-800">{PENDENCIA_LABEL[p.tipo] ?? "Aprovar"}</span>
                </div>
                <p className="text-sm font-medium truncate">{p.titulo}</p>
              </Link>
            ))}

            {eventosFiltrados.length === 0 && (pendencias ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-muted-foreground">
                <CalendarDays className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhum evento próximo.</p>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/projetos/${projetoId}/agenda`}>Ir para a Agenda</Link>
                </Button>
              </div>
            ) : (
              eventosFiltrados.map((ev: any) => (
                <Link
                  key={ev.id}
                  to={`/projetos/${projetoId}/agenda?evento=${ev.id}`}
                  className="block rounded-lg border p-3 space-y-1 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <p className="text-sm font-medium truncate">{ev.titulo}</p>
                  <p className="text-xs text-muted-foreground">{formatDataHora(ev.data_inicio)}</p>
                  {ev.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{ev.descricao}</p>
                  )}
                  {(minhasParticipacoes?.naoConfirmados.has(ev.id) ?? false) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-300 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                      <UserCheck className="h-3 w-3" /> Confirmar presença
                    </span>
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* ── Coluna: Chat ──────────────────────────────────────────────── */}
        <Card className="flex flex-col overflow-hidden">
          <Tabs defaultValue="geral" className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <CardHeader className="shrink-0 pb-0 border-b">
              <TabsList className="w-full justify-start rounded-none bg-transparent border-0 p-0 h-auto gap-0">
                {[
                  { value: "geral", label: "Geral" },
                  { value: "departamento", label: "Departamento" },
                  { value: "privado", label: "Privado" },
                ].map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2 text-sm"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </CardHeader>

            <TabsContent value="geral" className="flex flex-col flex-1 min-h-0 m-0">
              <ChatPanel canais={canaisGeral} userId={user?.id} />
            </TabsContent>
            <TabsContent value="departamento" className="flex flex-col flex-1 min-h-0 m-0">
              <ChatPanel canais={canaisDept} userId={user?.id} />
            </TabsContent>
            <TabsContent value="privado" className="flex flex-col flex-1 min-h-0 m-0">
              <div className="border-b px-3 py-2 shrink-0 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setOpenNovaDM(true)}>
                  <Plus className="h-3.5 w-3.5" /> Nova conversa
                </Button>
              </div>
              <ChatPanel canais={canaisPrivado} userId={user?.id} targetCanalId={privadoTarget} emptyLabel="Nenhuma conversa ainda." />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Dialog: Nova conversa DM */}
      <Dialog open={openNovaDM} onOpenChange={setOpenNovaDM}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conversa privada</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground mb-3">Selecione um membro da equipe:</p>
            {!pessoasDM ? (
              <Loading />
            ) : pessoasDM.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma pessoa na equipe.</p>
            ) : (
              pessoasDM
                .filter((p) => p.email?.toLowerCase() !== user?.email?.toLowerCase())
                .map((p) => (
                  <button
                    key={p.id}
                    disabled={criarOuAbrirDM.isPending}
                    onClick={() => criarOuAbrirDM.mutate(p)}
                    className="w-full rounded-md border px-4 py-3 text-left text-sm hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <span className="font-medium">{p.nome}</span>
                    {p.email && <span className="ml-2 text-xs text-muted-foreground">{p.email}</span>}
                  </button>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
