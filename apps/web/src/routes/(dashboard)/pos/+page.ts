import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  const { client, activeShop } = await parent();

  // Guard: if no shop loaded (API hiccup), return empty data
  if (!activeShop?.id) {
    return { products: [], categories: [], customers: [] };
  }

  const shopId = activeShop.id;

  let products = [];
  try {
    const res = await client.products.$get({ query: { shopId } });
    if (res.ok) {
      const body = await res.json();
      products = body.data;
    }
  } catch (e) {
    console.error("Failed to load products for pos", e);
  }

  let categories = [];
  try {
    const res = await client.categories.$get({ query: { shopId } });
    if (res.ok) {
      const body = await res.json();
      categories = body.data;
    }
  } catch (e) {
    console.error("Failed to load categories for pos", e);
  }

  let customers = [];
  try {
    const res = await client.customers.$get({ query: { shopId } });
    if (res.ok) {
      const body = await res.json();
      customers = body.data;
    }
  } catch (e) {
    console.error("Failed to load customers for pos", e);
  }

  return {
    products,
    categories,
    customers,
  };
};
