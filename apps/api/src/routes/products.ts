import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import { products, shops } from "@shelf/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

type Variables = { user: User };

const ProductSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  categoryId: z.string().uuid().nullable(),
  name: z.string(),
  sku: z.string().nullable(),
  description: z.string().nullable(),
  price: z.string(),
  costPrice: z.string().nullable(),
  qty: z.number(),
  lowStockThreshold: z.number(),
  unit: z.string(),
  imageUrl: z.string().nullable(),
  barcode: z.string().nullable(),
  trackStock: z.boolean(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const productRouter = new OpenAPIHono<{ Variables: Variables }>();
productRouter.use("*", authMiddleware);

async function assertShopOwnership(shopId: string, userId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop || shop.ownerId !== userId) {
    throw new HTTPException(403, { message: "Unauthorized" });
  }
  return shop;
}

/** GET /products — list products for a shop, with optional category filter */
const listRoute = createRoute({
  method: "get",
  path: "/",
  request: {
    query: z.object({
      shopId: z.string().uuid(),
      categoryId: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(ProductSchema),
            total: z.number(),
          }),
        },
      },
      description: "List products",
    },
  },
});

productRouter.openapi(listRoute, async (c) => {
  const { shopId, categoryId } = c.req.valid("query");
  const user = c.get("user");

  await assertShopOwnership(shopId, user.id);

  const conditions = [
    eq(products.shopId, shopId),
    sql`${products.archivedAt} IS NULL`,
  ];
  if (categoryId) {
    conditions.push(eq(products.categoryId, categoryId));
  }

  const result = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(products.name);

  return c.json({
    success: true as const,
    data: result.map((r) => ({
      ...r,
      qty: r.qty,
      lowStockThreshold: r.lowStockThreshold,
      trackStock: r.trackStock,
      archivedAt: r.archivedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total: result.length,
  });
});

/** POST /products — create a new product */
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            shopId: z.string().uuid(),
            name: z.string().min(1),
            categoryId: z.string().uuid().nullable().optional(),
            sku: z.string().nullable().optional(),
            description: z.string().nullable().optional(),
            price: z.string().min(1),
            costPrice: z.string().nullable().optional(),
            qty: z.number().int().min(0).default(0),
            unit: z.string().default("unit"),
            lowStockThreshold: z.number().int().min(0).default(5),
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
            data: ProductSchema,
          }),
        },
      },
      description: "Product created",
    },
  },
});

productRouter.openapi(createRoute_, async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  await assertShopOwnership(body.shopId, user.id);

  const [created] = await db
    .insert(products)
    .values({
      shopId: body.shopId,
      name: body.name,
      categoryId: body.categoryId ?? null,
      sku: body.sku ?? null,
      description: body.description ?? null,
      price: body.price,
      costPrice: body.costPrice ?? null,
      qty: body.qty,
      unit: body.unit,
      lowStockThreshold: body.lowStockThreshold,
    })
    .returning();

  return c.json(
    {
      success: true as const,
      data: {
        ...created,
        qty: created.qty,
        lowStockThreshold: created.lowStockThreshold,
        trackStock: created.trackStock,
        archivedAt: created.archivedAt?.toISOString() ?? null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    },
    201,
  );
});

/** DELETE /products/:id — soft-delete (archive) */
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(true) }),
        },
      },
      description: "Product archived",
    },
  },
});

productRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const [prod] = await db.select().from(products).where(eq(products.id, id));
  if (!prod) throw new HTTPException(404, { message: "Product not found" });

  await assertShopOwnership(prod.shopId, user.id);

  await db
    .update(products)
    .set({ archivedAt: new Date() })
    .where(eq(products.id, id));

  return c.json({ success: true as const });
});

/** PATCH /products/:id — update product */
const updateRoute = createRoute({
  method: "patch",
  path: "/{id}",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().min(1).optional(),
            categoryId: z.string().uuid().nullable().optional(),
            sku: z.string().nullable().optional(),
            description: z.string().nullable().optional(),
            price: z.string().min(1).optional(),
            costPrice: z.string().nullable().optional(),
            qty: z.number().int().min(0).optional(),
            unit: z.string().optional(),
            lowStockThreshold: z.number().int().min(0).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: ProductSchema,
          }),
        },
      },
      description: "Product updated",
    },
  },
});

productRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const user = c.get("user");

  const [prod] = await db.select().from(products).where(eq(products.id, id));
  if (!prod) throw new HTTPException(404, { message: "Product not found" });

  await assertShopOwnership(prod.shopId, user.id);

  const [updated] = await db
    .update(products)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  return c.json({
    success: true as const,
    data: {
      ...updated,
      archivedAt: updated.archivedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
});
