import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  const { client, shops, activeShop } = await parent();
  return {
    client,
    shops,
    activeShop,
  };
};
