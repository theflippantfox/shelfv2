import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { User } from "@supabase/supabase-js";
import { db } from "../db";
import { shops, products, transactions, transactionItems } from "@shelf/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { HTTPException } from "hono/http-exception";

import { desc } from "drizzle-orm";

type Variables = { user: User };
export const dashboardRouter = new OpenAPIHono<{ Variables: Variables }>();
dashboardRouter.use("*", authMiddleware);

const MetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  change: z.string(),
  trend: z.enum(["up", "down", "neutral"]),
});

const ChartPointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  orders: z.number(),
});

const DashboardDataSchema = z.object({
  success: z.boolean(),
  data: z.object({
    metrics: z.array(MetricSchema),
    chartData: z.array(ChartPointSchema),
    topProducts: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        revenue: z.number(),
        qty: z.number(),
      }),
    ),
    inventoryStats: z.object({
      retailValue: z.number(),
      costValue: z.number(),
      totalUnits: z.number(),
    }),
    recentTransactions: z.array(
      z.object({
        id: z.string(),
        receiptId: z.string(),
        amount: z.string(),
        method: z.string(),
        time: z.string(),
      }),
    ),
    lowStockItems: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        qty: z.number(),
      }),
    ),
  }),
});

const getDashboardMetricsRoute = createRoute({
  method: "get",
  path: "/metrics",
  request: {
    query: z.object({
      shopId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: DashboardDataSchema,
        },
      },
      description: "Fetch dashboard overview metrics and data",
    },
  },
});

dashboardRouter.openapi(getDashboardMetricsRoute, async (c) => {
  const { shopId } = c.req.valid("query");
  const user = c.get("user");

  // Validate shop ownership
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
  if (!shop || shop.ownerId !== user.id) {
    throw new HTTPException(403, { message: "Unauthorized" });
  }

  // 1. Total Revenue & Tax
  const [revenueResult] = await db
    .select({
      total: sql`SUM(CAST(${transactions.totalAmount} AS numeric))`,
      tax: sql`SUM(CAST(${transactions.taxAmount} AS numeric))`,
    })
    .from(transactions)
    .where(eq(transactions.shopId, shopId));

  const totalRevenue = revenueResult?.total ? Number(revenueResult.total) : 0;
  const totalTax = revenueResult?.tax ? Number(revenueResult.tax) : 0;
  const netRevenue = totalRevenue - totalTax;

  // Format currency helper
  const formatMoney = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: shop.currencyCode || "USD",
    }).format(val);

  // 2. Total Transactions & Items Sold
  const [txCountResult] = await db
    .select({ count: sql`COUNT(*)` })
    .from(transactions)
    .where(eq(transactions.shopId, shopId));

  const txCount = Number(txCountResult?.count || 0);

  const [itemsResult] = await db
    .select({ count: sql`SUM(${transactionItems.qty})` })
    .from(transactionItems)
    .innerJoin(
      transactions,
      eq(transactionItems.transactionId, transactions.id),
    )
    .where(eq(transactions.shopId, shopId));

  const itemsSold = Number(itemsResult?.count || 0);

  const aov = txCount > 0 ? totalRevenue / txCount : 0;

  // 3. Recent Transactions
  const recentTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.shopId, shopId))
    .orderBy(desc(transactions.createdAt))
    .limit(5);

  const formattedTransactions = recentTx.map((tx) => ({
    id: tx.id,
    receiptId: tx.receiptId,
    amount: formatMoney(Number(tx.totalAmount)),
    method: tx.paymentMethod,
    time: tx.createdAt.toISOString(),
  }));

  // 4. Low Stock Items
  const lowStockProducts = await db
    .select({
      id: products.id,
      name: products.name,
      qty: products.qty,
    })
    .from(products)
    .where(
      and(
        eq(products.shopId, shopId),
        sql`${products.archivedAt} IS NULL`,
        sql`${products.qty} <= ${products.lowStockThreshold}`,
      ),
    )
    .orderBy(products.qty)
    .limit(5);

  // 7. Graph Data & Top Sellers
  const allTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.shopId, shopId));

  // Real Chart Data generation for last 7 days
  const today = new Date();
  const last7Days = Array.from({ length: 7 })
    .map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return {
        date: d.toLocaleDateString("en-US", { weekday: "short" }),
        dateRaw: d.toISOString().split("T")[0],
        revenue: 0,
        orders: 0,
      };
    })
    .reverse();

  allTx.forEach((tx) => {
    // 7-day revenue grouping
    const txDate = tx.createdAt.toISOString().split("T")[0];
    const matchDay = last7Days.find((d) => d.dateRaw === txDate);
    if (matchDay) {
      matchDay.revenue += Number(tx.totalAmount);
      matchDay.orders += 1;
    }
  });

  const chartData = last7Days.map(({ date, revenue, orders }) => ({
    date,
    revenue,
    orders,
  }));

  // Top Products
  const productSalesMap: Record<
    string,
    { id: string; name: string; revenue: number; qty: number }
  > = {};

  const allTxItems = await db
    .select({
      productId: transactionItems.productId,
      qty: transactionItems.qty,
      price: transactionItems.unitPrice,
      productName: products.name,
    })
    .from(transactionItems)
    .innerJoin(
      transactions,
      eq(transactions.id, transactionItems.transactionId),
    )
    .innerJoin(products, eq(products.id, transactionItems.productId))
    .where(eq(transactions.shopId, shopId));

  allTxItems.forEach((item) => {
    const id = item.productId || "unknown";
    if (!productSalesMap[id]) {
      productSalesMap[id] = {
        id,
        name: item.productName || "Unknown",
        revenue: 0,
        qty: 0,
      };
    }
    productSalesMap[id].revenue += Number(item.price) * item.qty;
    productSalesMap[id].qty += item.qty;
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // 8. Inventory Value Stats
  const sqlSumPrice = sql`SUM(CAST(${products.price} AS numeric) * ${products.qty})`;
  const sqlSumCost = sql`SUM(COALESCE(CAST(${products.costPrice} AS numeric), 0) * ${products.qty})`;
  const sqlSumUnits = sql`SUM(${products.qty})`;

  const [invResult] = await db
    .select({
      retailValue: sqlSumPrice,
      costValue: sqlSumCost,
      totalUnits: sqlSumUnits,
    })
    .from(products)
    .where(
      and(eq(products.shopId, shopId), sql`${products.archivedAt} IS NULL`),
    );

  const inventoryStats = {
    retailValue: Number(invResult?.retailValue || 0),
    costValue: Number(invResult?.costValue || 0),
    totalUnits: Number(invResult?.totalUnits || 0),
  };

  return c.json({
    success: true,
    data: {
      metrics: [
        {
          label: "Gross Revenue",
          value: formatMoney(totalRevenue),
          change: "Overall top-line collected",
          trend: "neutral" as const,
        },
        {
          label: "Net Revenue",
          value: formatMoney(netRevenue),
          change: "After tax deductions",
          trend: "neutral" as const,
        },
        {
          label: "Total Sales",
          value: txCount.toString(),
          change: `${itemsSold} total units moved`,
          trend: "neutral" as const,
        },
        {
          label: "Average Order Value",
          value: formatMoney(aov),
          change: "Revenue per checkout",
          trend: "neutral" as const,
        },
      ],
      chartData,
      topProducts,
      inventoryStats,
      recentTransactions: formattedTransactions,
      lowStockItems: lowStockProducts,
    },
  });
});
