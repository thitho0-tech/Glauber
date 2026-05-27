import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Send, Mic, Square, Trash2, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const BUCKET = "mensagens-audio";

function formatHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function Communication() {
  const { id: projetoId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [canalAtual, setCanalAtual] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState(false);
  const [duracao, setDuracao] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

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
      return data;
    },
  });

  // Seleciona o primeiro canal (geral) ao carregar
  useEffect(() => {
    if (!canalAtual && canais && canais.length > 0) {
      const geral = canais.find((c: any) => c.departamento === "geral") ?? canais[0];
      setCanalAtual(geral.id);
    }
  }, [canais, canalAtual]);

  const { data: mensagens } = useQuery({
    queryKey: ["mensagens", canalAtual],
    enabled: !!canalAtual,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens")
        .select("*")
        .eq("canal_id", canalAtual!)
        .order("criado_em");
      if (error) throw error;
      return data;
    },
  });

  // Realtime: novas mensagens no canal atual
  useEffect(() => {
    if (!canalAtual) return;
    const ch = supabase
      .channel("mensagens:" + canalAtual)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens", filter: `canal_id=eq.${canalAtual}` },
        () => qc.invalidateQueries({ queryKey: ["mensagens", canalAtual] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [canalAtual, qc]);

  // Auto-scroll
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const enviarTexto = useMutation({
    mutationFn: async () => {
      if (!canalAtual || !texto.trim()) return;
      const { error } = await supabase.from("mensagens").insert({
        canal_id: canalAtual,
        tipo: "texto",
        conteudo: texto.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTexto("");
      qc.invalidateQueries({ queryKey: ["mensagens", canalAtual] });
    },
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
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await uploadAudio(blob, duracao);
        setDuracao(0);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setGravando(true);
      setDuracao(0);
      timerRef.current = setInterval(() => setDuracao((d) => d + 1), 1000);
    } catch (err: any) {
      toast.error("Não foi possível acessar o microfone: " + err.message);
    }
  }

  function stopGravacao() {
    mediaRecorderRef.current?.stop();
    setGravando(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function uploadAudio(blob: Blob, segundos: number) {
    if (!canalAtual || !user?.id) return;
    const fileName = `${projetoId}/${canalAtual}/${Date.now()}-${user.id}.webm`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(fileName, blob, {
      contentType: "audio/webm",
      upsert: false,
    });
    if (upErr) { toast.error("Falha no upload: " + upErr.message); return; }
    const { error: msgErr } = await supabase.from("mensagens").insert({
      canal_id: canalAtual,
      tipo: "audio",
      audio_path: fileName,
      audio_duracao_seg: segundos,
    });
    if (msgErr) { toast.error("Falha ao registrar: " + msgErr.message); return; }
    qc.invalidateQueries({ queryKey: ["mensagens", canalAtual] });
  }

  function urlAudio(path: string) {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const apagarMsg = useMutation({
    mutationFn: async (mid: string) => {
      const { error } = await supabase.from("mensagens").delete().eq("id", mid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mensagens", canalAtual] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (lCanais) return <Loading />;

  return (
    <div className="space-y-4">
      <Link to={`/projetos/${projetoId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar ao projeto
      </Link>
      <h1 className="text-2xl font-bold">Comunicação interna</h1>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]" style={{ minHeight: "70vh" }}>
        {/* Sidebar de canais */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Canais</CardTitle></CardHeader>
          <CardContent className="p-2">
            {(canais ?? []).map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCanalAtual(c.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                  canalAtual === c.id ? "bg-accent font-medium" : ""
                }`}
              >
                {c.nome}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Área de chat */}
        <Card className="flex flex-col">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base">
              {(canais ?? []).find((c: any) => c.id === canalAtual)?.nome ?? "Selecione um canal"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex-1 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(70vh - 180px)" }}>
              {!mensagens?.length ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                  <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
                  Nenhuma mensagem ainda. Seja o primeiro a escrever.
                </div>
              ) : (
                mensagens.map((m: any) => {
                  const meu = m.autor_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${meu ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 ${meu ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <div className="flex items-center gap-2 text-xs opacity-80">
                          <span className="font-medium">{m.autor_nome ?? "—"}</span>
                          <span>{formatData(m.criado_em)} {formatHora(m.criado_em)}</span>
                          {meu && (
                            <button onClick={() => apagarMsg.mutate(m.id)} className="ml-1 opacity-60 hover:opacity-100">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        {m.tipo === "texto" ? (
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.conteudo}</p>
                        ) : (
                          <div className="mt-1 space-y-1">
                            <audio controls src={urlAudio(m.audio_path)} className="h-9 w-full max-w-xs" />
                            {m.audio_duracao_seg ? <Badge variant="outline" className="text-xs">{m.audio_duracao_seg}s</Badge> : null}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={listEndRef} />
            </div>

            {/* Input */}
            <div className="border-t pt-3">
              {gravando ? (
                <div className="flex items-center gap-3 rounded-md border border-rose-300 bg-rose-50 dark:bg-rose-950/20 px-3 py-2">
                  <Mic className="h-4 w-4 animate-pulse text-rose-600" />
                  <span className="font-mono text-sm">Gravando... {duracao}s</span>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" onClick={stopGravacao}>
                    <Square className="h-4 w-4" /> Parar e enviar
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); enviarTexto.mutate(); }}
                  className="flex items-center gap-2"
                >
                  <Input
                    placeholder={canalAtual ? "Escreva uma mensagem..." : "Selecione um canal"}
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    disabled={!canalAtual}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={startGravacao}
                    disabled={!canalAtual}
                    title="Gravar áudio"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Button type="submit" disabled={!canalAtual || !texto.trim() || enviarTexto.isPending}>
                    <Send className="h-4 w-4" /> Enviar
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
