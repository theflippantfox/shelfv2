import { config } from "dotenv";
import { resolve } from "path";
import postgres from "postgres";

config({ path: resolve("../../.env") });

async function run() {
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

    await sql`
    CREATE TABLE IF NOT EXISTS "transactions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "shop_id" uuid NOT NULL REFERENCES "shops"("id") ON DELETE cascade,
      "cashier_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE set null,
      "total_amount" numeric(12, 2) NOT NULL,
      "tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
      "discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
      "payment_method" text DEFAULT 'cash' NOT NULL,
      "status" text DEFAULT 'completed' NOT NULL,
      "receipt_id" text NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;

    console.log("Created transactions table");

    await sql`
    CREATE TABLE IF NOT EXISTS "transaction_items" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "transaction_id" uuid NOT NULL REFERENCES "transactions"("id") ON DELETE cascade,
      "product_id" uuid REFERENCES "products"("id") ON DELETE set null,
      "product_name" text NOT NULL,
      "qty" integer NOT NULL,
      "unit_price" numeric(12, 2) NOT NULL,
      "subtotal" numeric(12, 2) NOT NULL
    );
  `;

    console.log("Created transaction_items table");

    await sql.end();
}

run().catch(console.error);
