import { config } from "dotenv";
import { resolve } from "path";
import postgres from "postgres";

config({ path: resolve("../../.env") });

async function run() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const members = await sql`SELECT user_id, shop_id FROM shop_members`;
  console.log("MEMBERS:", members);
  await sql.end();
}
run();
