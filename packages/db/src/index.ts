import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDb(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client);
}

// Re-export everything from schema
export * from "./schema";

// Explicit named re-exports to satisfy LSP module resolution
export {
  profiles,
  shops,
  shopMembers,
  categories,
  products,
  tags,
  suppliers,
  transactions,
  transactionItems,
  customers,
  returns,
  returnItems,
  purchaseOrders,
  purchaseOrderItems,
  stockAdjustments,
} from "./schema";
