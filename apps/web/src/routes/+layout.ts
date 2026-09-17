import { createBrowserClient, isBrowser } from "@supabase/ssr";
import type { LayoutLoad } from "./$types";
import { env } from "$env/dynamic/public";
import { getApiClient } from "$lib/api";

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
      depends("supabase:auth");

      // The session and user are already validated by hooks.server.ts + layout.server.ts
      // Re-use them directly instead of creating a new Supabase client that can't access
      // server-side cookies (SSR) or browser cookies (client hydration).
      const session = data.session;
      const user = data.user;

      const supabaseUrl = env.PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
      const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY || "mock-key";

      // Create Supabase client for client-side use (after hydration)
      const supabase = isBrowser()
            ? createBrowserClient(supabaseUrl, supabaseKey, {
                    global: { fetch },
              })
            : createBrowserClient(supabaseUrl, supabaseKey, {
                    global: { fetch },
                    cookies: {
                          getAll() {
                                return [];
                          },
                          setAll() {
                                return;
                          },
                    },
              });

      // Build the API client with the session token from the server layout
      const client: any = getApiClient(
            fetch,
            session?.access_token
                  ? { Authorization: `Bearer ${session.access_token}` }
                  : undefined,
      );

      return { supabase, session, user, client };
};
