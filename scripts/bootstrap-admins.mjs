// One-time Super Admin bootstrap for production.
// Usage: DATABASE_URL=... NEXT_PUBLIC_SITE_URL=https://your-site npm run db:bootstrap-admins -- first@example.com second@example.com
// Creates the two people, grants super_admin directly (the only time a role is granted without a second confirmation),
// and prints one-time activation links. Refuses to run if any Super Admin already exists.
import postgres from 'postgres';
import { randomBytes, createHash } from 'node:crypto';

const emails = process.argv.slice(2).map((e) => e.trim().toLowerCase()).filter(Boolean);
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required'); process.exit(1); }
if (emails.length !== 2 || emails.some((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) { console.error('Pass exactly two valid emails'); process.exit(1); }
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const sql = postgres(process.env.DATABASE_URL, { prepare: false, ssl: process.env.DATABASE_URL.includes('localhost') ? false : 'require' });
try {
  await sql.begin(async (tx) => {
    const [{ n }] = await tx`select count(*)::int n from app.role_assignments where role_key = 'super_admin' and revoked_at is null`;
    if (n > 0) throw new Error('Super Admins already exist. Use the app to manage roles.');
    for (const email of emails) {
      const token = randomBytes(32).toString('base64url');
      const hash = createHash('sha256').update(token).digest('hex');
      const [p] = await tx`insert into app.people(kind, full_name, email) values ('staff', ${email.split('@')[0]}, ${email})
                           on conflict (email) do update set email = excluded.email returning id`;
      await tx`insert into app.role_assignments(person_id, role_key) values (${p.id}, 'super_admin') on conflict do nothing`;
      await tx`insert into app.account_provisions(person_id, email, source, token_hash, expires_at) values (${p.id}, ${email}, 'bootstrap', ${hash}, now() + interval '72 hours')`;
      await tx`select app.audit('bootstrap.super_admin', 'person', ${p.id}::text, null, ${sql.json({ email })})`;
      console.log(`${email}\n  activate: ${site}/activate/${token}\n`);
    }
  });
  console.log('Done. Each admin must activate, then enrol two-step verification at /mfa. Update their display names in the app.');
} catch (e) { console.error(e.message); process.exitCode = 1; } finally { await sql.end(); }
