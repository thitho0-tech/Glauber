import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useOrgs } from "@/hooks/useOrg";
import { useSidebar } from "@/hooks/useSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { useProjectRole } from "@/hooks/useProjectRole";
import { useProjectFunction } from "@/hooks/useProjectFunction";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  producao: "Produção",
  departamento: "Equipe",
  leitor: "Leitor",
};

export function Topbar() {
  const { user } = useAuth();
  const { data: orgs } = useOrgs(user?.id);
  const minhaOrg = orgs?.[0]?.org.nome ?? "Sua Produtora";
  const toggle = useSidebar((s) => s.toggle);

  // Contexto do projeto ativo (quando navegando dentro de um projeto)
  const { id: projetoId } = useParams();
  const emProjeto = !!projetoId;
  const { role } = useProjectRole(projetoId);
  const { funcao } = useProjectFunction(projetoId);

  // Projeto + org proponente (quem criou/é dona do projeto)
  const { data: projeto } = useQuery({
    queryKey: ["topbar-projeto", projetoId],
    enabled: emProjeto,
    queryFn: async () => {
      const { data } = await supabase
        .from("projetos")
        .select("nome, org:orgs(nome)")
        .eq("id", projetoId)
        .maybeSingle();
      return data;
    },
  });

  // Nome do usuário DENTRO deste projeto (match por e-mail em projeto_pessoas)
  const { data: meuNome } = useQuery({
    queryKey: ["topbar-user-nome", projetoId, user?.email],
    enabled: emProjeto && !!user?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("projeto_pessoas")
        .select("pessoa:pessoas!inner(nome, email)")
        .eq("projeto_id", projetoId)
        .is("deleted_at", null);
      const match = (data as any[] ?? []).find(
        (pp) => pp.pessoa?.email?.toLowerCase() === user!.email!.toLowerCase()
      );
      return match?.pessoa?.nome ?? null;
    },
  });

  // ── Textos derivados ──────────────────────────────────────────────────────
  const proponente = emProjeto
    ? ((projeto as any)?.org?.nome ?? minhaOrg)
    : minhaOrg;

  const nomeUsuario =
    meuNome ??
    (user?.user_metadata as any)?.nome ??
    (user?.user_metadata as any)?.full_name ??
    user?.email?.split("@")[0] ??
    "Usuário";

  // Função AV real; fallback para o nível de acesso (Owner/Admin/Equipe...)
  const funcaoLabel = funcao?.nome || (role ? (ROLE_LABEL[role] ?? role) : null);

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggle} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Produtora</p>
          <div className="flex items-center gap-2 min-w-0">
            <p className="truncate text-sm font-semibold">{proponente}</p>
            {emProjeto && (projeto as any)?.nome && (
              <>
                <span className="text-muted-foreground">·</span>
                <p className="truncate text-sm font-semibold text-primary">{(projeto as any).nome}</p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:block">
          <NotificationBell />
        </div>
        <div className="hidden text-right text-sm md:block">
          {emProjeto ? (
            <>
              <p className="font-medium truncate max-w-[200px]">{nomeUsuario}</p>
              {funcaoLabel && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{funcaoLabel}</p>
              )}
            </>
          ) : (
            <p className="font-medium">{user?.email}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
