/** Character avatars: for members who prefer not to show their face. Pure SVG, usable on server and client. */
export type AvatarSpec = { skin?: number; hair?: string; top?: number; glasses?: boolean };
export const SKINS = ['#F6D3B3', '#E2B08A', '#C68A5E', '#8E5A3A'];
export const TOPS = ['#016737', '#C9F53B', '#0A2015', '#F5B63A', '#1D5FD1', '#C2371F'];
export const HAIRS = ['short', 'long', 'bun', 'curly', 'hijab', 'cap'] as const;
const BGS = ['#EEFFB3', '#C5F4D4', '#E0FF73', '#DDF6E3'];

function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; }

export function specFor(name: string, a?: AvatarSpec | null): Required<AvatarSpec> {
  const h = hash(name || 'baubc');
  const hair = a?.hair && (HAIRS as readonly string[]).includes(a.hair) ? a.hair : HAIRS[h % HAIRS.length];
  return { skin: a?.skin ?? (h >> 3) % SKINS.length, hair, top: a?.top ?? (h >> 5) % TOPS.length, glasses: a?.glasses ?? ((h >> 9) % 4 === 0) };
}

export function Avatar({ name, photoUrl, avatar, size = 56, className = '' }: { name: string; photoUrl?: string | null; avatar?: AvatarSpec | null; size?: number; className?: string }) {
  if (photoUrl) return <img src={photoUrl} alt="" width={size} height={size} loading="lazy" className={`shrink-0 rounded-[28%] object-cover ring-2 ring-white ${className}`} style={{ width: size, height: size }} />;
  const s = specFor(name, avatar);
  const skin = SKINS[s.skin % SKINS.length], top = TOPS[s.top % TOPS.length], hair = '#1E1A17', bg = BGS[hash(name) % BGS.length];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`shrink-0 rounded-[28%] ring-2 ring-white ${className}`} aria-hidden="true">
      <rect width="64" height="64" fill={bg} />
      <path d="M53 6l5 5-5 5-5-5z" fill="#016737" opacity=".18" />
      {s.hair === 'long' && <path d="M19 24c-4 9-4 19-2 27h30c2-8 2-18-2-27z" fill={hair} />}
      <path d="M9 64c0-13 9-18 23-18s23 5 23 18z" fill={top} />
      {s.hair === 'hijab'
        ? <><path d="M32 8c-11 0-17 8-17 19 0 8 2 14 0 23 5-3 11-4 17-4s12 1 17 4c-2-9 0-15 0-23 0-11-6-19-17-19z" fill={top === '#C9F53B' ? '#016737' : top} /><ellipse cx="32" cy="29" rx="9.4" ry="11.2" fill={skin} /></>
        : <><rect x="27.5" y="37" width="9" height="10" rx="3" fill={skin} /><ellipse cx="32" cy="28" rx="11.5" ry="13" fill={skin} /></>}
      {(s.hair === 'short' || s.hair === 'long' || s.hair === 'bun' || s.hair === 'cap') && <path d="M20 27c-1.500-10.500 4.500-16.500 12-16.500S45.500 16.500 44 27c-2-5.500-5-8.500-12-8.500S22 21.500 20 27z" fill={hair} />}
      {s.hair === 'bun' && <circle cx="32" cy="8.500" r="5" fill={hair} />}
      {s.hair === 'curly' && [[21, 20], [26, 14], [32, 12], [38, 14], [43, 20], [19, 27], [45, 27]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5.200" fill={hair} />)}
      {s.hair === 'cap' && <><path d="M19 21c1-8 6-12 13-12s12 4 13 12z" fill={top === '#0A2015' ? '#016737' : '#0A2015'} /><path d="M17 20.500h32l4 3.500H19z" fill={top === '#0A2015' ? '#016737' : '#0A2015'} /></>}
      <circle cx="27.500" cy="28.500" r="1.350" fill="#0A2015" /><circle cx="36.500" cy="28.500" r="1.350" fill="#0A2015" />
      <path d="M27.500 34c2.500 2.300 6.500 2.300 9 0" stroke="#0A2015" strokeWidth="1.400" fill="none" strokeLinecap="round" />
      {s.glasses && <g stroke="#0A2015" strokeWidth="1.200" fill="none"><circle cx="27.500" cy="28.500" r="3.800" /><circle cx="36.500" cy="28.500" r="3.800" /><path d="M31.300 28.500h1.400" /></g>}
    </svg>
  );
}
