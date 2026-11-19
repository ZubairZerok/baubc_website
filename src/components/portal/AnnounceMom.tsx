import { CopyButton } from '@/components/site/client';
import { env } from '@/server/env';

type Award = { period: string; full_name: string; citation: string; handle: string | null; public_profile: boolean };

/**
 * Ready-to-post Member of the Month announcement: the Facebook post text, a Messenger shout-out
 * and the share buttons. Shared profile links unfurl into the Member of the Month card (opengraph-image).
 */
export function AnnounceMom({ a }: { a: Award }) {
  const month = new Date(a.period).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const url = a.handle && a.public_profile ? `${env.siteUrl}/members/${a.handle}` : `${env.siteUrl}/members`;
  const post = `🏆 Member of the Month · ${month}\n\nCongratulations, ${a.full_name}! ${a.citation}\n\nThank you for raising the bar for all of us. 🌱\n\n${url}\n\n#BAUBC #MemberOfTheMonth`;
  const dm = `🎉 @${a.full_name}, you are BAUBC's Member of the Month for ${month}! ${a.citation} Your profile: ${url}`;
  return (
    <div className="rounded-[22px] border border-line bg-white/70 p-4 grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><b>Announce {a.full_name}</b><span className="chip chip-live">{month}</span></div>
      {a.handle && a.public_profile
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={`/api/og/member/${a.handle}`} alt={`Share card for ${a.full_name}`} className="w-full rounded-2xl border border-line" loading="lazy" />
        : <p className="text-sm text-soil">{a.full_name} has not made their profile public, so the link shows the Members page instead of their card. Ask them to switch it on in their profile.</p>}
      <div className="grid gap-1.5"><span className="label text-muted">Facebook post</span><pre className="whitespace-pre-wrap text-sm font-sans bg-paper rounded-xl p-3 border border-line">{post}</pre></div>
      <div className="flex flex-wrap gap-2">
        <CopyButton value={post} label="Copy post text" />
        <a className="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>Post on Facebook</a>
      </div>
      <div className="grid gap-1.5"><span className="label text-muted">Messenger shout-out</span><pre className="whitespace-pre-wrap text-sm font-sans bg-paper rounded-xl p-3 border border-line">{dm}</pre></div>
      <div className="flex flex-wrap gap-2">
        <CopyButton value={dm} label="Copy message" />
        <a className="btn btn-secondary btn-sm" href={`fb-messenger://share/?link=${encodeURIComponent(url)}`}>Open in Messenger (phone)</a>
      </div>
      <p className="hint">Paste the message in the members&apos; group chat and @mention them. The link shows the card above in Facebook and Messenger.</p>
    </div>
  );
}
