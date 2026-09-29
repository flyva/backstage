// Applique les migrations Drizzle sur la base de production, sans dépendre de drizzle-kit.
//   DATABASE_URL="mysql://user:mdp@127.0.0.1:3306/backstage" node migrate.mjs
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant");
  process.exit(1);
}

const folder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "drizzle");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await migrate(drizzle(connection), { migrationsFolder: folder });
  console.log("Migrations appliquées ✓");
} finally {
  await connection.end();
}
