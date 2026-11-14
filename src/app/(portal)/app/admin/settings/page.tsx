import { PageTitle } from '@/components/portal/Shell';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { saveSetting } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';

const HELP: Record<string, string> = {
  club: 'Name, tagline, bio, official email and location shown across the site.',
  social: 'Facebook, YouTube and LinkedIn links and the follower count shown on the home page.',
  payments: 'The bKash number payers send to (shown on payment pages) and the payment instructions.',
  features: 'Turn optional pages on or off; leaderboard visibility.',
  security: 'Sensitive: two-step verification requirement. Needs a second Super Admin.',
  finance: 'Sensitive: amount above which a second payment verifier is required. Needs a second Super Admin.',
  points: 'Sensitive: adjustment size that needs approval. Needs a second Super Admin.',
};

export default async function SettingsPage() {
  const session = await requireSession('/app/admin/settings');
  const rows = await withClaims(session.claims, (tx) => tx.query(`select key, value, updated_at from app.site_settings order by is_public desc, key`));
  return (
    <>
      <PageTitle label="Admin" title="Settings">Values are stored as JSON. Sensitive settings are applied only after another Super Admin confirms.</PageTitle>
      <div className="grid xl:grid-cols-2 gap-4">
        {rows.map((r: any) => (
          <ActionForm key={r.key} action={saveSetting} className="panel grid gap-2">
            <input type="hidden" name="key" value={r.key} />
            <div className="flex justify-between gap-2"><b className="font-mono">{r.key}</b>{['security', 'finance', 'points'].includes(r.key) && <span className="chip chip-pend">2nd Super Admin</span>}</div>
            <p className="text-sm text-muted">{HELP[r.key]}</p>
            <textarea name="value" className="textarea font-mono text-xs min-h-[160px]" defaultValue={JSON.stringify(r.value, null, 2)} aria-label={`${r.key} value`} />
            <SubmitButton className="btn btn-secondary btn-sm w-max">Save</SubmitButton>
          </ActionForm>
        ))}
      </div>
    </>
  );
}
