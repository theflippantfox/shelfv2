import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  const { client, activeShop } = await parent();

  let transactions = [];
  try {
    const res = await client.transactions.$get({
      query: { shopId: activeShop.id },
    });
    if (res.ok) {
      const body = await res.json();
      transactions = body.data;
    }
  } catch (e) {
    console.error("Failed to load transactions", e);
  }

  return {
    transactions,
  };
};
