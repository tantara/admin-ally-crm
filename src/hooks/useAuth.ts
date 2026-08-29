import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const resolveRole = async (next: Session | null) => {
      if (!next) {
        if (active) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", next.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!active) return;
      setIsAdmin(Boolean(data));
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void resolveRole(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(true);
      void resolveRole(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, isAdmin, loading };
}
