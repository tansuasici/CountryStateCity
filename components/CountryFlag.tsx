import type { CSSProperties } from 'react';

interface CountryFlagProps {
  code: string;
  label?: string;
  className?: string;
  decorative?: boolean;
}

export default function CountryFlag({
  code,
  label,
  className = '',
  decorative = true,
}: CountryFlagProps) {
  const normalizedCode = code.trim().toLowerCase();
  const isIso2 = /^[a-z]{2}$/.test(normalizedCode);

  if (!isIso2) {
    return (
      <span className={`country-flag country-flag-fallback ${className}`.trim()} aria-hidden="true">
        {code.slice(0, 2).toUpperCase() || '—'}
      </span>
    );
  }

  return (
    <span
      className={`country-flag ${className}`.trim()}
      style={
        {
          '--country-flag-image': `url("/vendor/flags/${normalizedCode}.svg")`,
        } as CSSProperties
      }
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : label || `${code.toUpperCase()} flag`}
    />
  );
}
