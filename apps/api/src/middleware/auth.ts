import { createClient } from "@supabase/supabase-js";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
// We use the basic Supabase client configuration
// Standard Deno/Bun pattern requires manually pulling environment variables,
// using context bindings if they map accurately with Hono Variables

const supabaseUrl =
  process.env.PUBLIC_SUPABASE_URL || "https://mock.supabase.co";
// We shouldn't use ANON KEY for fully verifying JWTs natively without fetching,
// but Supabase's `getUser()` securely validates the token against the Supabase Auth server directly.
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";

const supabase = createClient(supabaseUrl, supabaseKey);

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HTTPException(401, {
      message: "Unauthorized: Missing bearer token",
    });
  }

  const token = authHeader.split(" ")[1];

  // Retrieve the authorized user based on the JWT token
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new HTTPException(401, {
      message: "Unauthorized: Invalid or expired token",
    });
  }

  // Inject the validated user object into Hono's route context for downstream availability
  c.set("user", user);

  await next();
};
