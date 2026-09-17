import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  const { client, shops } = await parent();
  const activeShop = shops?.[0];

  // Make fully-typed RPC calls directly to the Hono API
  let dashboardData: any = {
    metrics: [],
    chartData: [],
    recentTransactions: [],
    lowStockItems: [],
    topProducts: [],
    inventoryStats: { retailValue: 0, costValue: 0, totalUnits: 0 },
  };

  try {
    if (activeShop) {
      const metricsResponse = await client.dashboard.metrics.$get({
        query: { shopId: activeShop.id },
      });
      dashboardData = metricsResponse.ok
        ? (await metricsResponse.json()).data
        : dashboardData;
    }
  } catch (err) {
    console.warn("⚠️ API connection failed during SSR for metrics:", err);
  }

  return {
    dashboardData,
    shops,
  };
};
