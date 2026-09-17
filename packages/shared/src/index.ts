import { z } from "zod";

export const CreateShopSchema = z.object({
  name: z.string().min(1, "Name is required"),
  countryCode: z.string().length(2),
  currencyCode: z.string().length(3),
  timezone: z.string(),
});

export type CreateShop = z.infer<typeof CreateShopSchema>;
