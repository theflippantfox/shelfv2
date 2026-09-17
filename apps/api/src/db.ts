import { createDb } from "@shelf/db";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from monorepo root (go up from apps/api/ to project root)
const currentDir =
  typeof __dirname === "undefined"
    ? new URL(".", import.meta.url).pathname
    : __dirname;
config({ path: resolve(currentDir, "../../../.env") });

if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  DATABASE_URL is not set. API calls mapping to the database will fail.",
  );
}

// Lazy singleton — only connects when first queried, not at import time.
// This prevents the API from crashing on startup if the DB is temporarily
// unreachable or the connection string is being调试.
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Cannot create database connection.",
      );
    }
    _db = createDb(url);
  }
  return _db;
}

export const db = getDb();
