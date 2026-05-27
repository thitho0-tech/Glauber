import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Org, Membership } from "@/types/database";

export function useOrgs(userId: string | undefined) {
  return useQuery({
    queryKey: ["orgs", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("papel, departamento, ativo, org_id, orgs(*)")
        .eq("user_id", userId!)
        .eq("ativo", true);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        membership: row as Membership,
        org: row.orgs as Org,
      }));
    },
  });
}
