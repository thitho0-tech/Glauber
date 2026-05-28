import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ProjectKPIs } from "@/types/dashboard";

const POLLING_INTERVAL_MS = 5_000;

async function fetchKPIs(projectId: string): Promise<ProjectKPIs | null> {
  const { data, error } = await supabase
    .from("projeto_kpis")
    .select("*")
    .eq("projeto_id", projectId)
    .single();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    prazos_criticos: Array.isArray(data.prazos_criticos)
      ? data.prazos_criticos
      : [],
    proximos_eventos: Array.isArray(data.proximos_eventos)
      ? data.proximos_eventos
      : [],
  } as ProjectKPIs;
}

export function useProjectKPIs(projectId: string) {
  const [kpis, setKPIs] = useState<ProjectKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Ref para saber se o componente ainda está montado
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!projectId) return;

    // ── Carga inicial ─────────────────────────────────────────
    fetchKPIs(projectId)
      .then((data) => {
        if (!mountedRef.current) return;
        setKPIs(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    // ── Supabase Realtime ─────────────────────────────────────
    const channel = supabase
      .channel(`projeto_kpis:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projeto_kpis",
          filter: `projeto_id=eq.${projectId}`,
        },
        (payload) => {
          if (!mountedRef.current) return;
          if (payload.eventType === "DELETE") {
            setKPIs(null);
            return;
          }
          const row = payload.new as ProjectKPIs;
          setKPIs({
            ...row,
            prazos_criticos: Array.isArray(row.prazos_criticos)
              ? row.prazos_criticos
              : [],
            proximos_eventos: Array.isArray(row.proximos_eventos)
              ? row.proximos_eventos
              : [],
          });
        }
      )
      .subscribe();

    // ── Fallback: polling a cada 5s se Realtime cair ──────────
    const pollTimer = setInterval(() => {
      if (!mountedRef.current) return;
      fetchKPIs(projectId)
        .then((data) => {
          if (!mountedRef.current) return;
          setKPIs(data);
        })
        .catch(() => {
          // silencia — o Realtime já cobre
        });
    }, POLLING_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  return { kpis, loading, error };
}
