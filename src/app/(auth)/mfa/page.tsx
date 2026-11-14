import { MfaClient } from './MfaClient';
import { env, isPreview } from '@/server/env';
import { requireSession } from '@/server/session';

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await requireSession('/mfa');
  const { next = '/app' } = await searchParams;
  if (isPreview) return <div className="grid gap-3"><h1 className="display-md text-4xl">Two-step verification</h1><p className="text-ink-2">In preview mode personas are already verified.</p></div>;
  return <MfaClient url={env.supabaseUrl} anonKey={env.supabaseKey} next={next.startsWith('/') ? next : '/app'} />;
}
