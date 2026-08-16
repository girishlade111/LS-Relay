import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const getDb = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing env var: DATABASE_URL");
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
};

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    const database = getDb();
    return Reflect.get(database, prop);
  },
});
