import { hc } from "hono/client";
import type { AppType } from "@shelf/api";
import { env } from "$env/dynamic/public";

const API_URL = env.PUBLIC_API_URL || "http://127.0.0.1:3000";

export const getApiClient = (
  customFetch: typeof fetch,
  additionalHeaders?: Record<string, string>,
) => {
  return hc<AppType>(API_URL, {
    fetch: customFetch,
    headers: additionalHeaders,
  }) as any;
};

export const apiClient = getApiClient(globalThis.fetch);
export type Client = typeof apiClient;
