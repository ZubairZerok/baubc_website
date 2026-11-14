import type { Metadata } from 'next';
import { PageHero } from '@/components/site/bits';
import { getWings } from '@/server/queries/public';
import { getLang } from '@/lib/lang';
import { pick } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Wings', description: 'The wings and teams that run BAUBC.' };

export default async function WingsPage() {
  const [lang, wings] = await Promise.all([getLang(), getWings()]);
  return (
    <>
      <PageHero label="Wings" title={<>Six wings, <span className="serif-i">one club</span></>} bn="উইং ও টিম">Every member belongs to a wing. Wing leads assign tasks, review work and recommend recognition.</PageHero>
      <div className="wrap py-12 grid md:grid-cols-2 gap-5">
        {wings.map((w: any, i: number) => (
          <section id={w.slug} key={w.slug} className="panel grid gap-4 scroll-mt-24 reveal">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1"><span className="label text-muted">Wing {String(i + 1).padStart(2, '0')}</span><h2 className="heading text-2xl">{pick(lang, w.name, w.name_bn)}</h2>
              {w.name_bn && lang === 'en' && <p className="text-green" lang="bn">{w.name_bn}</p>}</div>
            </div>
            {w.summary && <p className="text-ink-2">{w.summary}</p>}
            {w.responsibilities?.length > 0 && <ul className="grid gap-1.5 text-sm">{w.responsibilities.map((r: string) => <li key={r} className="flex gap-2"><span className="text-green">—</span>{r}</li>)}</ul>}
          </section>
        ))}
      </div>
    </>
  );
}
