import postgres from "postgres";
import { config } from "dotenv";
config({ path: "../../.env", override: true });

console.log("Connecting to:", process.env.HOST, "as", process.env.USER);

const sql = postgres({
  host: process.env.HOST,
  port: Number(process.env.PORT),
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  ssl: "require",
});
async function main() {
  try {
    const res = await sql`SELECT 1 as result`;
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
main();
