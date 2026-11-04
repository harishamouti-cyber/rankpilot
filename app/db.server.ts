import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

// Uses DATABASE_URL (Neon Postgres, pooled). Schema is managed by `prisma migrate deploy` at build time.
export const db: PrismaClient =
  globalThis.prismaGlobal ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = db;
}

// Kept for backwards compatibility; schema is now handled by Prisma migrations.
export async function ensureDatabaseSchema() {}

export default db;
