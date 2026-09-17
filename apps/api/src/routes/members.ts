import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import { shopMembers, profiles, shops } from "@shelf/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

type Variables = { user: User };

const MemberSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  shopId: z.string().uuid(),
  role: z.string(),
  status: z.string(),
  createdAt: z.string(),
  profile: z.object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().nullable(),
  }),
});

export const memberRouter = new OpenAPIHono<{ Variables: Variables }>();
memberRouter.use("*", authMiddleware);

/** GET /members */
const listMembersRoute = createRoute({
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
            data: z.array(MemberSchema),
          }),
        },
      },
      description: "List members for a shop",
    },
  },
});

memberRouter.openapi(listMembersRoute, async (c) => {
  const { shopId } = c.req.valid("query");
  const user = c.get("user");

  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop || shop.ownerId !== user.id) {
    throw new HTTPException(403, { message: "Unauthorized" });
  }

  const result = await db
    .select({
      member: shopMembers,
      profile: profiles,
    })
    .from(shopMembers)
    .innerJoin(profiles, eq(shopMembers.userId, profiles.id))
    .where(eq(shopMembers.shopId, shopId));

  return c.json({
    success: true as const,
    data: result.map((r) => ({
      ...r.member,
      createdAt: r.member.createdAt.toISOString(),
      profile: r.profile,
    })),
  });
});
