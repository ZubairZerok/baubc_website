import { statusInfo } from '@/lib/format';

export function Status({ value, label }: { value: string | null | undefined; label?: string }) {
  const s = statusInfo(value);
  return <span className={`chip chip-${s.tone}`}>{label ?? s.label}</span>;
}
