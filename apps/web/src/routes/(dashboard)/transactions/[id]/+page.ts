import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, parent }) => {
  const { client, activeShop } = await parent();

  if (!activeShop) return { transaction: null, items: [] };

  try {
    const resp = await client.transactions[":id"].$get({
      param: { id: params.id },
      query: { shopId: activeShop.id },
    });

    if (resp.ok) {
      const body = await resp.json();
      return { transaction: body.data, items: body.data.items ?? [] };
    }
    return { transaction: null, items: [] };
  } catch {
    return { transaction: null, items: [] };
  }
};
