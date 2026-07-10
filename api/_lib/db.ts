import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

type NeonSql = ReturnType<typeof neon>;

const DEFAULT_ADMIN_ACCOUNT = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin";

let sqlClient: NeonSql | null = null;
let ensureTablesPromise: Promise<void> | null = null;

export type AdminConfig = {
  account: string;
  passwordHash: string;
};

export function getDatabaseUrl() {
  return (
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ""
  );
}

export function getSql() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Missing NEON_DATABASE_URL");
  }
  if (!sqlClient) {
    sqlClient = neon(databaseUrl);
  }
  return sqlClient;
}

export async function ensureTables(sql = getSql()) {
  if (!ensureTablesPromise) {
    ensureTablesPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS onehousing_app_state (
          id text PRIMARY KEY,
          data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS onehousing_app_state_history (
          version_id bigserial PRIMARY KEY,
          state_id text NOT NULL,
          data jsonb NOT NULL,
          saved_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS onehousing_app_settings (
          key text PRIMARY KEY,
          value jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
    })();
  }
  await ensureTablesPromise;
}

export async function getAdminConfig(sql = getSql()): Promise<AdminConfig> {
  await ensureTables(sql);
  const rows = (await sql`
    SELECT value
    FROM onehousing_app_settings
    WHERE key = 'admin'
    LIMIT 1
  `) as Array<{ value?: Partial<AdminConfig> }>;
  const saved = rows[0]?.value as Partial<AdminConfig> | undefined;
  return {
    account:
      typeof saved?.account === "string" && saved.account.trim()
        ? saved.account.trim()
        : process.env.ADMIN_ACCOUNT || DEFAULT_ADMIN_ACCOUNT,
    passwordHash:
      typeof saved?.passwordHash === "string" && saved.passwordHash.trim()
        ? saved.passwordHash.trim()
        : process.env.ADMIN_PASSWORD_HASH ||
          process.env.VITE_ADMIN_CODE_HASH ||
          createHash("sha256").update(DEFAULT_ADMIN_PASSWORD).digest("hex")
  };
}

export async function saveAdminConfig(config: AdminConfig, sql = getSql()) {
  await ensureTables(sql);
  await sql`
    INSERT INTO onehousing_app_settings (key, value, updated_at)
    VALUES ('admin', ${JSON.stringify(config)}::jsonb, now())
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}
