import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

type NeonSql = ReturnType<typeof neon>;

const DEFAULT_ADMIN_ACCOUNT = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin";

export const SUPER_ADMIN_NAME = "Super Admin";

let sqlClient: NeonSql | null = null;
let ensureTablesPromise: Promise<void> | null = null;
let ensureAdminUsersPromise: Promise<void> | null = null;

export type AdminConfig = {
  account: string;
  passwordHash: string;
};

export type AdminRole = "super_admin" | "admin";

export type AdminUser = {
  id: string;
  account: string;
  name: string;
  role: AdminRole;
  createdAt: string;
};

export type AdminUserRecord = AdminUser & {
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

type AdminUserRow = {
  id: string;
  account: string;
  name: string | null;
  password_hash: string;
  role: string;
  created_at: string | Date;
};

function mapAdminUser(row: AdminUserRow): AdminUserRecord {
  const role: AdminRole = row.role === "super_admin" ? "super_admin" : "admin";
  const savedName = typeof row.name === "string" ? row.name.trim() : "";
  return {
    id: String(row.id),
    account: String(row.account),
    name: role === "super_admin" ? SUPER_ADMIN_NAME : savedName || String(row.account),
    role,
    passwordHash: String(row.password_hash),
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  };
}

export function publicAdminUser(user: AdminUserRecord): AdminUser {
  return {
    id: user.id,
    account: user.account,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt
  };
}

export async function ensureAdminUsers(sql = getSql()) {
  if (!ensureAdminUsersPromise) {
    ensureAdminUsersPromise = (async () => {
      await ensureTables(sql);
      await sql`
        CREATE TABLE IF NOT EXISTS onehousing_admin_users (
          id text PRIMARY KEY,
          account text NOT NULL,
          name text NOT NULL DEFAULT '',
          password_hash text NOT NULL,
          role text NOT NULL DEFAULT 'admin',
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS onehousing_admin_users_account_idx
        ON onehousing_admin_users (lower(account))
      `;
      const rows = (await sql`
        SELECT count(*)::int AS total
        FROM onehousing_admin_users
        WHERE role = 'super_admin'
      `) as Array<{ total?: number }>;
      if (rows[0]?.total) return;
      // The first deploy of account management promotes the legacy single admin
      // login into the super admin row so nobody is locked out.
      const legacy = await getAdminConfig(sql);
      await sql`
        INSERT INTO onehousing_admin_users (id, account, name, password_hash, role)
        VALUES (
          ${`user_${randomUUID()}`},
          ${legacy.account},
          ${SUPER_ADMIN_NAME},
          ${legacy.passwordHash},
          'super_admin'
        )
        ON CONFLICT DO NOTHING
      `;
    })().catch((error) => {
      ensureAdminUsersPromise = null;
      throw error;
    });
  }
  await ensureAdminUsersPromise;
}

export async function listAdminUsers(sql = getSql()): Promise<AdminUser[]> {
  await ensureAdminUsers(sql);
  const rows = (await sql`
    SELECT id, account, name, password_hash, role, created_at
    FROM onehousing_admin_users
    ORDER BY CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END, created_at ASC
  `) as AdminUserRow[];
  return rows.map((row) => publicAdminUser(mapAdminUser(row)));
}

export async function findAdminUserByAccount(account: string, sql = getSql()) {
  await ensureAdminUsers(sql);
  const rows = (await sql`
    SELECT id, account, name, password_hash, role, created_at
    FROM onehousing_admin_users
    WHERE lower(account) = lower(${account})
    LIMIT 1
  `) as AdminUserRow[];
  return rows[0] ? mapAdminUser(rows[0]) : null;
}

export async function findAdminUserById(id: string, sql = getSql()) {
  await ensureAdminUsers(sql);
  const rows = (await sql`
    SELECT id, account, name, password_hash, role, created_at
    FROM onehousing_admin_users
    WHERE id = ${id}
    LIMIT 1
  `) as AdminUserRow[];
  return rows[0] ? mapAdminUser(rows[0]) : null;
}

export async function createAdminUser(
  input: { account: string; name: string; passwordHash: string },
  sql = getSql()
) {
  await ensureAdminUsers(sql);
  const rows = (await sql`
    INSERT INTO onehousing_admin_users (id, account, name, password_hash, role)
    VALUES (
      ${`user_${randomUUID()}`},
      ${input.account},
      ${input.name},
      ${input.passwordHash},
      'admin'
    )
    RETURNING id, account, name, password_hash, role, created_at
  `) as AdminUserRow[];
  return mapAdminUser(rows[0]);
}

export async function updateAdminUserPassword(
  id: string,
  passwordHash: string,
  sql = getSql()
) {
  await ensureAdminUsers(sql);
  await sql`
    UPDATE onehousing_admin_users
    SET password_hash = ${passwordHash}
    WHERE id = ${id}
  `;
}

export async function updateAdminUserName(id: string, name: string, sql = getSql()) {
  await ensureAdminUsers(sql);
  await sql`
    UPDATE onehousing_admin_users
    SET name = ${name}
    WHERE id = ${id} AND role <> 'super_admin'
  `;
}

export async function deleteAdminUser(id: string, sql = getSql()) {
  await ensureAdminUsers(sql);
  await sql`
    DELETE FROM onehousing_admin_users
    WHERE id = ${id} AND role <> 'super_admin'
  `;
}
