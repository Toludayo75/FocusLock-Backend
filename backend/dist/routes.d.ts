import type { Express } from "express";
import { User as AppUser } from "./schema.js";
declare global {
    namespace Express {
        interface User extends AppUser {
        }
    }
}
export declare function registerRoutes(app: Express): void;
//# sourceMappingURL=routes.d.ts.map