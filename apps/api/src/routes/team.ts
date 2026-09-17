import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import { shopMembers, shops } from "@shelf/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

type Variables = { user: User };

export const teamRouter = new OpenAPIHono<{ Variables: Variables }>();
teamRouter.use("*", authMiddleware);

async function assertOwnerOrAdmin(shopId: string, userId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop) throw new HTTPException(404, { message: "Shop not found" });
  if (shop.ownerId !== userId) {
    const [member] = await db
      .select()
      .from(shopMembers)
      .where(
        and(eq(shopMembers.shopId, shopId), eq(shopMembers.userId, userId)),
      );
    if (!member || member.role !== "admin")
      throw new HTTPException(403, { message: "Owner or admin required" });
  }
}

// ── INVITE MEMBER ──────────────────────────────────────────────
const inviteRoute = createRoute({
  method: "post",
  path: "/invite",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            shopId: z.string().uuid(),
            email: z.string().email(),
            role: z.enum(["admin", "cashier", "inventory"]).default("cashier"),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Invited",
    },
    400: {
      content: { "application/json": { schema: z.any() } },
      description: "Error",
    },
  },
});

teamRouter.openapi(inviteRoute, async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  await assertOwnerOrAdmin(body.shopId, user.id);

  // Look up user by email via Supabase Auth admin REST API
  const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(body.email)}`,
    {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    },
  );
  const { users } = (await res.json()) as { users: { id: string }[] };
  const authUser = users?.[0];
  if (!authUser) {
    return c.json(
      { error: "No user found with that email. They need to sign up first." },
      400,
    );
  }

  // Check if already a member
  const [existing] = await db
    .select()
    .from(shopMembers)
    .where(
      and(
        eq(shopMembers.shopId, body.shopId),
        eq(shopMembers.userId, authUser.id),
      ),
    );
  if (existing) {
    return c.json({ error: "User is already a member of this shop" }, 400);
  }

  const [member] = await db
    .insert(shopMembers)
    .values({
      shopId: body.shopId,
      userId: authUser.id,
      role: body.role,
    })
    .returning();

  return c.json(member, 201);
});

// ── REMOVE MEMBER ──────────────────────────────────────────────
const removeRoute = createRoute({
  method: "delete",
  path: "/{id}",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ ok: z.boolean() }) },
      },
      description: "Removed",
    },
  },
});

teamRouter.openapi(removeRoute, async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  // Get the member record
  const [member] = await db
    .select()
    .from(shopMembers)
    .where(eq(shopMembers.id, id));
  if (!member) throw new HTTPException(404, { message: "Member not found" });

  // Can't remove the owner
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.id, member.shopId));
  if (shop && shop.ownerId === member.userId)
    throw new HTTPException(400, { message: "Cannot remove the shop owner" });

  await assertOwnerOrAdmin(member.shopId, user.id);
  await db.delete(shopMembers).where(eq(shopMembers.id, id));
  return c.json({ ok: true });
});

// ── UPDATE ROLE ────────────────────────────────────────────────
const updateRoleRoute = createRoute({
  method: "patch",
  path: "/{id}/role",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({ role: z.enum(["admin", "cashier", "inventory"]) }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated",
    },
  },
});

teamRouter.openapi(updateRoleRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { role } = c.req.valid("json");
  const user = c.get("user");

  const [member] = await db
    .select()
    .from(shopMembers)
    .where(eq(shopMembers.id, id));
  if (!member) throw new HTTPException(404, { message: "Member not found" });

  await assertOwnerOrAdmin(member.shopId, user.id);
  const [updated] = await db
    .update(shopMembers)
    .set({ role })
    .where(eq(shopMembers.id, id))
    .returning();
  return c.json(updated);
});
