import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import { shops, shopMembers } from "@shelf/db";
import { eq, or } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

type Variables = {
  user: User;
};

// We use a shared Drizzle schema mapping or standard Zod mappings
// It's robust to define OpenAPI schemas clearly here to prevent DB layer leaks into the API spec
const ShopSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  countryCode: z.string(),
  currencyCode: z.string(),
  currencySymbol: z.string().optional(),
  currencyLocale: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.string().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  defaultDiscountType: z.string().optional(),
  defaultDiscountValue: z.string().optional(),
  taxRate: z.string().nullable().optional(),
  taxInclusive: z.boolean().optional(),
  taxName: z.string().optional(),
  theme: z.string(),
  primaryColor: z.string(),
  sidebarBg: z.string().optional(),
  paletteId: z.string().optional(),
  onboardingComplete: z.boolean().optional(),
  onboardingStep: z.string().optional(),
  lowStockThreshold: z.number().optional(),
  receiptHeader: z.string().nullable().optional(),
  receiptFooter: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const shopRouter = new OpenAPIHono<{ Variables: Variables }>();

// Apply auth middleware to ALL routes in this subsystem
shopRouter.use("*", authMiddleware);

/** GET /shops */
const listShopsRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(ShopSchema),
          }),
        },
      },
      description: "List all shops",
    },
  },
});

shopRouter.openapi(listShopsRoute, async (c) => {
  const user = c.get("user");

  // Fetch shops where user is owner OR a member
  const result = await db
    .select({
      id: shops.id,
      ownerId: shops.ownerId,
      name: shops.name,
      slug: shops.slug,
      countryCode: shops.countryCode,
      currencyCode: shops.currencyCode,
      currencySymbol: shops.currencySymbol,
      currencyLocale: shops.currencyLocale,
      timezone: shops.timezone,
      dateFormat: shops.dateFormat,
      timeFormat: shops.timeFormat,
      phone: shops.phone,
      email: shops.email,
      address: shops.address,
      defaultDiscountType: shops.defaultDiscountType,
      defaultDiscountValue: shops.defaultDiscountValue,
      taxRate: shops.taxRate,
      taxInclusive: shops.taxInclusive,
      taxName: shops.taxName,
      theme: shops.theme,
      primaryColor: shops.primaryColor,
      sidebarBg: shops.sidebarBg,
      paletteId: shops.paletteId,
      onboardingComplete: shops.onboardingComplete,
      onboardingStep: shops.onboardingStep,
      lowStockThreshold: shops.lowStockThreshold,
      receiptHeader: shops.receiptHeader,
      receiptFooter: shops.receiptFooter,
      createdAt: shops.createdAt,
    })
    .from(shops)
    .leftJoin(shopMembers, eq(shops.id, shopMembers.shopId))
    .where(or(eq(shops.ownerId, user.id), eq(shopMembers.userId, user.id)))
    .limit(50);

  // De-duplicate if they are both owner and member
  const uniqueShops = Array.from(
    new Map(result.map((item) => [item.id, item])).values(),
  );

  return c.json({
    success: true as const,
    data: uniqueShops.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

/** POST /shops */
const createShopRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z
              .string()
              .min(2, "Store name must be at least 2 characters."),
            slug: z
              .string()
              .min(2)
              .regex(
                /^[a-z0-9-]+$/,
                "Slug must be lowercase alphanumeric and hyphens.",
              ),
            countryCode: z.string().length(2),
            currencyCode: z.string().length(3),
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
            data: ShopSchema,
          }),
        },
      },
      description: "Creates a new shop for the authenticated user",
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

shopRouter.openapi(createShopRoute, async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  try {
    const [newShop] = await db
      .insert(shops)
      .values({
        name: body.name,
        slug: body.slug,
        countryCode: body.countryCode,
        currencyCode: body.currencyCode,
        ownerId: user.id,
        theme: "light",
        primaryColor: "#000000",
        currencySymbol: "$", // Can be dynamically calculated based on code
        currencyLocale: "en-US",
        timezone: "UTC",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h",
      })
      .returning();

    return c.json(
      {
        success: true as const,
        data: {
          ...newShop,
          createdAt: newShop.createdAt.toISOString(),
        },
      },
      201,
    );
  } catch (err: any) {
    if (err.code === "23505") {
      // Postgres Unique Constraint Violation (e.g. slug exists)
      return c.json(
        { success: false as const, error: "Shop URL (slug) is already taken." },
        400,
      );
    }

    return c.json(
      { success: false as const, error: "Failed to create shop." },
      400,
    );
  }
});
const getShopRoute = createRoute({
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
            data: ShopSchema,
          }),
        },
      },
      description: "Fetch specific shop by ID",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      description: "Shop not found",
    },
  },
});

shopRouter.openapi(getShopRoute, async (c) => {
  const { id } = c.req.valid("param");
  const user = c.get("user");

  const [shop] = await db.select().from(shops).where(eq(shops.id, id));

  if (!shop || shop.ownerId !== user.id) {
    return c.json({ success: false as const, error: "Shop not found" }, 404);
  }

  return c.json(
    {
      success: true as const,
      data: {
        ...shop,
        createdAt: shop.createdAt.toISOString(),
      } as z.infer<typeof ShopSchema>,
    },
    200,
  );
});

/** PATCH /shops/:id */
const updateShopRoute = createRoute({
  method: "patch",
  path: "/{id}",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().min(2).optional(),
            countryCode: z.string().optional(),
            currencyCode: z.string().optional(),
            currencySymbol: z.string().optional(),
            currencyLocale: z.string().optional(),
            timezone: z.string().optional(),
            dateFormat: z.string().optional(),
            timeFormat: z.string().optional(),
            phone: z.string().nullable().optional(),
            email: z.string().nullable().optional(),
            address: z.string().nullable().optional(),
            defaultDiscountType: z.string().optional(),
            defaultDiscountValue: z.string().optional(),
            taxRate: z.string().optional(),
            taxInclusive: z.boolean().optional(),
            taxName: z.string().optional(),
            theme: z.string().optional(),
            primaryColor: z.string().optional(),
            sidebarBg: z.string().optional(),
            paletteId: z.string().optional(),
            onboardingComplete: z.boolean().optional(),
            onboardingStep: z.string().optional(),
            lowStockThreshold: z.number().optional(),
            receiptHeader: z.string().nullable().optional(),
            receiptFooter: z.string().nullable().optional(),
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
            data: ShopSchema,
          }),
        },
      },
      description: "Update shop settings",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.literal(false), error: z.string() }),
        },
      },
      description: "Shop not found",
    },
  },
});

shopRouter.openapi(updateShopRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const user = c.get("user");

  const [shop] = await db.select().from(shops).where(eq(shops.id, id));
  if (!shop || shop.ownerId !== user.id) {
    return c.json(
      { success: false as const, error: "Shop not found or unauthorized" },
      404,
    );
  }

  try {
    const [updated] = await db
      .update(shops)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(shops.id, id))
      .returning();

    return c.json(
      {
        success: true as const,
        data: {
          ...updated,
          createdAt: updated.createdAt.toISOString(),
        } as z.infer<typeof ShopSchema>,
      },
      200,
    );
  } catch (err: any) {
    console.error("Failed to update shop", err);
    return c.json(
      { success: false as const, error: "Failed to update shop parameters." },
      400,
    );
  }
});
