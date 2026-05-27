import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type ProjectRole = "owner" | "admin" | "producao" | "departamento" | "leitor" | null;

const RANK: Record<Exclude<ProjectRole, null>, number> = {
  owner: 1,
  admin: 2,
  producao: 3,
  departamento: 4,
  leitor: 5,
};

export function useProjectRole(projetoId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["project-role", projetoId],
    enabled: !!projetoId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("papel_no_projeto", { p_projeto_id: projetoId! });
      if (error) throw error;
      return (data ?? null) as ProjectRole;
    },
  });

  const role: ProjectRole = data ?? null;
  const can = (min: Exclude<ProjectRole, null>) => {
    if (!role) return false;
    return RANK[role] <= RANK[min];
  };

  return {
    role,
    isLoading,
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
    canEdit: can("producao"),
    canRead: !!role,
    can,
  };
}
