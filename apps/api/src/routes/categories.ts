import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import { categories, shops } from "@shelf/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

type Variables = { user: User };

const CategorySchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  sortOrder: z.number(),
  createdAt: z.string(),
});

export const categoryRouter = new OpenAPIHono<{ Variables: Variables }>();
categoryRouter.use("*", authMiddleware);

/** Helper: verify shop ownership or throw */
async function assertShopOwnership(shopId: string, userId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop || shop.ownerId !== userId) {
    throw new HTTPException(403, { message: "Unauthorized" });
  }
  return shop;
}

/** GET /categories — list all categories for a shop */
const listRoute = createRoute({
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
            data: z.array(CategorySchema),
          }),
        },
      },
      description: "List categories for a shop",
    },
  },
});

categoryRouter.openapi(listRoute, async (c) => {
  const { shopId } = c.req.valid("query");
  const user = c.get("user");

  await assertShopOwnership(shopId, user.id);

  const result = await db
    .select()
    .from(categories)
    .where(eq(categories.shopId, shopId))
    .orderBy(categories.sortOrder);

  return c.json({
    success: true as const,
    data: result.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

/** POST /categories — create a new category */
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
            icon: z.string().default("Tag"),
            color: z.string().default("#888888"),
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
            data: CategorySchema,
          }),
        },
      },
      description: "Category created",
    },
  },
});

categoryRouter.openapi(createRoute_, async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  await assertShopOwnership(body.shopId, user.id);

  const [created] = await db
    .insert(categories)
    .values({
      shopId: body.shopId,
      name: body.name,
      icon: body.icon,
      color: body.color,
    })
    .returning();

  return c.json(
    {
      success: true as const,
      data: { ...created, createdAt: created.createdAt.toISOString() },
    },
    201,
  );
});

/** DELETE /categories/:id */
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
      description: "Category deleted",
    },
  },
});

categoryRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const [cat] = await db.select().from(categories).where(eq(categories.id, id));
  if (!cat) throw new HTTPException(404, { message: "Category not found" });

  await assertShopOwnership(cat.shopId, user.id);
  await db.delete(categories).where(eq(categories.id, id));

  return c.json({ success: true as const });
});

/** PATCH /categories/:id — update a category */
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
            icon: z.string().optional(),
            color: z.string().optional(),
            sortOrder: z.number().optional(),
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
            data: CategorySchema,
          }),
        },
      },
      description: "Category updated",
    },
  },
});

categoryRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const user = c.get("user");

  const [cat] = await db.select().from(categories).where(eq(categories.id, id));
  if (!cat) throw new HTTPException(404, { message: "Category not found" });

  await assertShopOwnership(cat.shopId, user.id);

  const [updated] = await db
    .update(categories)
    .set({ ...body })
    .where(eq(categories.id, id))
    .returning();

  return c.json({
    success: true as const,
    data: { ...updated, createdAt: updated.createdAt.toISOString() },
  });
});
