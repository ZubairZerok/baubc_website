// Applies supabase/migrations/*.sql to DATABASE_URL in order. Applied versions are tracked in
// supabase_migrations.schema_migrations, the same table the Supabase CLI uses, so `supabase db push` and this script agree.
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required'); process.exit(1); }
const sql = postgres(process.env.DATABASE_URL, { prepare: false, ssl: process.env.DATABASE_URL.includes('localhost') ? false : 'require', onnotice: () => {} });
const dir = join(process.cwd(), 'supabase', 'migrations');
try {
  await sql`create schema if not exists supabase_migrations`;
  await sql`create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)`;
  const done = new Set((await sql`select version from supabase_migrations.schema_migrations`).map((r) => r.version));
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    const [version, ...rest] = f.replace(/\.sql$/, '').split('_');
    if (done.has(version)) continue;
    process.stdout.write(`applying ${f} … `);
    const body = readFileSync(join(dir, f), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into supabase_migrations.schema_migrations(version, name, statements) values (${version}, ${rest.join('_')}, ${[body]})`;
    });
    console.log('ok');
  }
  console.log('Migrations up to date.');
} catch (e) { console.error('\n' + e.message); process.exitCode = 1; } finally { await sql.end(); }
