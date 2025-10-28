import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema.js";
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
// Use node-postgres Pool for Render Postgres. Render requires SSL; disable
// certificate verification for convenience (Render-managed certs).
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });
//# sourceMappingURL=db.js.map