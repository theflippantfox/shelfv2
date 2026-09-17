import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import {
  suppliers,
  products,
  shops,
  purchaseOrders,
  purchaseOrderItems,
  stockAdjustments,
} from "@shelf/db";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

type Variables = { user: User };

export const suppliersRouter = new OpenAPIHono<{ Variables: Variables }>();
suppliersRouter.use("*", authMiddleware);

async function assertShopOwnership(shopId: string, userId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop || shop.ownerId !== userId)
    throw new HTTPException(403, { message: "Unauthorized" });
}

// ── LIST SUPPLIERS ─────────────────────────────────────────────
const listRoute = createRoute({
  method: "get",
  path: "/",
  request: { query: z.object({ shopId: z.string().uuid() }) },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "List suppliers",
    },
  },
});

suppliersRouter.openapi(listRoute, async (c) => {
  const { shopId } = c.req.valid("query");
  const user = c.get("user");
  await assertShopOwnership(shopId, user.id);
  const rows = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.shopId, shopId))
    .orderBy(desc(suppliers.createdAt));
  return c.json(rows);
});

// ── CREATE SUPPLIER ────────────────────────────────────────────
const createRoute_def = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            shopId: z.string().uuid(),
            name: z.string().min(1),
            contactName: z.string().optional(),
            phone: z.string().optional(),
            email: z.string().optional(),
            address: z.string().optional(),
            paymentTerms: z.string().default("net30"),
            currencyCode: z.string().default("INR"),
            leadTimeDays: z.number().optional(),
            notes: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Created",
    },
  },
});

suppliersRouter.openapi(createRoute_def, async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  await assertShopOwnership(body.shopId, user.id);
  const [created] = await db.insert(suppliers).values(body).returning();
  return c.json(created, 201);
});

// ── UPDATE SUPPLIER ────────────────────────────────────────────
const updateRoute = createRoute({
  method: "patch",
  path: "/{id}",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().optional(),
            contactName: z.string().optional(),
            phone: z.string().optional(),
            email: z.string().optional(),
            address: z.string().optional(),
            paymentTerms: z.string().optional(),
            leadTimeDays: z.number().optional(),
            notes: z.string().optional(),
            isActive: z.boolean().optional(),
          }),
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

suppliersRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const [updated] = await db
    .update(suppliers)
    .set(body)
    .where(eq(suppliers.id, id))
    .returning();
  if (!updated) throw new HTTPException(404, { message: "Supplier not found" });
  return c.json(updated);
});

// ── DELETE SUPPLIER ────────────────────────────────────────────
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ ok: z.boolean() }) },
      },
      description: "Deleted",
    },
  },
});

suppliersRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  await db.delete(suppliers).where(eq(suppliers.id, id));
  return c.json({ ok: true });
});
