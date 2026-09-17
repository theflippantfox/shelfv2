import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  const { client, activeShop } = await parent();

  let members = [];
  try {
    const res = await client.members.$get({
      query: { shopId: activeShop.id },
    });
    if (res.ok) {
      const body = await res.json();
      members = body.data;
    }
  } catch (e) {
    console.error("Failed to load members", e);
  }

  return {
    members,
  };
};
