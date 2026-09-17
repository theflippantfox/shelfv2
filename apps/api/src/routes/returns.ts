import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import {
  returns,
  returnItems,
  transactions,
  transactionItems,
  products,
  customers,
  shops,
} from "@shelf/db";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

type Variables = { user: User };

const ReturnItemSchema = z.object({
  id: z.string().uuid(),
  returnId: z.string().uuid(),
  transactionItemId: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  productName: z.string(),
  qty: z.number(),
  unitPrice: z.string(),
  subtotal: z.string(),
  condition: z.string(),
});

const ReturnSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  transactionId: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  reason: z.string(),
  method: z.string(),
  refundAmount: z.string(),
  notes: z.string().nullable(),
  status: z.string(),
  processedBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  items: z.array(ReturnItemSchema).optional(),
});

export const returnsRouter = new OpenAPIHono<{ Variables: Variables }>();
returnsRouter.use("*", authMiddleware);

async function assertShopOwnership(shopId: string, userId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop || shop.ownerId !== userId) {
    throw new HTTPException(403, { message: "Unauthorized" });
  }
  return shop;
}

/** POST /returns — Process a return/refund */
const createReturnRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            shopId: z.string().uuid(),
            transactionId: z.string().uuid(),
            customerId: z.string().uuid().nullable().optional(),
            reason: z.string(),
            method: z.string(),
            refundAmount: z.string(),
            notes: z.string().nullable().optional(),
            items: z.array(
              z.object({
                transactionItemId: z.string().uuid(),
                productId: z.string().uuid().nullable(),
                productName: z.string(),
                qty: z.number().int().min(1),
                unitPrice: z.string(),
                subtotal: z.string(),
                condition: z.string(),
              }),
            ),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: ReturnSchema,
          }),
        },
      },
      description: "Return processed",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(false),
            error: z.string(),
          }),
        },
      },
      description: "Bad Request",
    },
  },
});

returnsRouter.openapi(createReturnRoute, async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  await assertShopOwnership(body.shopId, user.id);

  try {
    const result = await db.transaction(async (tx) => {
      // Create the return record
      const [newReturn] = await tx
        .insert(returns)
        .values({
          shopId: body.shopId,
          transactionId: body.transactionId,
          customerId: body.customerId ?? null,
          reason: body.reason,
          method: body.method,
          refundAmount: body.refundAmount,
          notes: body.notes ?? null,
          status: "completed",
          processedBy: user.id,
        })
        .returning();

      // Insert return items
      const itemsToInsert = body.items.map((item) => ({
        returnId: newReturn.id,
        transactionItemId: item.transactionItemId,
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        condition: item.condition,
      }));

      const insertedItems = await tx
        .insert(returnItems)
        .values(itemsToInsert)
        .returning();

      // Restore inventory for resellable items
      for (const item of body.items) {
        if (item.productId && item.condition === "resellable") {
          await tx.execute(
            sql`UPDATE products SET qty = qty + ${item.qty} WHERE id = ${item.productId}`,
          );
        }
      }

      // If this was a credit sale, reduce the outstanding balance
      if (body.method === "credit_note" && body.customerId) {
        await tx.execute(
          sql`UPDATE customers SET outstanding_balance = GREATEST(outstanding_balance - ${body.refundAmount}::numeric, 0) WHERE id = ${body.customerId}`,
        );
      }

      // Update the original transaction status
      await tx.execute(
        sql`UPDATE transactions SET status = 'refunded' WHERE id = ${body.transactionId}`,
      );

      return { newReturn, insertedItems };
    });

    return c.json(
      {
        success: true as const,
        data: {
          ...result.newReturn,
          createdAt: result.newReturn.createdAt.toISOString(),
          items: result.insertedItems,
        },
      },
      201,
    );
  } catch (err: any) {
    console.error("Return error", err);
    return c.json(
      { success: false as const, error: "Failed to process return." },
      400,
    );
  }
});

/** GET /returns — List returns for a shop */
const listReturnsRoute = createRoute({
  method: "get",
  path: "/",
  request: {
    query: z.object({ shopId: z.string().uuid() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(ReturnSchema),
          }),
        },
      },
      description: "List returns",
    },
  },
});

returnsRouter.openapi(listReturnsRoute, async (c) => {
  const { shopId } = c.req.valid("query");
  const user = c.get("user");

  await assertShopOwnership(shopId, user.id);

  const result = await db
    .select()
    .from(returns)
    .where(eq(returns.shopId, shopId))
    .orderBy(desc(returns.createdAt))
    .limit(100);

  // Fetch return items
  const returnIds = result.map((r) => r.id);
  const allItems =
    returnIds.length > 0
      ? await db
          .select()
          .from(returnItems)
          .where(sql`${returnItems.returnId} IN ${returnIds}`)
      : [];
  const itemsByReturn = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const list = itemsByReturn.get(item.returnId) ?? [];
    list.push(item);
    itemsByReturn.set(item.returnId, list);
  }

  return c.json({
    success: true as const,
    data: result.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      items: itemsByReturn.get(r.id) ?? [],
    })),
  });
});
