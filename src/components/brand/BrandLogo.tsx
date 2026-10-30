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
      src={`${import.meta.env.BASE_URL}${tone === 'inverse' ? 'brand-mark-white.svg' : 'favicon.svg'}`}
      width={size}
      height={size}
      alt={variant === 'icon' ? title ?? '' : ''}
      className={cn('shrink-0', iconClassName, variant === 'icon' && className)}
    />
  );

  if (variant === 'icon') return icon;

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} lang="mk">
      {icon}
      <span className={cn('whitespace-nowrap text-xl font-semibold tracking-tight', wordmarkClassName)}>
        {brand.name}
      </span>
    </span>
  );
}
