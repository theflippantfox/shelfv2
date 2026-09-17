import type { LayoutServerLoad } from "./$types";
import { getApiClient } from "$lib/api";

export const load: LayoutServerLoad = async ({ locals, fetch }) => {
  const { session, user } = await locals.safeGetSession();

  let member = null;

  if (session?.access_token && user) {
    try {
      const client = getApiClient(fetch, {
        Authorization: `Bearer ${session.access_token}`,
      });
      const shopsResp = await client.shops.$get();
      if (shopsResp.ok) {
        const { data: shops } = await shopsResp.json();
        if (shops.length > 0) {
          const membersResp = await client.members.$get({
            query: { shopId: shops[0].id },
          });
          if (membersResp.ok) {
            const { data: members } = await membersResp.json();
            const myMember = members.find((m: any) => m.userId === user.id);
            if (myMember) {
              member = {
                role: myMember.role,
                shop_id: myMember.shopId,
                permissions: myMember.permissions ?? null,
              };
            }
          }
        }
      }
    } catch {
      // Auth store will remain unauthenticated, which is fine
    }
  }

  return {
    session,
    user,
    member,
  };
};
