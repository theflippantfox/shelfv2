import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import {
  transactions,
  transactionItems,
  products,
  categories,
  customers,
  shops,
} from "@shelf/db";
import { eq, desc, inArray } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

type Variables = { user: User };

export const analyticsRouter = new OpenAPIHono<{ Variables: Variables }>();
analyticsRouter.use("*", authMiddleware);

async function assertShopOwnership(shopId: string, userId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop || shop.ownerId !== userId) {
    throw new HTTPException(403, { message: "Unauthorized" });
  }
  return shop;
}

function parsePeriod(preset: string): {
  start: Date;
  end: Date;
  prevStart: Date;
} {
  const now = new Date();
  const end = new Date(now);
  let start: Date;
  let prevStart: Date;

  switch (preset) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 1);
      break;
    case "yesterday":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 1);
      break;
    case "7d":
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      break;
    case "30d":
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 30);
      break;
    case "90d":
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 90);
      break;
    case "this_month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    case "last_month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end.setFullYear(now.getFullYear(), now.getMonth(), 0);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case "this_year":
      start = new Date(now.getFullYear(), 0, 1);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      break;
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 30);
  }

  return { start, end, prevStart };
}

/** GET /analytics — Overview data */
const overviewRoute = createRoute({
  method: "get",
  path: "/",
  request: {
    query: z.object({
      shopId: z.string().uuid(),
      period: z.string().optional().default("30d"),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.any(),
        },
      },
      description: "Analytics overview",
    },
  },
});

