export const dynamic = 'force-dynamic';
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-lime-50 py-8 print:py-0 print:bg-white">{children}</div>;
}
