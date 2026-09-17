import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ url, parent }) => {
  const { client, activeShop } = await parent();
  const period = url.searchParams.get("period") ?? "30d";

  if (!activeShop) return { analytics: null, period };

  try {
    const resp = await client.analytics.$get({
      query: { shopId: activeShop.id, period },
    });
    if (resp.ok) {
      const body = await resp.json();
      return { analytics: body, period };
    }
    return { analytics: null, period };
  } catch {
    return { analytics: null, period };
  }
};
