import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function usePermissions(projetoId?: string) {
  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["project-role", projetoId],
    enabled: !!projetoId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("papel_no_projeto", {
        p_projeto_id: projetoId!,
      });
      if (error) throw error;
      return (data ?? null) as string | null;
    },
  });

  const { data: permSet, isLoading: permsLoading } = useQuery({
    queryKey: ["minhas-permissoes", projetoId],
    enabled: !!projetoId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("minhas_permissoes", {
        p_projeto: projetoId!,
      });
      if (error) throw error;
      const set = new Set<string>();
      for (const row of (data ?? []) as Array<{ recurso: string; acao: string }>) {
        set.add(`${row.recurso}|${row.acao}`);
      }
      return set;
    },
  });

  const isOwner = role === "owner";
  const isSuperUser = role === "owner" || role === "admin" || role === "producao";
  const isLoading = roleLoading || permsLoading;

  function can(recurso: string, acao: string): boolean {
    if (!projetoId) return false;
    if (isLoading) return false;
    if (isOwner) return true;
    if (!permSet) return false;
    return permSet.has(`${recurso}|${acao}`);
  }

  return { can, isOwner, isSuperUser, isLoading, role };
}
