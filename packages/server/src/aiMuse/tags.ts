import type {
  AiMuseEthnicity,
  AiMuseEyeColor,
  AiMuseHairColor,
  AiMuseHairLength,
  AiMuseSetting,
} from '@pixopen/core';

const MINOR_PATTERNS = [
  /\b(child|children|kid|kids|toddler|infant|baby|babies|preteen|underage|loli|shota|schoolgirl|schoolboy)\b/i,
  /\b(1[0-7]|[1-9])\s*(year|yr|y\/o|yo)\s*old\b/i,
  /\bage\s*(1[0-7]|[1-9])\b/i,
];

const ETHNICITY_PATTERNS: Array<{ value: Exclude<AiMuseEthnicity, 'any'>; patterns: RegExp[] }> = [
  {
    value: 'east-asian',
    patterns: [/\b(east asian|japanese|korean|chinese|taiwanese|vietnamese|thai)\b/i],
  },
  {
    value: 'south-asian',
    patterns: [/\b(south asian|indian|pakistani|bangladeshi|sri lankan)\b/i],
  },
  {
    value: 'black',
    patterns: [/\b(black|african|afro-american|african american|dark skin)\b/i],
  },
  {
    value: 'white',
    patterns: [/\b(white|caucasian|european|scandinavian|irish|german|french|italian|slavic)\b/i],
  },
  {
    value: 'latina',
    patterns: [/\b(latina|latino|hispanic|mexican|brazilian|colombian|argentinian)\b/i],
  },
  {
    value: 'middle-eastern',
    patterns: [/\b(middle eastern|arab|persian|iranian|turkish|lebanese)\b/i],
  },
  {
    value: 'mixed',
    patterns: [/\b(mixed|multiracial|biracial|mixed race)\b/i],
  },
];

const EYE_PATTERNS: Array<{ value: Exclude<AiMuseEyeColor, 'any'>; patterns: RegExp[] }> = [
  { value: 'blue', patterns: [/\bblue eyes?\b/i] },
  { value: 'green', patterns: [/\bgreen eyes?\b/i] },
  { value: 'hazel', patterns: [/\bhazel eyes?\b/i] },
  { value: 'gray', patterns: [/\b(grey|gray) eyes?\b/i] },
  { value: 'amber', patterns: [/\bamber eyes?\b/i] },
  { value: 'brown', patterns: [/\bbrown eyes?\b/i] },
];

const HAIR_COLOR_PATTERNS: Array<{ value: Exclude<AiMuseHairColor, 'any'>; patterns: RegExp[] }> = [
  { value: 'blonde', patterns: [/\b(blonde|blond)( hair)?\b/i] },
  { value: 'auburn', patterns: [/\bauburn( hair)?\b/i] },
  { value: 'red', patterns: [/\b(red|ginger)( hair)?\b/i] },
  { value: 'gray', patterns: [/\b(grey|gray|silver)( hair)?\b/i] },
  { value: 'black', patterns: [/\bblack( hair)?\b/i] },
  { value: 'brown', patterns: [/\b(brown|brunette)( hair)?\b/i] },
];

const HAIR_LENGTH_PATTERNS: Array<{ value: Exclude<AiMuseHairLength, 'any'>; patterns: RegExp[] }> = [
  { value: 'short', patterns: [/\b(short hair|pixie|bob cut|buzz cut)\b/i] },
  { value: 'medium', patterns: [/\b(medium hair|shoulder[- ]length)\b/i] },
  { value: 'long', patterns: [/\b(long hair|waist[- ]length| Rap hair)\b/i] },
];

const SETTING_PATTERNS: Array<{ value: AiMuseSetting; patterns: RegExp[] }> = [
  { value: 'cafe', patterns: [/\b(cafe|café|coffee shop|coffeehouse)\b/i] },
  { value: 'beach', patterns: [/\b(beach|ocean|seaside|shore)\b/i] },
  { value: 'city', patterns: [/\b(city|street|urban|downtown|night city)\b/i] },
  { value: 'studio', patterns: [/\b(studio|portrait studio|photoshoot)\b/i] },
  { value: 'forest', patterns: [/\b(forest|woods|woodland)\b/i] },
  { value: 'rooftop', patterns: [/\b(rooftop|roof top|skyline)\b/i] },
  { value: 'garden', patterns: [/\b(garden|park|flower field)\b/i] },
  { value: 'library', patterns: [/\b(library|bookstore|reading room)\b/i] },
];

export function impliesMinor(text: string): boolean {
  return MINOR_PATTERNS.some((re) => re.test(text));
}

export function extractEthnicity(text: string): Exclude<AiMuseEthnicity, 'any'> | undefined {
  for (const row of ETHNICITY_PATTERNS) {
    if (row.patterns.some((re) => re.test(text))) return row.value;
  }
  return undefined;
}

export function extractEyeColor(text: string): Exclude<AiMuseEyeColor, 'any'> | undefined {
  for (const row of EYE_PATTERNS) {
    if (row.patterns.some((re) => re.test(text))) return row.value;
  }
  return undefined;
}

export function extractHairColor(text: string): Exclude<AiMuseHairColor, 'any'> | undefined {
  for (const row of HAIR_COLOR_PATTERNS) {
    if (row.patterns.some((re) => re.test(text))) return row.value;
  }
  return undefined;
}

export function extractHairLength(text: string): Exclude<AiMuseHairLength, 'any'> | undefined {
  for (const row of HAIR_LENGTH_PATTERNS) {
    if (row.patterns.some((re) => re.test(text))) return row.value;
  }
  return undefined;
}

export function extractSettings(text: string): AiMuseSetting[] {
  const out: AiMuseSetting[] = [];
  for (const row of SETTING_PATTERNS) {
    if (row.patterns.some((re) => re.test(text))) out.push(row.value);
  }
  return out;
}

export function extractAgeBand(text: string): { ageMin?: number; ageMax?: number } {
  const match =
    text.match(/\b(1[8-9]|[2-6]\d)\s*(year|yr|y\/o|yo)\s*old\b/i) ||
    text.match(/\bage\s*(1[8-9]|[2-6]\d)\b/i);
  if (!match) return {};
  const age = Number(match[1]);
  if (!Number.isFinite(age) || age < 18 || age > 65) return {};
  return { ageMin: age, ageMax: age };
}
