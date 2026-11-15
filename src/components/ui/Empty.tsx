import { Mark } from '@/components/brand/Mark';

export function Empty({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="panel grid place-items-center text-center py-14 gap-3">
      <span className="grid size-16 place-items-center rounded-full bg-lime-100 text-brand/50"><Mark size={38} /></span>
      <h3 className="heading text-xl">{title}</h3>
      {children && <div className="text-muted max-w-prose text-sm">{children}</div>}
      {action}
    </div>
  );
}
