#!/bin/sh
set -e

echo "[RankPilot Docker] Initializing production container..."

# Ensure persistent database directory exists if using SQLite
if echo "$DATABASE_URL" | grep -q "file:"; then
  DB_PATH=$(echo "$DATABASE_URL" | sed 's/file://')
  DB_DIR=$(dirname "$DB_PATH")
  if [ -n "$DB_DIR" ] && [ "$DB_DIR" != "." ]; then
    mkdir -p "$DB_DIR" 2>/dev/null || true
  fi
  echo "[RankPilot Docker] Verified SQLite storage directory for: $DB_PATH"
fi

# Synchronize Prisma schema with persistent database
echo "[RankPilot Docker] Synchronizing Prisma database schema..."
npx prisma db push --skip-generate || {
  echo "[RankPilot Docker] Notice: prisma db push finished with status $?, continuing boot."
}

echo "[RankPilot Docker] Starting RankPilot Remix server on port ${PORT:-3000}..."
exec "$@"
