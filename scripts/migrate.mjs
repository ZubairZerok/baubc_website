// Applies supabase/migrations/*.sql to DATABASE_URL in order, tracking applied files in ops.schema_migrations.
// Prefer `supabase db push` when using the Supabase CLI; this script is a dependency-free alternative.
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required'); process.exit(1); }
const sql = postgres(process.env.DATABASE_URL, { prepare: false, ssl: process.env.DATABASE_URL.includes('localhost') ? false : 'require', onnotice: () => {} });
const dir = join(process.cwd(), 'supabase', 'migrations');
try {
  await sql`create schema if not exists ops`;
  await sql`create table if not exists ops.schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await sql`select name from ops.schema_migrations`).map((r) => r.name));
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    if (done.has(f)) continue;
    process.stdout.write(`applying ${f} … `);
    await sql.begin(async (tx) => { await tx.unsafe(readFileSync(join(dir, f), 'utf8')); await tx`insert into ops.schema_migrations(name) values (${f})`; });
    console.log('ok');
  }
  console.log('Migrations up to date.');
} catch (e) { console.error('\n' + e.message); process.exitCode = 1; } finally { await sql.end(); }