analyticsRouter.openapi(overviewRoute, async (c) => {
  const { shopId, period } = c.req.valid("query");
  const user = c.get("user");
  await assertShopOwnership(shopId, user.id);

  const { start, end, prevStart } = parsePeriod(period);

  // Fetch all transactions for this shop
  const allTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.shopId, shopId))
    .orderBy(desc(transactions.createdAt));

  // Current period transactions
  const currentTx = allTx.filter(
    (t) =>
      t.createdAt >= start && t.createdAt <= end && t.status === "completed",
  );
  const prevTx = allTx.filter(
    (t) =>
      t.createdAt >= prevStart &&
      t.createdAt < start &&
      t.status === "completed",
  );

  // KPIs
  const currentRevenue = currentTx.reduce(
    (s, t) => s + parseFloat(t.totalAmount),
    0,
  );
  const prevRevenue = prevTx.reduce((s, t) => s + parseFloat(t.totalAmount), 0);
  const currentCount = currentTx.length;
  const prevCount = prevTx.length;
  const currentAvg = currentCount > 0 ? currentRevenue / currentCount : 0;
  const prevAvg = prevCount > 0 ? prevRevenue / prevCount : 0;

  function delta(current: number, previous: number) {
    if (previous === 0)
      return current > 0 ? { pct: 100, direction: "up" } : null;
    const pct = ((current - previous) / previous) * 100;
    return {
      pct: Math.round(pct * 10) / 10,
      direction: pct >= 0 ? "up" : "down",
    };
  }

  // Fetch items for current and previous period transactions
  const currentTxIds = currentTx.map((t) => t.id);
  const prevTxIds = prevTx.map((t) => t.id);
  const allTxIds = [...currentTxIds, ...prevTxIds];
  const allItems =
    allTxIds.length > 0
      ? await db
          .select()
          .from(transactionItems)
          .where(inArray(transactionItems.transactionId, allTxIds))
      : [];

  const currentItems = allItems.filter((i) =>
    currentTxIds.includes(i.transactionId),
  );
  const prevItems = allItems.filter((i) => prevTxIds.includes(i.transactionId));

  // Build a global product cost and category map instead of slicing it up
  const shopProducts = await db
    .select({
      id: products.id,
      costPrice: products.costPrice,
      price: products.price,
      qty: products.qty,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(eq(products.shopId, shopId));

  const costMap = new Map(
    shopProducts.map((p) => [p.id, parseFloat(p.costPrice ?? "0")]),
  );
  const prodCatMap = new Map(shopProducts.map((p) => [p.id, p.categoryId]));

  const shopCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.shopId, shopId));
  const catNameMap = new Map(shopCategories.map((c) => [c.id, c.name]));

  // Product aggregation (Current Period Only)
  const productMap = new Map<
    string,
    { name: string; revenue: number; units: number; cost: number }
  >();

  for (const item of currentItems) {
    const key = item.productId ?? item.productName;
    const existing = productMap.get(key) ?? {
      name: item.productName,
      revenue: 0,
      units: 0,
      cost: 0,
    };

    const unitCost = item.productId ? (costMap.get(item.productId) ?? 0) : 0;

    existing.revenue += parseFloat(item.subtotal);
    existing.units += item.qty;
    existing.cost += unitCost * item.qty;

    productMap.set(key, existing);
  }

  const byRevenue = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((p) => ({
      ...p,
      margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
    }));

  // Category aggregation (Current Period Only)
  const catAgg = new Map<
    string,
    { name: string; revenue: number; units: number; cost: number }
  >();

  for (const item of currentItems) {
    if (!item.productId) continue;
    const catId = prodCatMap.get(item.productId) ?? "uncategorized";
    const name = catNameMap.get(catId) ?? "Uncategorized";
    const existing = catAgg.get(catId) ?? {
      name,
      revenue: 0,
      units: 0,
      cost: 0,
    };

    const unitCost = costMap.get(item.productId) ?? 0;

    existing.revenue += parseFloat(item.subtotal);
    existing.units += item.qty;
    existing.cost += unitCost * item.qty;

    catAgg.set(catId, existing);
  }

  const categoriesResult = [...catAgg.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .map((c) => ({
      ...c,
      margin: c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0,
    }));

  // Dynamic revenue trend based on selected period
  const now = new Date();
  const trendData: { date: string; revenue: number; count: number }[] = [];

  if (period === "today" || period === "yesterday") {
    // Hourly breakdown (24 points)
    const targetDay =
      period === "today"
        ? now
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    for (let h = 0; h < 24; h++) {
      const dayTx = currentTx.filter((t) => {
        const td = t.createdAt;
        return (
          td.getHours() === h &&
          td.toISOString().slice(0, 10) === targetDay.toISOString().slice(0, 10)
        );
      });
      trendData.push({
        date: `${h.toString().padStart(2, "0")}:00`,
        revenue: dayTx.reduce((s, t) => s + parseFloat(t.totalAmount), 0),
        count: dayTx.length,
      });
    }
  } else if (period === "this_year") {
    // Monthly breakdown (up to current month)
    const currentMonth = now.getMonth();
    for (let m = 0; m <= currentMonth; m++) {
      const monthTx = currentTx.filter((t) => t.createdAt.getMonth() === m);
      const monthName = new Date(now.getFullYear(), m, 1).toLocaleDateString(
        "en-IN",
        { month: "short" },
      );
      trendData.push({
        date: monthName,
        revenue: monthTx.reduce((s, t) => s + parseFloat(t.totalAmount), 0),
        count: monthTx.length,
      });
    }
  } else if (period === "90d") {
    // Weekly breakdown (~13 points)
    const weekStart = new Date(start);
    while (weekStart <= end) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekTx = currentTx.filter(
        (t) => t.createdAt >= weekStart && t.createdAt < weekEnd,
      );
      trendData.push({
        date: weekStart.toISOString().slice(0, 10),
        revenue: weekTx.reduce((s, t) => s + parseFloat(t.totalAmount), 0),
        count: weekTx.length,
      });
      weekStart.setDate(weekStart.getDate() + 7);
    }
  } else {
    // Daily breakdown (7d, 30d, this_month, last_month)
    const totalDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      if (d > end) break;
      const dayStr = d.toISOString().slice(0, 10);
      const dayTx = currentTx.filter(
        (t) => t.createdAt.toISOString().slice(0, 10) === dayStr,
      );
      trendData.push({
        date: dayStr,
        revenue: dayTx.reduce((s, t) => s + parseFloat(t.totalAmount), 0),
        count: dayTx.length,
      });
    }
  }

  // Busiest hours (top 12 hours aggregated across all time, excluding after 10 PM)
  const hourlyTotals = new Map<number, number>();
  for (const t of allTx) {
    const hour = t.createdAt.getHours();
    if (hour >= 22) continue; // Remove everything after 10 PM
    hourlyTotals.set(hour, (hourlyTotals.get(hour) ?? 0) + 1);
  }
  const busiestHours = [...hourlyTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([hour, count]) => ({
      label: `${hour.toString().padStart(2, "0")}:00`,
      count,
    }));
  const busyMax = busiestHours[0]?.count ?? 1;

  // Gross profit calculations
  const totalCost = currentItems.reduce((s, i) => {
    const unitCost = i.productId ? (costMap.get(i.productId) ?? 0) : 0;
    return s + unitCost * i.qty;
  }, 0);
  const grossProfit = currentRevenue - totalCost;

  const prevTotalCost = prevItems.reduce((s, i) => {
    const unitCost = i.productId ? (costMap.get(i.productId) ?? 0) : 0;
    return s + unitCost * i.qty;
  }, 0);
  const prevGrossProfit = prevRevenue - prevTotalCost;

  // Inventory summary (using the globally fetched shopProducts)
  const retailValue = shopProducts.reduce(
    (s, p) => s + parseFloat(p.price) * p.qty,
    0,
  );
  const costValue = shopProducts.reduce(
    (s, p) => s + parseFloat(p.costPrice ?? "0") * p.qty,
    0,
  );
  const totalUnits = shopProducts.reduce((s, p) => s + p.qty, 0);
  const potentialMargin =
    retailValue > 0 ? ((retailValue - costValue) / retailValue) * 100 : 0;

  // Customer tiers
  const allCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.shopId, shopId));
  const tierCounts = { vip: 0, regular: 0, new: 0 };
  for (const c of allCustomers) {
    const spent = parseFloat(c.totalSpent);
    if (spent >= 10000 || c.visitCount >= 10) tierCounts.vip++;
    else if (spent >= 3000 || c.visitCount >= 3) tierCounts.regular++;
    else tierCounts.new++;
  }

  // Top customers
  const topCustomers = allCustomers
    .sort((a, b) => parseFloat(b.totalSpent) - parseFloat(a.totalSpent))
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      name: c.name,
      spent: parseFloat(c.totalSpent),
      visits: c.visitCount,
    }));

  // Outstanding credit
  const creditTx = allTx.filter(
    (t) => t.creditStatus === "pending" || t.creditStatus === "partial",
  );
  const outstanding = {
    total: creditTx.reduce(
      (s, t) =>
        s + parseFloat(t.totalAmount) - parseFloat(t.creditAmountPaid ?? "0"),
      0,
    ),
    byStatus: {
      pending: creditTx
        .filter((t) => t.creditStatus === "pending")
        .reduce((s, t) => s + parseFloat(t.totalAmount), 0),
      partial: creditTx
        .filter((t) => t.creditStatus === "partial")
        .reduce(
          (s, t) =>
            s +
            parseFloat(t.totalAmount) -
            parseFloat(t.creditAmountPaid ?? "0"),
          0,
        ),
    },
  };

  return c.json({
    kpis: {
      revenue: {
        current: currentRevenue,
        delta: delta(currentRevenue, prevRevenue),
      },
      transactions: {
        current: currentCount,
        delta: delta(currentCount, prevCount),
      },
      avgOrder: { current: currentAvg, delta: delta(currentAvg, prevAvg) },
    },
    grossProfit: {
      current: grossProfit,
      delta: delta(grossProfit, prevGrossProfit),
    },
    products: { byRevenue },
    categories: categoriesResult,
    trendData,
    busiestHours,
    busyMax,
    stockValue: { retailValue, costValue, totalUnits, potentialMargin },
    topCustomers,
    outstanding,
    uniqueBuyers: allCustomers.length,
  });
});
