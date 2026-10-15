import { useId } from 'react';
import { cn } from '@/lib/utils';

type ITerminLogoProps = {
  /** Icon edge length in pixels. */
  size?: number;
  /** `icon` is the standalone mark; `horizontal` adds the iTermin wordmark. */
  variant?: 'icon' | 'horizontal';
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  /** Accessible name for the standalone icon. Omit to render it as decorative. */
  title?: string;
};

/**
 * Calendar tile whose binder rings line up with the "i" and "T" stems; the i-dot and
 * T-crossbar form the calendar's header row. The monogram is cut out of the tile, so the
 * mark is a single `currentColor` shape that follows the theme via text-* utilities.
 */
export function ITerminMark({ size = 32, className, title }: Pick<ITerminLogoProps, 'size' | 'className' | 'title'>) {
  const maskId = `itermin-mask-${useId().replace(/:/g, '')}`;
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn('shrink-0 text-primary', className)}
      focusable="false"
      {...a11y}
    >
      {title && <title>{title}</title>}
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
        <rect x="3" y="6" width="42" height="39" rx="9" fill="#fff" />
        <rect x="9.5" y="0" width="9" height="12" rx="4.5" fill="#000" />
        <rect x="24.5" y="0" width="9" height="12" rx="4.5" fill="#000" />
        <rect x="11.5" y="2" width="5" height="8" rx="2.5" fill="#fff" />
        <rect x="26.5" y="2" width="5" height="8" rx="2.5" fill="#fff" />
        <rect x="11" y="16" width="6" height="6" rx="1.75" fill="#000" />
        <rect x="11" y="25" width="6" height="13" rx="1.75" fill="#000" />
        <path d="M22.75 16h13.5A1.75 1.75 0 0 1 38 17.75v2.5A1.75 1.75 0 0 1 36.25 22H32v14.25A1.75 1.75 0 0 1 30.25 38h-2.5A1.75 1.75 0 0 1 26 36.25V22h-3.25A1.75 1.75 0 0 1 21 20.25v-2.5A1.75 1.75 0 0 1 22.75 16Z" fill="#000" />
      </mask>
      <rect width="48" height="48" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}

export default function ITerminLogo({ size = 32, variant = 'icon', className, iconClassName, wordmarkClassName, title }: ITerminLogoProps) {
  if (variant === 'icon') return <ITerminMark size={size} className={cn(className, iconClassName)} title={title} />;

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <ITerminMark size={size} className={iconClassName} />
      <span className={cn('font-semibold tracking-tight', wordmarkClassName)}>iTermin</span>
    </span>
  );
}
