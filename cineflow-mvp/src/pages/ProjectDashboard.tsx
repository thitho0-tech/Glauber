import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CalendarDays, Send, Mic, Square, Trash2, MessageSquare,
  CalendarClock, CheckCircle2, XCircle, MapPin, ChevronRight, Plus,
} from "lucide-react";
import { toast } from "sonner";

const BUCKET = "mensagens-audio";

const STATUS_ICON: Record<string, React.ElementType> = {
  agendado:  CalendarClock,
  realizado: CheckCircle2,
  cancelado: XCircle,
};

function formatDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
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
}: {
  canais: any[];
  userId: string | undefined;
  targetCanalId?: string | null;
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
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        <p className="text-sm">Nenhum canal nesta categoria.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {canais.length > 1 && (
        <div className="w-40 shrink-0 border-r overflow-y-auto">
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

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="border-b px-4 py-2 shrink-0">
          <p className="text-sm font-medium">{canalAtualNome}</p>
        </div>

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

  const [openNovaDM, setOpenNovaDM] = useState(false);
  const [privadoTarget, setPrivadoTarget] = useState<string | null>(null);

  const { data: proximosEventos, isLoading: lEventos } = useQuery({
    queryKey: ["mural-agenda", projetoId],
    enabled: !!projetoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_eventos")
        .select("id, tipo, titulo, data_inicio, local, status")
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

  // Current user's pessoa_id (for DM creation)
  const { data: myPessoa } = useQuery({
    queryKey: ["my-pessoa", projetoId, user?.email],
    enabled: !!projetoId && !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("projeto_pessoas")
        .select("pessoa:pessoas(id, nome)")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null)
        .ilike("pessoa.email", user!.email!)
        .maybeSingle();
      return (data as any)?.pessoa ?? null;
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
      if (!myPessoa) throw new Error("Seu perfil não foi encontrado no projeto");

      const canaisPrivado = (canais ?? []).filter((c: any) => getCanalCategoria(c) === "privado");

      // Check if DM already exists: find a canal where target is a member AND it's in our privado list
      if (canaisPrivado.length > 0) {
        const privadoIds = canaisPrivado.map((c: any) => c.id);
        const { data: targetMembros } = await supabase
          .from("canal_membros")
          .select("canal_id")
          .eq("pessoa_id", targetPessoa.id)
          .in("canal_id", privadoIds);

        if (targetMembros && targetMembros.length > 0) {
          return { canalId: targetMembros[0].canal_id, isNew: false };
        }
      }

      // Create new DM canal
      const dmDept = "dm-" + crypto.randomUUID().slice(0, 8);
      const { data: newCanal, error: e1 } = await supabase
        .from("canais")
        .insert({ projeto_id: projetoId!, tipo: "privado", departamento: dmDept, nome: targetPessoa.nome })
        .select("id")
        .single();
      if (e1) throw e1;

      const { error: e2 } = await supabase.from("canal_membros").insert([
        { canal_id: newCanal.id, pessoa_id: myPessoa.id },
        { canal_id: newCanal.id, pessoa_id: targetPessoa.id },
      ]);
      if (e2) throw e2;

      return { canalId: newCanal.id, isNew: true };
    },
    onSuccess: ({ canalId, isNew }) => {
      if (isNew) {
        qc.invalidateQueries({ queryKey: ["canais", projetoId] });
      }
      setPrivadoTarget(canalId);
      setOpenNovaDM(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (lEventos || lCanais) return <Loading />;

  const canaisGeral   = (canais ?? []).filter((c: any) => getCanalCategoria(c) === "geral");
  const canaisDept    = (canais ?? []).filter((c: any) => getCanalCategoria(c) === "departamento");
  const canaisPrivado = (canais ?? []).filter((c: any) => getCanalCategoria(c) === "privado");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mural</h1>

      <div className="grid gap-4 md:grid-cols-[340px_1fr]" style={{ height: "calc(100vh - 140px)" }}>

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
            {(proximosEventos ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-muted-foreground">
                <CalendarDays className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhum evento próximo.</p>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/projetos/${projetoId}/agenda`}>Ir para a Agenda</Link>
                </Button>
              </div>
            ) : (
              (proximosEventos ?? []).map((ev: any) => {
                const Icon = STATUS_ICON[ev.status] ?? CalendarClock;
                return (
                  <div key={ev.id} className="rounded-lg border p-3 space-y-1 hover:bg-muted/40 transition-colors">
                    <div className="flex items-start gap-2">
                      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.titulo}</p>
                        <p className="text-xs text-muted-foreground">{formatDataHora(ev.data_inicio)}</p>
                        {ev.local && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-2.5 w-2.5" /> {ev.local}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{ev.tipo}</Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── Coluna: Chat ──────────────────────────────────────────────── */}
        <Card className="flex flex-col overflow-hidden">
          <Tabs defaultValue="geral" className="flex flex-col flex-1 overflow-hidden">
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

            <TabsContent value="geral" className="flex-1 overflow-hidden m-0 mt-0 flex flex-col">
              <ChatPanel canais={canaisGeral} userId={user?.id} />
            </TabsContent>
            <TabsContent value="departamento" className="flex-1 overflow-hidden m-0 mt-0 flex flex-col">
              <ChatPanel canais={canaisDept} userId={user?.id} />
            </TabsContent>
            <TabsContent value="privado" className="flex-1 overflow-hidden m-0 mt-0 flex flex-col">
              {/* "Nova conversa" button bar */}
              <div className="border-b px-3 py-2 shrink-0 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setOpenNovaDM(true)}>
                  <Plus className="h-3.5 w-3.5" /> Nova conversa
                </Button>
              </div>
              <ChatPanel canais={canaisPrivado} userId={user?.id} targetCanalId={privadoTarget} />
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
