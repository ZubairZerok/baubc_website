'use client';
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

export type ActionResult = { ok: boolean; message: string; data?: any } | null;
type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

export function SubmitButton({ children, className = 'btn btn-primary', pendingText, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || rest.disabled} aria-disabled={pending} {...rest}>
      <span>{pending ? pendingText ?? 'Working…' : children}</span>
    </button>
  );
}

/** A form bound to a server action that shows the result inline (role=status). */
export function ActionForm({ action, children, className = '', resetOnSuccess = false, id }: { action: Action; children: React.ReactNode; className?: string; resetOnSuccess?: boolean; id?: string }) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && resetOnSuccess) ref.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} id={id}>
      {children}
      {state?.message && (
        <p role="status" className={`text-sm mt-2 ${state.ok ? 'text-green' : 'text-soil'}`}>{state.message}</p>
      )}
    </form>
  );
}
