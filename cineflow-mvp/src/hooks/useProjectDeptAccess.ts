import { usePermissions } from "./usePermissions";
import { useProjectFunction } from "./useProjectFunction";
import type { ProjectRole } from "./useProjectRole";

export type Section =
  | "producao"
  | "roteiro"
  | "direcao"
  | "arte"
  | "fotografia"
  | "som"
  | "elenco"
  | "pos"
  | "agenda"
  | "od"
  | "mapa_transporte"
  | "administrativo";

// Mapa: departamento → seções que o membro pode EDITAR
// isSuperUser (owner/admin/producao) edita tudo, independente deste mapa
const DEPT_EDIT_MAP: Record<string, Section[]> = {
  producao:      ["producao", "roteiro", "direcao", "arte", "fotografia", "som", "elenco", "pos", "agenda", "od", "mapa_transporte", "administrativo"],
  direcao:       ["roteiro", "direcao", "arte", "fotografia", "som", "elenco", "pos", "agenda", "od"],
  arte:          ["arte", "elenco"],
  figurino:      ["arte", "elenco"],
  fotografia:    ["fotografia", "pos"],
  som:           ["som", "pos"],
  elenco:        ["elenco"],
  pos_producao:  ["pos"],
  logistica:     ["mapa_transporte"],
  desenvolvimento: ["roteiro"],
  maquiagem:     ["arte"],
  outros:        [],
};

/** Adapter fino sobre usePermissions — mantém API idêntica à versão legada. */
export function useProjectDeptAccess(projetoId?: string) {
  const { isSuperUser, isLoading: pLoading, role } = usePermissions(projetoId);
  const { funcao, isLoading: fLoading } = useProjectFunction(projetoId);

  const dept = funcao?.departamento ?? "";

  function canEditSection(section: Section): boolean {
    if (!projetoId) return false;
    if (isSuperUser) return true;
    return (DEPT_EDIT_MAP[dept] ?? []).includes(section);
  }

  return {
    isLoading: pLoading || fLoading,
    isSuperUser,
    canEditSection,
    dept,
    role: (role ?? null) as ProjectRole,
  };
}
