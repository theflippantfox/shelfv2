import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  const { client, activeShop } = await parent();

  let customers: any[] = [];
  try {
    const res = await client.customers.$get({
      query: { shopId: activeShop.id },
    });
    if (res.ok) {
      const body = await res.json();
      customers = body.data;
    }
  } catch (e) {
    console.error("Failed to load customers", e);
  }

  return { customers, activeShop };
};
