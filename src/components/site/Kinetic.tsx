import { Children, cloneElement, isValidElement, type ReactNode } from 'react';

/**
 * Kinetic headline: every word rises out of its own mask with a slight tilt and a blur that clears,
 * one after another; italic words get a lime underline that sweeps in after the line lands.
 * Pure server component (CSS animations), so it costs no JavaScript.
 */
export function Kinetic({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const n = { i: 0 };
  const walk = (node: ReactNode): ReactNode =>
    Children.map(node, (child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child).split(/(\s+)/).map((w, k) =>
          w.trim() === '' ? w : <span key={k} className="kw"><span style={{ ['--i' as any]: n.i++ + delay }}>{w}</span></span>);
      }
      if (isValidElement<{ children?: ReactNode; className?: string }>(child)) {
        const start = n.i;
        const inner = walk(child.props.children);
        const em = child.type === 'em';
        return cloneElement(child, em ? ({ className: `${child.props.className ?? ''} kw-em`, style: { ['--u' as any]: start + delay } } as any) : {}, inner);
      }
      return child;
    });
  return <span className={`kinetic ${className}`}>{walk(children)}</span>;
}
