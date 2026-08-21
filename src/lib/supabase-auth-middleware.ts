import { createMiddleware } from "@tanstack/react-start";

/**
 * Client-side bearer attachment for server functions.
 *
 * This intentionally replaces the generated `attachSupabaseAuth`: that module
 * imports the Supabase client at module scope, which pulled ~54 kB (gzip) of
 * auth SDK into the first byte of every route — including the landing page,
 * which never talks to the backend. The dynamic import here defers that cost
 * to the first server-function call, with identical behaviour.
 */
export const attachSupabaseAuthLazy = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
    } catch {
      return next({ headers: {} });
    }
  },
);
