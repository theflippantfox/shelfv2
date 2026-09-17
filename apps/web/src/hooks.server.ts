import { createServerClient } from "@supabase/ssr";
import { redirect, type Handle } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";

const supabaseUrl = env.PUBLIC_SUPABASE_URL;
const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️  Missing Supabase env vars in hooks.server.ts:", {
    url: supabaseUrl,
    key: supabaseKey,
  });
}

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize Supabase SSR client, mapping cookies to SvelteKit's cookie API
  event.locals.supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: "/" });
        });
      },
    },
  });

  // Session validation: reads the JWT from cookies and verifies it via Supabase.
  // getSession() reads from the local JWT (no network call), getUser() validates it.
  event.locals.safeGetSession = async () => {
    try {
      const {
        data: { session },
      } = await event.locals.supabase.auth.getSession();

      if (!session) {
        return { session: null, user: null };
      }

      const {
        data: { user },
        error,
      } = await event.locals.supabase.auth.getUser();

      if (error) {
        return { session: null, user: null };
      }

      return { session, user };
    } catch (_err) {
      console.error("Session validation error:", _err);
      return { session: null, user: null };
    }
  };

  const { user } = await event.locals.safeGetSession();

  // Redirect unauthenticated users away from protected routes
  if (event.url.pathname.startsWith("/dashboard") && !user) {
    throw redirect(303, "/login");
  }

  // Redirect authenticated users away from the login page
  if (event.url.pathname === "/login" && user) {
    throw redirect(303, "/dashboard");
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === "content-range" || name === "x-supabase-api-version";
    },
  });
};
