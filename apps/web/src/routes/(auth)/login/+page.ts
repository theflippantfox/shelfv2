// Re-export layout data so TypeScript knows about supabase, session, etc.
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  return await parent();
};
