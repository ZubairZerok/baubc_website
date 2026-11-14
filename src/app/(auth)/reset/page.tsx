import { ActionForm, SubmitButton } from '@/components/ui/forms';
import { requestPasswordReset } from '@/app/actions/auth';

export default function ResetPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2"><h1 className="display-md text-4xl">Reset your password</h1><p className="text-ink-2">We will email you a link if an account exists.</p></div>
      <ActionForm action={requestPasswordReset} className="grid gap-4">
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" required autoComplete="email" /></div>
        <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
      </ActionForm>
    </div>
  );
}
