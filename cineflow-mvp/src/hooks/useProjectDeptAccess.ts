import { useProjectRole } from "./useProjectRole";
import { useProjectFunction } from "./useProjectFunction";

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
// admin/owner/producao (isSuperUser) editam tudo independente deste mapa
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

export function useProjectDeptAccess(projetoId?: string) {
  const { role, isLoading: rLoading } = useProjectRole(projetoId);
  const { funcao, isLoading: fLoading } = useProjectFunction(projetoId);

  const isSuperUser = role === "owner" || role === "admin" || role === "producao";
  const dept = funcao?.departamento ?? "";

  function canEditSection(section: Section): boolean {
    if (!projetoId) return false;
    if (isSuperUser) return true;
    return (DEPT_EDIT_MAP[dept] ?? []).includes(section);
  }

  return {
    isLoading: rLoading || fLoading,
    isSuperUser,
    canEditSection,
    dept,
    role,
  };
}
