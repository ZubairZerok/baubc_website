export function Empty({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="panel grid place-items-center text-center py-12 gap-3">
      <svg width="96" height="40" viewBox="0 0 96 40" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M0 ${8 + i * 6} C 24 ${2 + i * 6}, 48 ${14 + i * 6}, 96 ${6 + i * 6}`} stroke="var(--line-strong)" strokeWidth="1.2" fill="none" />
        ))}
      </svg>
      <h3 className="heading text-lg">{title}</h3>
      {children && <div className="text-muted max-w-prose text-sm">{children}</div>}
      {action}
    </div>
  );
}
