// ISO 3166-1 alpha-2 country codes with full names
export const COUNTRIES = [
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
] as const;

const ISO_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  COUNTRIES.map(c => [c.code, c.name])
);

const COUNTRY_TO_ISO: Record<string, string> = Object.fromEntries(
  COUNTRIES.map(c => [c.name, c.code])
);

export function getCountryName(isoCode: string): string {
  return ISO_TO_COUNTRY[isoCode] || isoCode;
}

export function getCountryISOCode(countryName: string): string | null {
  return COUNTRY_TO_ISO[countryName] || null;
}
