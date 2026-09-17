export const load = async ({ parent }: { parent: () => Promise<any> }) => {
  const { client, activeShop } = await parent();

  // Fetch categories for the active shop
  const res = await client.categories.$get({
    query: { shopId: activeShop.id },
  });
  const categories = res.ok ? (await res.json()).data : [];

  return { categories, activeShop };
};
