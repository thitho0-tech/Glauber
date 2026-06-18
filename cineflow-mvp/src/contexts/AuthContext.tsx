import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  recoveryMode: boolean;
  setRecoveryMode: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  recoveryMode: false,
  setRecoveryMode: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryModeState] = useState(
    () => sessionStorage.getItem("cineflow_recovery") === "1",
  );

  function setRecoveryMode(v: boolean) {
    if (v) sessionStorage.setItem("cineflow_recovery", "1");
    else sessionStorage.removeItem("cineflow_recovery");
    setRecoveryModeState(v);
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, recoveryMode, setRecoveryMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
