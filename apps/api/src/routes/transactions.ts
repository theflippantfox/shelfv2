import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import { transactions, transactionItems, shops, customers } from "@shelf/db";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

type Variables = { user: User };

const TransactionItemSchema = z.object({
  id: z.string().uuid(),
  transactionId: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  productName: z.string(),
  qty: z.number(),
  unitPrice: z.string(),
  subtotal: z.string(),
});

const TransactionSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  cashierId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  totalAmount: z.string(),
  taxAmount: z.string(),
  discountType: z.string().nullable().optional(),
  discountValue: z.string().optional(),
  discountAmount: z.string(),
  roundOff: z.string().optional(),
  paymentMethod: z.string(),
  paymentSplits: z.any().nullable().optional(),
  creditStatus: z.string().nullable().optional(),
  creditAmountPaid: z.string().optional(),
  status: z.string(),
  receiptId: z.string(),
  createdAt: z.string(),
  items: z.array(TransactionItemSchema).optional(),
});

export const transactionRouter = new OpenAPIHono<{ Variables: Variables }>();
transactionRouter.use("*", authMiddleware);

async function assertShopOwnership(shopId: string, userId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop || shop.ownerId !== userId) {
    throw new HTTPException(403, { message: "Unauthorized" });
  }
  return shop;
}

/** GET /transactions */
const listTransactionsRoute = createRoute({
  method: "get",
  path: "/",
  request: {
    query: z.object({
      shopId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(TransactionSchema),
          }),
        },
      },
      description: "List transactions for a shop",
    },
  },
});

transactionRouter.openapi(listTransactionsRoute, async (c) => {
  const { shopId } = c.req.valid("query");
  const user = c.get("user");

  await assertShopOwnership(shopId, user.id);

  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.shopId, shopId))
    .orderBy(desc(transactions.createdAt))
    .limit(100);

  // Fetch transaction items for all transactions in one query
  const txIds = result.map((r) => r.id);
  const allItems =
    txIds.length > 0
      ? await db
          .select()
          .from(transactionItems)
          .where(inArray(transactionItems.transactionId, txIds))
      : [];
  const itemsByTx = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const list = itemsByTx.get(item.transactionId) ?? [];
    list.push(item);
    itemsByTx.set(item.transactionId, list);
  }

  // Fetch customer names
  const customerIds = [
    ...new Set(result.map((r) => r.customerId).filter(Boolean)),
  ] as string[];
  const customerMap = new Map<string, string>();
  if (customerIds.length > 0) {
    const custs = await db
      .select()
      .from(customers)
      .where(inArray(customers.id, customerIds));
    for (const c of custs) customerMap.set(c.id, c.name);
  }

  return c.json({
    success: true as const,
    data: result.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      customerName: r.customerId
        ? (customerMap.get(r.customerId) ?? null)
        : null,
      items: itemsByTx.get(r.id) ?? [],
    })),
  });
});

/** GET /transactions/:id */
const getTransactionRoute = createRoute({
  method: "get",
  path: "/{id}",
  request: {
    params: z.object({ id: z.string().uuid() }),
    query: z.object({ shopId: z.string().uuid() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: TransactionSchema,
          }),
        },
      },
      description: "Get transaction by ID",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      description: "Not found",
    },
  },
});

transactionRouter.openapi(getTransactionRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { shopId } = c.req.valid("query");
  const user = c.get("user");

  await assertShopOwnership(shopId, user.id);

  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id));

  if (!tx || tx.shopId !== shopId) {
    throw new HTTPException(404, { message: "Transaction not found" });
  }

  const items = await db
    .select()
    .from(transactionItems)
    .where(eq(transactionItems.transactionId, id));

  let customerName: string | null = null;
  if (tx.customerId) {
    const [cust] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, tx.customerId));
    customerName = cust?.name ?? null;
  }

  return c.json({
    success: true as const,
    data: {
      ...tx,
      createdAt: tx.createdAt.toISOString(),
      customerName,
      items,
    },
  });
});

/** POST /transactions */
const createTransactionRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            shopId: z.string().uuid(),
            customerId: z.string().uuid().nullable().optional(),
            totalAmount: z.string(),
            taxAmount: z.string(),
            discountType: z.string().nullable().optional(),
            discountValue: z.string().optional(),
            discountAmount: z.string(),
            roundOff: z.string().optional(),
            paymentMethod: z.string(),
            paymentSplits: z.any().nullable().optional(),
            creditStatus: z.string().nullable().optional(),
            creditAmountPaid: z.string().optional(),
            items: z.array(
              z.object({
                productId: z.string().uuid().nullable(),
                productName: z.string(),
                qty: z.number().int().min(1),
                unitPrice: z.string(),
                subtotal: z.string(),
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
            data: TransactionSchema,
          }),
        },
      },
      description: "Create a transaction",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      description: "Bad Request",
    },
  },
});

transactionRouter.openapi(createTransactionRoute, async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  await assertShopOwnership(body.shopId, user.id);

  // Generate a friendly receipt ID
  const receiptId = `RCPT-${Math.floor(10000 + Math.random() * 90000)}`;

  try {
    const result = await db.transaction(async (tx) => {
      const [newTx] = await tx
        .insert(transactions)
        .values({
          shopId: body.shopId,
          cashierId: user.id,
          customerId: body.customerId ?? null,
          totalAmount: body.totalAmount,
          taxAmount: body.taxAmount,
          discountType: body.discountType ?? null,
          discountValue: body.discountValue ?? "0",
          discountAmount: body.discountAmount,
          roundOff: body.roundOff ?? "0",
          paymentMethod: body.paymentMethod,
          paymentSplits: body.paymentSplits ?? null,
          creditStatus: body.creditStatus ?? null,
          creditAmountPaid: body.creditAmountPaid ?? "0",
          status: "completed",
          receiptId,
        })
        .returning();

      const itemsToInsert = body.items.map((item) => ({
        transactionId: newTx.id,
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      }));

      const insertedItems = await tx
        .insert(transactionItems)
        .values(itemsToInsert)
        .returning();

      // Decrement product quantities
      for (const item of body.items) {
        if (item.productId) {
          await tx.execute(
            sql`UPDATE products SET qty = GREATEST(qty - ${item.qty}, 0) WHERE id = ${item.productId}`,
          );
        }
      }

      return { newTx, insertedItems };
    });

    return c.json(
      {
        success: true as const,
        data: {
          ...result.newTx,
          createdAt: result.newTx.createdAt.toISOString(),
          items: result.insertedItems,
        } as z.infer<typeof TransactionSchema>,
      },
      201,
    );
  } catch (err: any) {
    console.error("Tx error", err);
    return c.json(
      { success: false as const, error: "Failed to process transaction." },
      400,
    );
  }
});
