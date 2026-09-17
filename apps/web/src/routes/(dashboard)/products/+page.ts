export const load = async ({ parent }: { parent: () => Promise<any> }) => {
  const { client, activeShop } = await parent();

  // Fetch categories and products in parallel
  const [categoriesRes, productsRes] = await Promise.all([
    client.categories.$get({ query: { shopId: activeShop.id } }),
    client.products.$get({ query: { shopId: activeShop.id } }),
  ]);

  const categories = categoriesRes.ok ? (await categoriesRes.json()).data : [];
  const products = productsRes.ok ? (await productsRes.json()).data : [];

  return { categories, products };
};
