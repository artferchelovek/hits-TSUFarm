import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../config.ts";
import * as schema from "./schema.ts";

const { Pool } = pg;

const pool = new Pool({ connectionString: config.databaseUrl });

export const db = drizzle(pool, { schema });
