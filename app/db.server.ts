import { PrismaClient } from "@prisma/client";

// Ensure writable database path on serverless (Vercel)
if (process.env.VERCEL) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("/data/")) {
    process.env.DATABASE_URL = "file:/tmp/dev.sqlite";
  }
}

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const db: PrismaClient =
  globalThis.prismaGlobal ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = db;
}

export default db;
