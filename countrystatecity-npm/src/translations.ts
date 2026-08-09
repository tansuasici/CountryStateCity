import type { Country, CountryTranslationAlias, CountryTranslationLocale } from './types';

const DEPRECATED_ALIASES: Record<CountryTranslationAlias, CountryTranslationLocale> = {
  br: 'pt-BR',
  cn: 'zh-CN',
  kr: 'ko',
};

export function getCountryTranslation(
  country: Country,
  locale: CountryTranslationLocale | CountryTranslationAlias
): string | null {
  const canonicalLocale =
    locale in DEPRECATED_ALIASES
      ? DEPRECATED_ALIASES[locale as CountryTranslationAlias]
      : (locale as CountryTranslationLocale);
  return country.translations[canonicalLocale] ?? null;
}

export function canonicalCountryTranslationLocale(
  locale: CountryTranslationLocale | CountryTranslationAlias
): CountryTranslationLocale {
  return locale in DEPRECATED_ALIASES
    ? DEPRECATED_ALIASES[locale as CountryTranslationAlias]
    : (locale as CountryTranslationLocale);
}
