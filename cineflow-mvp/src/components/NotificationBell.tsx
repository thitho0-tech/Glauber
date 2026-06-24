import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bell, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

function playBeep() {
  if (localStorage.getItem("glauber_notif_som") === "false") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => ctx.close();
  } catch {}
}

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: notifs } = useQuery({
    queryKey: ["notificacoes-inapp", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes_inapp")
        .select("*")
        .eq("user_id", user!.id)
        .order("criado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const marcarLida = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notificacoes_inapp").update({ lida: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes-inapp", user?.id] }),
  });

  const marcarTodasLidas = useMutation({
    mutationFn: async () => {
      await supabase
        .from("notificacoes_inapp")
        .update({ lida: true })
        .eq("user_id", user!.id)
        .eq("lida", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes-inapp", user?.id] }),
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes_inapp",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notificacoes-inapp", user.id] });
          playBeep();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const naoLidas = (notifs ?? []).filter((n: any) => !n.lida).length;

  function handleClick(n: any) {
    if (!n.lida) marcarLida.mutate(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  }

  function formatRelative(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `${min}min atrás`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h atrás`;
    return `${Math.floor(h / 24)}d atrás`;
  }

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="ghost"
        className="relative"
        onClick={() => setOpen((v) => !v)}
        title="Notificações"
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-popover shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">Notificações</span>
              {naoLidas > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => marcarTodasLidas.mutate()}
                >
                  Marcar todas como lidas
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {(notifs ?? []).length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma notificação.</p>
              ) : (
                (notifs ?? []).map((n: any) => (
                  <button
                    key={n.id}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
                      !n.lida ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleClick(n)}
                  >
                    {!n.lida && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    {n.lida && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{n.titulo}</p>
                      {n.mensagem && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.mensagem}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">{formatRelative(n.criado_em)}</p>
                    </div>
                    {n.link && <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
