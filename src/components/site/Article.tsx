import { Fragment } from 'react';

/**
 * Article body. Plain text with a few marks editors can type without a toolbar:
 *   ## Heading            > Pull quote            - list item
 *   ==a key line==        (highlighted with a marker sweep as it scrolls into view)
 */
type Block = { t: 'p' | 'h' | 'q' | 'ul'; text: string; items?: string[] };

export function parseBody(body: string): Block[] {
  return body.split(/\n{2,}/).map((raw) => raw.trim()).filter(Boolean).map((b): Block => {
    if (b.startsWith('## ')) return { t: 'h', text: b.slice(3).trim() };
    if (b.startsWith('> ')) return { t: 'q', text: b.replace(/^>\s?/gm, '').trim() };
    const lines = b.split('\n');
    if (lines.every((l) => /^\s*[-•]\s+/.test(l))) return { t: 'ul', text: '', items: lines.map((l) => l.replace(/^\s*[-•]\s+/, '')) };
    return { t: 'p', text: b };
  });
}

export function keyLines(body: string | null | undefined) {
  return Array.from((body ?? '').matchAll(/==(.+?)==/g)).map((m) => m[1]);
}

function Inline({ text, mark }: { text: string; mark: { n: number } }) {
  const parts = text.split(/(==.+?==)/g);
  return <>{parts.map((s, i) => {
    if (s.startsWith('==') && s.endsWith('==')) { const id = `key-${++mark.n}`; return <mark key={i} id={id} className="hl">{s.slice(2, -2)}</mark>; }
    return <Fragment key={i}>{s.split('\n').map((l, j, a) => <Fragment key={j}>{l}{j < a.length - 1 && <br />}</Fragment>)}</Fragment>;
  })}</>;
}

export function ArticleBody({ body, bn = false }: { body: string; bn?: boolean }) {
  const mark = { n: 0 };
  return (
    <div className={`article ${bn ? 'is-bn' : ''}`}>
      {parseBody(body).map((b, i) => {
        if (b.t === 'h') return <h2 key={i} className="article-h reveal" data-r="left">{b.text}</h2>;
        if (b.t === 'q') return <blockquote key={i} className="article-q reveal"><span aria-hidden="true" className="article-q-mark">“</span><p><Inline text={b.text} mark={mark} /></p></blockquote>;
        if (b.t === 'ul') return <ol key={i} className="article-list">{b.items!.map((it, j) => <li key={j} className="reveal" style={{ ['--d' as any]: j % 6 }}><span className="article-num">{bn ? toBnDigits(String(j + 1).padStart(2, '0')) : String(j + 1).padStart(2, '0')}</span><span><Inline text={it} mark={mark} /></span></li>)}</ol>;
        return <p key={i} className="reveal"><Inline text={b.text} mark={mark} /></p>;
      })}
    </div>
  );
}

const BN = '০১২৩৪৫৬৭৮৯';
export const toBnDigits = (s: string) => s.replace(/\d/g, (d) => BN[+d]);

/** Reading time from words (Bangla readers average a little slower). */
export function readingMinutes(body: string | null | undefined, bn = false) {
  const words = (body ?? '').replace(/==|##|>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / (bn ? 160 : 220)));
}
