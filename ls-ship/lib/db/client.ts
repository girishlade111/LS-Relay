import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing env var: DATABASE_URL");
}

const rawSql = neon(databaseUrl);

// Neon's free tier suspends idle computes; the first query after a wake-up
// can fail transiently (fetch failed / connection reset). Retry only those —
// real SQL errors (syntax, constraints) still surface immediately.
const TRANSIENT_PATTERN =
  /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|Connection terminated|terminated unexpectedly|503|504/i;

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!TRANSIENT_PATTERN.test(message)) {
        throw error;
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

// Transparent retry wrapper — keeps the same call signature drizzle expects.
const sql = new Proxy(rawSql, {
  apply(target, thisArg, args) {
    return withRetry(() =>
      Reflect.apply(
        target as (
          ...callArgs: unknown[]
        ) => Promise<Record<string, unknown>[]>,
        thisArg,
        args
      )
    );
  },
}) as typeof rawSql;

export const db = drizzle(sql, { schema });
