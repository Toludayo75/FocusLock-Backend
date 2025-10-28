import { Express } from "express";
import { User as DatabaseUser } from "./schema.js";
declare global {
    namespace Express {
        interface User extends DatabaseUser {
        }
    }
}
export declare function setupAuth(app: Express): void;
//# sourceMappingURL=auth.d.ts.map