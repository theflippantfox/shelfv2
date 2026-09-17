import { config } from "dotenv";
import { execSync } from "child_process";
import { resolve } from "path";

config({ path: resolve("../../.env") });
try {
  execSync("npx drizzle-kit push --force", { stdio: "inherit" });
} catch (e: any) {
  console.error(e.message);
  process.exit(1);
}
