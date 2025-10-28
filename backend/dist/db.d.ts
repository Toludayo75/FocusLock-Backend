import 'dotenv/config';
import { Pool } from 'pg';
import * as schema from "./schema.js";
export declare const pool: Pool;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: Pool;
};
//# sourceMappingURL=db.d.ts.map