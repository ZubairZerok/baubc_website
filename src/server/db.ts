import 'server-only';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { env, isPreview } from './env';

export type Row = Record<string, any>;
export interface Tx {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T | undefined>;
}
export type Claims = { sub?: string; role: 'anon' | 'authenticated'; aal?: 'aal1' | 'aal2'; email?: string };

type Driver = {
  run<T>(claims: Claims | 'system', fn: (tx: Tx) => Promise<T>): Promise<T>;
};

const g = globalThis as unknown as { __baubcDriver?: Promise<Driver> };

function wrap(exec: (sql: string, params?: unknown[]) => Promise<Row[]>): Tx {
  return {
    query: (sql, params) => exec(sql, params) as Promise<any[]>,
    one: async (sql, params) => (await exec(sql, params))[0] as any,
  };
}

async function createPreviewDriver(): Promise<Driver> {
  const { PGlite } = await import('@electric-sql/pglite');
  const root = process.cwd();
  // Persist between restarts in local dev; in serverless use memory (preview only).
  const dataDir = process.env.VERCEL ? undefined : join(root, '.data', 'preview-db');
  if (dataDir && !existsSync(join(root, '.data'))) mkdirSync(join(root, '.data'), { recursive: true });
  const db = await PGlite.create(dataDir ? { dataDir } : undefined);
  const ready = await db.query<{ ok: boolean }>(`select to_regclass('app.people') is not null as ok`);
  if (!ready.rows[0]?.ok) {
    const mig = join(root, 'supabase', 'migrations');
    const files = [
      join(root, 'supabase', 'preview', '00_shim.sql'),
      ...readdirSync(mig).filter((f) => f.endsWith('.sql')).sort().map((f) => join(mig, f)),
      join(root, 'supabase', 'preview', '10_sample_data.sql'),
    ];
    for (const f of files) await db.exec(readFileSync(f, 'utf8'));
  }
  let chain: Promise<unknown> = Promise.resolve();
  return {
    run<T>(claims: Claims | 'system', fn: (tx: Tx) => Promise<T>) {
      const next = chain.then(() =>
        db.transaction(async (t) => {
          if (claims !== 'system') {
            await t.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
            await t.exec(`set local role ${claims.role === 'authenticated' ? 'authenticated' : 'anon'}`);
          }
          return fn(wrap(async (sql, params) => (await t.query(sql, params as any[])).rows as Row[]));
        }),
      );
      chain = next.catch(() => undefined);
      return next as Promise<T>;
    },
  };
}

async function createPostgresDriver(): Promise<Driver> {
  const postgres = (await import('postgres')).default;
  const sql = postgres(env.databaseUrl, {
    prepare: false, // required for Supabase transaction pooler
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: env.databaseUrl.includes('localhost') ? false : 'require',
  });
  return {
    run<T>(claims: Claims | 'system', fn: (tx: Tx) => Promise<T>) {
      return sql.begin(async (t) => {
        if (claims !== 'system') {
          await t.unsafe(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
          await t.unsafe(`set local role ${claims.role === 'authenticated' ? 'authenticated' : 'anon'}`);
        }
        return fn(wrap(async (q, params) => (await t.unsafe(q, (params ?? []) as any[])) as unknown as Row[]));
      }) as Promise<T>;
    },
  };
}

function driver(): Promise<Driver> {
  if (!g.__baubcDriver) {
    g.__baubcDriver = (isPreview ? createPreviewDriver() : createPostgresDriver()).catch((e) => {
      g.__baubcDriver = undefined;
      throw e;
    });
  }
  return g.__baubcDriver;
}

/** Run queries as a user (RLS enforced). Pass null for an anonymous visitor. */
export async function withClaims<T>(claims: Claims | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await driver()).run(claims ?? { role: 'anon' }, fn);
}

/** Run as the database owner (bypasses RLS). Only for webhooks, the job worker and auth plumbing. */
export async function asSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return (await driver()).run('system', fn);
}
