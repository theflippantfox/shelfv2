import { z } from "zod";
import { db } from "./src/db";
import { shops } from "@shelf/db";

const ShopSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  countryCode: z.string(),
  currencyCode: z.string(),
  currencySymbol: z.string().optional(),
  currencyLocale: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.string().optional(),
  taxRate: z.string().nullable().optional(),
  taxInclusive: z.boolean().optional(),
  taxName: z.string().optional(),
  theme: z.string(),
  primaryColor: z.string(),
  sidebarBg: z.string().optional(),
  onboardingComplete: z.boolean().optional(),
  onboardingStep: z.string().optional(),
  lowStockThreshold: z.number().optional(),
  receiptHeader: z.string().nullable().optional(),
  receiptFooter: z.string().nullable().optional(),
  createdAt: z.string(),
});

async function run() {
  const result = await db.select().from(shops).limit(1);
  const mapped = result.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
  try {
    const validated = ShopSchema.parse(mapped[0]);
    console.log("OK", validated);
  } catch (e) {
    console.error("ZOD ERROR:", JSON.stringify(e.errors, null, 2));
  }
}
run();
