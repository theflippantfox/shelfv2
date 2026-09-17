import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  const { client, supabase } = await parent();

  return {
    client,
    supabase,
  };
};
