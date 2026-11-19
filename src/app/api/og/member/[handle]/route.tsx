import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getPublicProfile } from '@/server/queries/public';

/** The card Facebook, Messenger and WhatsApp show when someone shares a profile link. Member of the Month gets the gold version. */
const size = { width: 1200, height: 630 };

const MARK = 'M292 250 382 161 541 321 545 363H405ZM667 271 760 364 675 450 581 357ZM191 387H545L549 492 640 489V838H517V609L353 773 260 680 424 514H191ZM665 488 708 486 871 648 782 737 665 620Z';

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [p, display, text] = await Promise.all([
    getPublicProfile(handle),
    readFile(join(process.cwd(), 'src/assets/fonts/BricolageGrotesque-Bold.ttf')),
    readFile(join(process.cwd(), 'src/assets/fonts/Inter-SemiBold.otf')),
  ]);
  const name = p?.name ?? 'BAUBC member';
  const award = p?.awards?.[0];
  const month = award ? new Date(award.period).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;
  const lead = p?.units.find((u) => u.lead);
  const role = p?.kind === 'teacher' ? 'Club Advisor' : lead?.title ? `${lead.title} · ${lead.name}` : p?.units[0]?.name ?? 'Member';
  const initial = name.trim().charAt(0).toUpperCase();
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: 'linear-gradient(135deg,#F8FFDD 0%,#EEFFB3 45%,#C9F53B 100%)', fontFamily: 'Inter' }}>
        <svg width="760" height="760" viewBox="150 120 760 760" style={{ position: 'absolute', right: -170, bottom: -230, opacity: 0.12 }}><path d={MARK} fill="#016737" /></svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 64, padding: '0 80px', width: '100%' }}>
          <div style={{ display: 'flex', position: 'relative', width: 300, height: 300 }}>
            <div style={{ display: 'flex', position: 'absolute', inset: 0, borderRadius: 999, background: award ? '#C9F53B' : '#016737' }} />
            <div style={{ display: 'flex', position: 'absolute', left: 14, top: 14, width: 272, height: 272, borderRadius: 999, background: '#fff' }} />
            {p?.photo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={p.photo_url} alt="" width={252} height={252} style={{ position: 'absolute', left: 24, top: 24, borderRadius: 999, objectFit: 'cover' }} />
              : <div style={{ display: 'flex', position: 'absolute', left: 24, top: 24, width: 252, height: 252, borderRadius: 999, background: 'linear-gradient(135deg,#1FA85B,#014D2A)', color: '#fff', fontFamily: 'Bricolage', fontSize: 130, alignItems: 'center', justifyContent: 'center' }}>{initial}</div>}
            {award && <div style={{ display: 'flex', position: 'absolute', right: 6, bottom: 10, width: 76, height: 76, borderRadius: 999, background: '#F5B63A', border: '7px solid #fff', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>★</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex' }}>
              <div style={{ display: 'flex', padding: '10px 22px', borderRadius: 999, background: '#0A2015', color: '#E0FF73', fontSize: 22, letterSpacing: 2 }}>{award ? `★ MEMBER OF THE MONTH · ${month!.toUpperCase()}` : 'BAUBC MEMBER'}</div>
            </div>
            <div style={{ display: 'flex', fontFamily: 'Bricolage', fontSize: name.length > 18 ? 76 : 98, color: '#0A2015', letterSpacing: -3, marginTop: 22, lineHeight: 1 }}>{name}</div>
            <div style={{ display: 'flex', fontSize: 32, color: '#016737', marginTop: 18 }}>{role}</div>
            {award && <div style={{ display: 'flex', fontSize: 26, color: '#2B3D32', marginTop: 18, maxWidth: 640, lineHeight: 1.35 }}>“{award.citation.slice(0, 120)}”</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 30 }}>
              <svg width="44" height="44" viewBox="150 120 760 760"><path d={MARK} fill="#016737" /></svg>
              <div style={{ display: 'flex', fontFamily: 'Bricolage', fontSize: 30, color: '#0A2015' }}>BAUBC</div>
              <div style={{ display: 'flex', fontSize: 22, color: '#5A6A5F' }}>· Business Club of BAU</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, headers: { 'Cache-Control': 'public, max-age=600, s-maxage=3600' }, fonts: [{ name: 'Bricolage', data: display, weight: 700 }, { name: 'Inter', data: text, weight: 600 }] },
  );
}
