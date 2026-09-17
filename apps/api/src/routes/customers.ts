import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import { customers, shops } from "@shelf/db";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

type Variables = { user: User };

const CustomerSchema = z.object({
  id: z.string().uuid(),
  shopId: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  notes: z.string().nullable(),
  outstandingBalance: z.string(),
  totalSpent: z.string(),
  visitCount: z.number(),
  lastVisit: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const customerRouter = new OpenAPIHono<{ Variables: Variables }>();
customerRouter.use("*", authMiddleware);

async function assertShopOwnership(shopId: string, userId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop || shop.ownerId !== userId) {
    throw new HTTPException(403, { message: "Unauthorized" });
  }
  return shop;
}

/** GET /customers */
const listCustomersRoute = createRoute({
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
            data: z.array(CustomerSchema),
          }),
        },
      },
      description: "List customers for a shop",
    },
  },
});

customerRouter.openapi(listCustomersRoute, async (c) => {
  const { shopId } = c.req.valid("query");
  const user = c.get("user");

  await assertShopOwnership(shopId, user.id);

  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.shopId, shopId))
    .orderBy(desc(customers.createdAt))
    .limit(200);

  return c.json({
    success: true as const,
    data: result.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      lastVisit: r.lastVisit?.toISOString() ?? null,
    })),
  });
});

/** POST /customers */
const createCustomerRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            shopId: z.string().uuid(),
            name: z.string().min(1),
            phone: z.string().nullable().optional(),
            email: z.string().nullable().optional(),
            notes: z.string().nullable().optional(),
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
            data: CustomerSchema,
          }),
        },
      },
      description: "Create a customer",
    },
  },
});

customerRouter.openapi(createCustomerRoute, async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  await assertShopOwnership(body.shopId, user.id);

  const [newCustomer] = await db
    .insert(customers)
    .values({
      shopId: body.shopId,
      name: body.name,
      phone: body.phone ?? null,
      email: body.email ?? null,
      notes: body.notes ?? null,
    })
    .returning();

  return c.json(
    {
      success: true as const,
      data: {
        ...newCustomer,
        createdAt: newCustomer.createdAt.toISOString(),
        updatedAt: newCustomer.updatedAt.toISOString(),
        lastVisit: newCustomer.lastVisit?.toISOString() ?? null,
      } as z.infer<typeof CustomerSchema>,
    },
    201,
  );
});

/** GET /customers/:id */
const getCustomerRoute = createRoute({
  method: "get",
  path: "/{id}",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: CustomerSchema,
          }),
        },
      },
      description: "Get customer by ID",
    },
  },
});

customerRouter.openapi(getCustomerRoute, async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id));
  if (!customer)
    throw new HTTPException(404, { message: "Customer not found" });
  await assertShopOwnership(customer.shopId, user.id);

  return c.json({
    success: true as const,
    data: {
      ...customer,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      lastVisit: customer.lastVisit?.toISOString() ?? null,
    } as z.infer<typeof CustomerSchema>,
  });
});

/** PATCH /customers/:id */
const updateCustomerRoute = createRoute({
  method: "patch",
  path: "/{id}",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().min(1).optional(),
            phone: z.string().nullable().optional(),
            email: z.string().nullable().optional(),
            notes: z.string().nullable().optional(),
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
            data: CustomerSchema,
          }),
        },
      },
      description: "Update customer",
    },
  },
});

customerRouter.openapi(updateCustomerRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const user = c.get("user");

  const [existing] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id));
  if (!existing)
    throw new HTTPException(404, { message: "Customer not found" });
  await assertShopOwnership(existing.shopId, user.id);

  const [updated] = await db
    .update(customers)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();

  return c.json({
    success: true as const,
    data: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lastVisit: updated.lastVisit?.toISOString() ?? null,
    } as z.infer<typeof CustomerSchema>,
  });
});

/** DELETE /customers/:id */
const deleteCustomerRoute = createRoute({
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
      description: "Delete customer",
    },
  },
});

customerRouter.openapi(deleteCustomerRoute, async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const [existing] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id));
  if (!existing)
    throw new HTTPException(404, { message: "Customer not found" });
  await assertShopOwnership(existing.shopId, user.id);

  await db.delete(customers).where(eq(customers.id, id));

  return c.json({ success: true as const });
});
