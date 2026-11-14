// Loads the real migrations into an in-process PGlite database (preview mode / tests).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

export function sqlFiles(root = process.cwd()) {
  const mig = join(root, 'supabase', 'migrations');
  const prev = join(root, 'supabase', 'preview');
  return {
    shim: [join(prev, '00_shim.sql')],
    migrations: readdirSync(mig).filter((f) => f.endsWith('.sql')).sort().map((f) => join(mig, f)),
    sample: [join(prev, '10_sample_data.sql')],
  };
}

export async function createPreviewDb({ root = process.cwd(), sample = true, dataDir } = {}) {
  const db = await PGlite.create(dataDir ? { dataDir } : undefined);
  const files = sqlFiles(root);
  const order = [...files.shim, ...files.migrations, ...(sample ? files.sample : [])];
  for (const f of order) {
    try {
      await db.exec(readFileSync(f, 'utf8'));
    } catch (e) {
      throw new Error(`Failed in ${f}: ${e.message}`);
    }
  }
  return db;
}
