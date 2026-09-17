import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import {
  purchaseOrders,
  purchaseOrderItems,
  products,
  suppliers,
  shops,
} from "@shelf/db";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

type Variables = { user: User };

export const purchaseOrdersRouter = new OpenAPIHono<{ Variables: Variables }>();
purchaseOrdersRouter.use("*", authMiddleware);

async function assertShopOwnership(shopId: string, userId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop || shop.ownerId !== userId)
    throw new HTTPException(403, { message: "Unauthorized" });
}

// ── LIST PURCHASE ORDERS ───────────────────────────────────────
const listRoute = createRoute({
  method: "get",
  path: "/",
  request: { query: z.object({ shopId: z.string().uuid() }) },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "List POs",
    },
  },
});

purchaseOrdersRouter.openapi(listRoute, async (c) => {
  const { shopId } = c.req.valid("query");
  const user = c.get("user");
  await assertShopOwnership(shopId, user.id);

  const rows = await db
    .select({
      id: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      notes: purchaseOrders.notes,
      expectedDate: purchaseOrders.expectedDate,
      receivedAt: purchaseOrders.receivedAt,
      createdAt: purchaseOrders.createdAt,
      supplierName: suppliers.name,
      supplierId: suppliers.id,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(eq(purchaseOrders.shopId, shopId))
    .orderBy(desc(purchaseOrders.createdAt));

  // Fetch items for each PO
  const result = [];
  for (const row of rows) {
    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, row.id));
    result.push({ ...row, items });
  }

  return c.json(result);
});

// ── CREATE PURCHASE ORDER ──────────────────────────────────────
const createRoute_def = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            shopId: z.string().uuid(),
            supplierId: z.string().uuid(),
            notes: z.string().optional(),
            expectedDate: z.string().optional(),
            items: z
              .array(
                z.object({
                  productId: z.string().uuid().optional(),
                  productName: z.string().min(1),
                  qty: z.number().int().positive(),
                  unitCost: z.number().positive(),
                }),
              )
              .min(1),
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

purchaseOrdersRouter.openapi(createRoute_def, async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  await assertShopOwnership(body.shopId, user.id);

  // Generate order number
  const count = await db.$count(
    purchaseOrders,
    eq(purchaseOrders.shopId, body.shopId),
  );
  const orderNumber = `PO-${(count + 1).toString().padStart(4, "0")}`;

  const totalAmount = body.items.reduce((s, i) => s + i.unitCost * i.qty, 0);

  const [po] = await db
    .insert(purchaseOrders)
    .values({
      shopId: body.shopId,
      supplierId: body.supplierId,
      orderNumber,
      totalAmount: totalAmount.toString(),
      notes: body.notes,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
      createdBy: user.id,
    })
    .returning();

  // Insert items
  const poItems = body.items.map((item) => ({
    purchaseOrderId: po.id,
    productId: item.productId ?? null,
    productName: item.productName,
    qty: item.qty,
    unitCost: item.unitCost.toString(),
    subtotal: (item.unitCost * item.qty).toString(),
  }));
  await db.insert(purchaseOrderItems).values(poItems);

  return c.json({ ...po, items: poItems }, 201);
});

// ── UPDATE PO STATUS ───────────────────────────────────────────
const updateStatusRoute = createRoute({
  method: "patch",
  path: "/{id}/status",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.enum(["ordered", "received", "cancelled"]),
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

purchaseOrdersRouter.openapi(updateStatusRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { status } = c.req.valid("json");

  const updateData: any = { status, updatedAt: new Date() };

  // If received, increment product inventory
  if (status === "received") {
    updateData.receivedAt = new Date();

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));
    for (const item of items) {
      if (item.productId) {
        await db
          .update(products)
          .set({ qty: sql`${products.qty} + ${item.qty}` })
          .where(eq(products.id, item.productId));
      }
    }
  }

  const [updated] = await db
    .update(purchaseOrders)
    .set(updateData)
    .where(eq(purchaseOrders.id, id))
    .returning();
  if (!updated) throw new HTTPException(404, { message: "PO not found" });
  return c.json(updated);
});

// ── DELETE PURCHASE ORDER ──────────────────────────────────────
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

purchaseOrdersRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  // Only allow deleting drafts
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, id));
  if (po && po.status !== "draft")
    throw new HTTPException(400, { message: "Can only delete draft POs" });
  await db
    .delete(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, id));
  await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  return c.json({ ok: true });
});
