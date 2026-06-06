import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type ProjectFuncao = {
  funcao_av_id: string;
  nome: string;
  departamento: string;
};

export function useProjectFunction(projetoId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["project-funcao", projetoId],
    enabled: !!projetoId,
    staleTime: 60_000,
    queryFn: async (): Promise<ProjectFuncao | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return null;

      // Encontra o projeto_pessoas do usuário via email match
      const { data: pps } = await supabase
        .from("projeto_pessoas")
        .select("id, pessoa:pessoas!inner(email)")
        .eq("projeto_id", projetoId!)
        .is("deleted_at", null);

      const meu = (pps as any[] ?? []).find(
        (p: any) => p.pessoa?.email?.toLowerCase() === user.email!.toLowerCase()
      );
      if (!meu) return null;

      // Busca a função principal (ou a primeira, se não há principal marcada)
      const { data: funcoes } = await supabase
        .from("projeto_pessoa_funcoes")
        .select("funcao_av_id, principal, funcao_av:funcoes_av(id, nome, departamento)")
        .eq("projeto_pessoa_id", meu.id);

      if (!funcoes || funcoes.length === 0) return null;
      const principal = (funcoes as any[]).find((f) => f.principal) ?? funcoes[0];

      return {
        funcao_av_id: principal.funcao_av_id,
        nome: principal.funcao_av?.nome ?? "",
        departamento: principal.funcao_av?.departamento ?? "",
      };
    },
  });

  return { funcao: data ?? null, isLoading };
}
