import brand from '@/config/brand.json';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  size?: number;
  variant?: 'icon' | 'horizontal';
  tone?: 'default' | 'inverse';
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  title?: string;
};

export default function BrandLogo({
  size = 32, variant = 'icon', tone = 'default', className, iconClassName, wordmarkClassName, title,
}: BrandLogoProps) {
  const icon = (
    <img
      src={`${import.meta.env.BASE_URL}brand-icon.png?v=calendar-smile-png`}
      width={size}
      height={size}
      alt={variant === 'icon' ? title ?? '' : ''}
      className={cn('shrink-0 object-contain', iconClassName, variant === 'icon' && className)}
      style={{ width: size, height: size }}
    />
  );

  if (variant === 'icon') return icon;

  return (
    <span className={cn('inline-flex max-w-full items-center gap-2.5', className)} lang="mk">
      {icon}
      <span className={cn('min-w-0 break-words text-xl font-semibold tracking-tight', tone === 'inverse' && 'text-white', wordmarkClassName)}>
        {brand.name}
      </span>
    </span>
  );
}
