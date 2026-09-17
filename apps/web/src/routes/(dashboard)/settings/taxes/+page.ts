import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  const { client, activeShop } = await parent();
  return { client, activeShop };
};
