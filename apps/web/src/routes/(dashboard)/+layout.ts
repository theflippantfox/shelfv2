import { redirect } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";
import { getApiClient } from "$lib/api";

export const load: LayoutLoad = async ({ fetch, parent }) => {
  const { session, user } = await parent();

  const client = getApiClient(
    fetch,
    session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : undefined,
  );

  let shops = [];
  let apiError = false;

  try {
    const shopsResponse = await client.shops.$get();

    // DEBUG LOG
    console.log(
      "SHOPS RESPONSE STATUS:",
      shopsResponse.status,
      shopsResponse.statusText,
    );
    if (shopsResponse.ok) {
      shops = (await shopsResponse.json()).data;
    } else {
      console.log("SHOPS FAIL API BODY:", await shopsResponse.text());
      apiError = true;
    }
  } catch (err) {
    console.error("⚠️ API connection failed during layout load:", err);
    apiError = true;
  }

  // If we couldn't contact the API, do not assume they have no shops.
  // We should either throw a 500 error page or let the UI handle the offline state.
  if (apiError) {
    return {
      client,
      shops: [],
      activeShop: null,
      apiDown: true,
    };
  }

  // Redirect to onboarding if the user actually has no shops
  if (shops.length === 0) {
    console.log(
      "USER HAS ZERO SHOPS, REDIRECTING TO ONBOARDING. USER ID WAS:",
      user?.id,
    );
    throw redirect(303, "/onboarding");
  }

  return {
    client,
    shops,
    activeShop: shops[0],
    apiDown: false,
  };
};
