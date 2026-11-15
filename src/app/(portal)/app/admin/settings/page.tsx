import { PageTitle } from '@/components/portal/Shell';
import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { saveSetting } from '@/app/actions/portal';
import { withClaims } from '@/server/db';
import { requireSession } from '@/server/session';
import { relTime } from '@/lib/format';

type Field = { name: string; label: string; type: 'text' | 'area' | 'url' | 'number' | 'bool' | 'choice' | 'date'; hint?: string; choices?: [string, string][] };
const GROUPS: { key: string; title: string; help: string; sensitive?: boolean; fields: Field[] }[] = [
  { key: 'club', title: 'Club details', help: 'Shown in the header, footer, About page and emails.', fields: [
    { name: 'name', label: 'Full name', type: 'text' }, { name: 'short_name', label: 'Short name', type: 'text' }, { name: 'tagline', label: 'Tagline', type: 'text' },
    { name: 'bio', label: 'About the club', type: 'area' }, { name: 'email', label: 'Official email', type: 'text' }, { name: 'location', label: 'Address', type: 'text' }] },
  { key: 'payments', title: 'bKash payments', help: 'The number people send money to. It appears on payment pages only when someone has an invoice to pay.', fields: [
    { name: 'bkash_number', label: 'bKash number', type: 'text', hint: 'Leave empty to pause paid registration.' },
    { name: 'bkash_account_type', label: 'Account type', type: 'choice', choices: [['Personal', 'Personal (Send Money)'], ['Merchant', 'Merchant (Payment)'], ['Agent', 'Agent (Cash In)']] },
    { name: 'instructions', label: 'Instructions shown to the payer', type: 'area' }] },
  { key: 'social', title: 'Social links', help: 'Footer links and the follower number on the home page.', fields: [
    { name: 'facebook_url', label: 'Facebook page', type: 'url' }, { name: 'youtube_url', label: 'YouTube channel', type: 'url' }, { name: 'linkedin_url', label: 'LinkedIn page', type: 'url' },
    { name: 'facebook_followers', label: 'Facebook followers', type: 'number' }, { name: 'stats_as_of', label: 'Numbers correct as of', type: 'date' }] },
  { key: 'features', title: 'Pages', help: 'Switch optional pages on or off.', fields: [
    { name: 'members_directory', label: 'Members page', type: 'bool' }, { name: 'gallery', label: 'Gallery page', type: 'bool' }, { name: 'resources', label: 'Resources page', type: 'bool' }, { name: 'perks', label: 'Member perks', type: 'bool' },
    { name: 'leaderboard', label: 'Leaderboard', type: 'choice', choices: [['off', 'Hidden'], ['members', 'Members only'], ['public', 'Public page']] }] },
  { key: 'security', title: 'Sign-in security', sensitive: true, help: 'Two-step verification for officers who approve money, roles and memberships.', fields: [{ name: 'mfa_required', label: 'Require two-step verification for sensitive actions', type: 'bool' }] },
  { key: 'finance', title: 'Payment checks', sensitive: true, help: 'Payments at or above this amount need two different people to verify them.', fields: [{ name: 'second_verifier_threshold', label: 'Second check from (BDT)', type: 'number' }] },
  { key: 'points', title: 'Point adjustments', sensitive: true, help: 'Manual adjustments larger than this go to an approver first.', fields: [{ name: 'adjustment_approval_above', label: 'Needs approval above (points)', type: 'number' }] },
];

export default async function SettingsPage() {
  const session = await requireSession('/app/admin/settings');
  const rows = await withClaims(session.claims, (tx) => tx.query(`select key, value, updated_at from app.site_settings`));
  const val = (k: string) => rows.find((r: any) => r.key === k) as any;
  return (
    <>
      <PageTitle label="Admin" title="Settings">Plain fields, no code. Three groups are marked sensitive: those change only after the other Super Admin confirms.</PageTitle>
      <div className="grid xl:grid-cols-2 gap-5 items-start">
        {GROUPS.filter((g) => val(g.key)).map((g) => {
          const v = val(g.key).value ?? {};
          return (
            <ActionForm key={g.key} action={saveSetting} className="panel grid gap-3.5">
              <input type="hidden" name="key" value={g.key} />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid gap-0.5"><h2 className="heading text-lg">{g.title}</h2><p className="text-sm text-ink-2">{g.help}</p></div>
                {g.sensitive && <span className="chip chip-pend">Needs both Super Admins</span>}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {g.fields.map((f) => {
                  const id = `${g.key}-${f.name}`;
                  if (f.type === 'bool') return <label key={f.name} className="check sm:col-span-2"><input type="checkbox" name={f.name} defaultChecked={!!v[f.name]} />{f.label}</label>;
                  return (
                    <div key={f.name} className={`field ${f.type === 'area' || f.type === 'url' ? 'sm:col-span-2' : ''}`}><label htmlFor={id}>{f.label}</label>
                      {f.type === 'area' ? <textarea id={id} name={f.name} className="textarea min-h-[96px]" defaultValue={v[f.name] ?? ''} />
                        : f.type === 'choice' ? <select id={id} name={f.name} className="select" defaultValue={String(v[f.name] ?? f.choices![0][0])}>{f.choices!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                        : <input id={id} name={f.name} className="input" type={f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : f.type === 'date' ? 'date' : 'text'} min={f.type === 'number' ? 0 : undefined} defaultValue={v[f.name] ?? ''} inputMode={f.name === 'bkash_number' ? 'tel' : undefined} />}
                      {f.hint && <span className="hint">{f.hint}</span>}</div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3"><SubmitButton className="btn btn-primary btn-sm">{g.sensitive ? 'Request change' : 'Save'}</SubmitButton><span className="text-xs text-muted">Last changed {relTime(val(g.key).updated_at)}</span></div>
            </ActionForm>
          );
        })}
      </div>
    </>
  );
}
