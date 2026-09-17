import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  const { client, activeShop } = await parent();

  if (!activeShop)
    return {
      suppliers: [],
      purchaseOrders: [],
      lowStockProducts: [],
      adjustments: [],
    };

  try {
    const [suppliersResp, poResp, productsResp, adjResp] = await Promise.all([
      client.suppliers.$get({ query: { shopId: activeShop.id } }),
      client["purchase-orders"].$get({ query: { shopId: activeShop.id } }),
      client.products.$get({ query: { shopId: activeShop.id } }),
      client["stock-adjustments"].$get({ query: { shopId: activeShop.id } }),
    ]);

    const suppliers = suppliersResp.ok ? await suppliersResp.json() : [];
    const purchaseOrders = poResp.ok ? await poResp.json() : [];
    const allProducts = productsResp.ok ? await productsResp.json() : [];
    const lowStockProducts = allProducts.filter(
      (p: any) => p.qty <= (p.lowStockThreshold ?? 5),
    );
    const adjustments = adjResp.ok ? await adjResp.json() : [];

    return { suppliers, purchaseOrders, lowStockProducts, adjustments };
  } catch {
    return {
      suppliers: [],
      purchaseOrders: [],
      lowStockProducts: [],
      adjustments: [],
    };
  }
};
