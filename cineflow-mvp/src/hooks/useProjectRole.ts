import { usePermissions } from "./usePermissions";

export type ProjectRole = "owner" | "admin" | "producao" | "departamento" | "leitor" | null;

const RANK: Record<Exclude<ProjectRole, null>, number> = {
  owner: 1,
  admin: 2,
  producao: 3,
  departamento: 4,
  leitor: 5,
};

/** Adapter fino sobre usePermissions — mantém API idêntica à versão legada. */
export function useProjectRole(projetoId?: string) {
  const { role: rawRole, isLoading } = usePermissions(projetoId);

  const role: ProjectRole = (rawRole ?? null) as ProjectRole;

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
