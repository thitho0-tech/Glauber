import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Hook central de permissões (modelo composite, Sprint 5 Bloco A).
 *
 * can(recurso, acao):
 *   - Enquanto perm_funcao_grants estiver vazio (Bloco B pendente),
 *     cai no comportamento legado: isSuperUser (owner/admin/producao).
 *   - Após Bloco B seedar os grants, substituir pelo resolver pode().
 *
 * OWNER = projetos.criado_por — permanente, não delegável.
 */
export function usePermissions(projetoId?: string) {
  // Papel RBAC do usuário no projeto (mesmo cache key de useProjectRole)
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

  // Detecta se o seed do Bloco B já foi aplicado.
  // Em caso de erro (tabela ainda não existe), retorna false → fallback legado.
  const { data: grantsSeeded, isLoading: grantsLoading } = useQuery({
    queryKey: ["perm-grants-seeded"],
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from("perm_funcao_grants")
          .select("*", { count: "exact", head: true });
        if (error) return false;
        return (count ?? 0) > 0;
      } catch {
        return false;
      }
    },
  });

  const isSuperUser = role === "owner" || role === "admin" || role === "producao";
  const isOwner = role === "owner";

  /**
   * Verifica se o usuário pode executar `acao` sobre `recurso` no projeto.
   *
   * Bloco A (grants vazios): delega ao check legado de papel.
   * Bloco B (grants seedados): TODO — substituir por cache de pode() RPC.
   */
  function can(recurso: string, acao: string): boolean {
    if (!projetoId) return false;
    // Fallback: grants não seedados → comportamento legado
    if (!grantsSeeded) return isSuperUser;
    // TODO (Bloco B): buscar resultado de pode() do cache React Query
    // e acionar prefetch se ausente. Por ora mesmo fallback.
    return isSuperUser;
  }

  return {
    can,
    isOwner,
    isSuperUser,
    isLoading: roleLoading || grantsLoading,
    role,
  };
}
