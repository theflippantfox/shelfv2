import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, parent }) => {
  const { client, activeShop } = await parent();
  const { id } = params;

  let customer: any = null;
  let transactions: any[] = [];

  try {
    // Fetch customer detail
    const custRes = await client.customers[":id"].$get({ param: { id } });
    if (custRes.ok) {
      const custBody = await custRes.json();
      customer = custBody.data;
    }

    // Fetch all transactions and filter by this customer
    const txRes = await client.transactions.$get({
      query: { shopId: activeShop.id },
    });
    if (txRes.ok) {
      const txBody = await txRes.json();
      transactions = (txBody.data || []).filter(
        (t: any) => t.customerId === id,
      );
    }
  } catch (e) {
    console.error("Failed to load customer detail", e);
  }

  return { customer, transactions, activeShop };
};
