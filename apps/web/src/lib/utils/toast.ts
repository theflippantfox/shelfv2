/**
 * Toast helper — wraps the global toast component's API.
 * Usage: import { toast } from '$lib/utils/toast';
 *        toast.success('Saved!');
 */

type Variant = "success" | "error" | "info";

function getToasts() {
 if (typeof window !== "undefined" && (window as any).__shelf_toasts) {
  return (window as any).__shelf_toasts;
 }
 // SSR fallback — no-op
 return { add: (_msg: string, _variant: Variant) => {} };
}

export const toast = {
 success(message: string) {
  getToasts().add(message, "success");
 },
 error(message: string) {
  getToasts().add(message, "error");
 },
 info(message: string) {
  getToasts().add(message, "info");
 },
};
