import { hc } from "hono/client";
import type { AppType } from "@shelf/api";
import { browser } from "$app/environment";

export const getApiClient = (
  customFetch: typeof fetch,
  additionalHeaders?: Record<string, string>,
) => {
  const url = browser ? "/api" : "http://127.0.0.1:3000";
  return hc<AppType>(url, {
    fetch: customFetch,
    headers: additionalHeaders,
  }) as any;
};

export const apiClient = getApiClient(globalThis.fetch);
export type Client = typeof apiClient;
