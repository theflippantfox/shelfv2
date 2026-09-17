import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import { stockAdjustments, products, shops } from "@shelf/db";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

type Variables = { user: User };

export const stockAdjustmentsRouter = new OpenAPIHono<{
  Variables: Variables;
}>();
stockAdjustmentsRouter.use("*", authMiddleware);

async function assertShopOwnership(shopId: string, userId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop || shop.ownerId !== userId)
    throw new HTTPException(403, { message: "Unauthorized" });
}

// ── LIST ADJUSTMENTS ───────────────────────────────────────────
const listRoute = createRoute({
  method: "get",
  path: "/",
  request: { query: z.object({ shopId: z.string().uuid() }) },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "List adjustments",
    },
  },
});

stockAdjustmentsRouter.openapi(listRoute, async (c) => {
  const { shopId } = c.req.valid("query");
  const user = c.get("user");
  await assertShopOwnership(shopId, user.id);

  const rows = await db
    .select({
      id: stockAdjustments.id,
      productId: stockAdjustments.productId,
      productName: products.name,
      previousQty: stockAdjustments.previousQty,
      adjustmentQty: stockAdjustments.adjustmentQty,
      newQty: stockAdjustments.newQty,
      reason: stockAdjustments.reason,
      notes: stockAdjustments.notes,
      createdAt: stockAdjustments.createdAt,
    })
    .from(stockAdjustments)
    .leftJoin(products, eq(stockAdjustments.productId, products.id))
    .where(eq(stockAdjustments.shopId, shopId))
    .orderBy(desc(stockAdjustments.createdAt))
    .limit(100);

  return c.json(rows);
});

// ── CREATE ADJUSTMENT ──────────────────────────────────────────
const createRoute_def = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            shopId: z.string().uuid(),
            productId: z.string().uuid(),
            adjustmentQty: z.number().int(),
            reason: z.enum([
              "manual",
              "damaged",
              "expired",
              "count_correction",
              "returned",
            ]),
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

stockAdjustmentsRouter.openapi(createRoute_def, async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  await assertShopOwnership(body.shopId, user.id);

  // Get current product qty
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, body.productId));
  if (!product) throw new HTTPException(404, { message: "Product not found" });

  const previousQty = product.qty;
  const newQty = previousQty + body.adjustmentQty;

  if (newQty < 0)
    throw new HTTPException(400, {
      message: "Adjustment would result in negative stock",
    });

  // Update product qty
  await db
    .update(products)
    .set({ qty: newQty })
    .where(eq(products.id, body.productId));

  // Record adjustment
  const [created] = await db
    .insert(stockAdjustments)
    .values({
      shopId: body.shopId,
      productId: body.productId,
      previousQty,
      adjustmentQty: body.adjustmentQty,
      newQty,
      reason: body.reason,
      notes: body.notes,
      createdBy: user.id,
    })
    .returning();

  return c.json({ ...created, productName: product.name }, 201);
});
