import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { updatePassword } from '@/app/actions/auth';
import { requireSession } from '@/server/session';

export default async function PasswordPage() {
  await requireSession('/account/password');
  return (
    <div className="grid gap-6">
      <h1 className="display-md text-4xl">Change password</h1>
      <ActionForm action={updatePassword} className="grid gap-4">
        <div className="field"><label htmlFor="pw">New password</label><input id="pw" name="password" type="password" className="input" minLength={10} required autoComplete="new-password" /></div>
        <div className="field"><label htmlFor="pw2">Repeat password</label><input id="pw2" name="confirm" type="password" className="input" minLength={10} required autoComplete="new-password" /></div>
        <SubmitButton>Update password</SubmitButton>
      </ActionForm>
    </div>
  );
}
