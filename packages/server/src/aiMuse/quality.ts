/** Always-on filters: photoreal adult women only. Reject anime, men, scenery, junk. */

const REJECT_PATTERNS: RegExp[] = [
  // Anime / cartoon / drawn styles
  /\b(anime|manga|chibi|cartoon|comic|toon|cel[- ]?shaded|2d art|2d style)\b/i,
  /\b(waifu|hentai|ecchi|kawaii|moe|bishoujo|shoujo|seinen|doujin)\b/i,
  /\b(anime[- ]?style|manga[- ]?style|cartoon[- ]?style|drawn|lineart|line art|flat color|cel shading)\b/i,
  /\b(pixiv|danbooru|gelbooru|sankaku)\b/i,
  /\b([0-9]+girls?|1girl|2girls|multiple girls|1boy)\b/i,
  /\b(digital painting|oil painting|watercolor|illustration|concept art|fanart|sketch)\b/i,
  // Non-human / fantasy creature junk
  /\b(monster|creature|alien|demon|devil|zombie|undead|skeleton|ghost)\b/i,
  /\b(dragon|kaiju|beast|werewolf|vampire|elf|fairy|mermaid|centaur|orc|goblin)\b/i,
  /\b(furry|anthro|anthropomorphic|animal ears|catgirl|foxgirl|kemonomimi)\b/i,
  /\b(robot|mecha|cyborg|gundam|transformer)\b/i,
  /\b(non[- ]?human|inhuman|mutant|grotesque|horror|gore|eldritch)\b/i,
  /\b(pokemon|digimon|yokai|tentacle|slime|insectoid)\b/i,
  /\b(doll|mannequin|statue|sculpture|puppet)\b/i,
  /\b(pizza|meme|abstract|surreal|psychedelic)\b/i,
  // Scenery / non-portrait subjects
  /\b(landscape|cityscape|seascape|mountain range|mountainscape|skyline only)\b/i,
  /\b(no humans|no people|empty room|still life|product shot|food photography)\b/i,
  /\b(architecture exterior|aerial view|drone shot|satellite)\b/i,
  /\b(car only|vehicle only|motorcycle only|weapon only)\b/i,
];

/** Male-presenting subjects — reject unless a clear woman cue also appears (handled separately). */
const MALE_PATTERNS: RegExp[] = [
  /\b(man|men|male|boy|guys?|gentleman|gentleman's)\b/i,
  /\b(handsome man|hot guy|muscular man|bearded man|male model)\b/i,
  /\b(portrait of a (man|male|boy|guy))\b/i,
  /\b(bodybuilder|himbo)\b/i,
];

const WOMAN_PATTERNS: RegExp[] = [
  /\b(woman|women|female|lady|ladies)\b/i,
  /\b(beautiful girl|gorgeous girl|stunning girl|pretty girl)\b/i,
  /\b(portrait of a (woman|girl|lady|female))\b/i,
  /\b(young woman|adult woman|beautiful woman|gorgeous woman)\b/i,
  /\b(she is|her face|her hair|her eyes)\b/i,
];

const REALISM_PATTERNS: RegExp[] = [
  /\b(photorealistic|photo[- ]?realistic|hyperrealistic|realistic)\b/i,
  /\b(raw photo|photograph|photography|photo shoot|photoshoot|dslr|35mm|film grain|analog)\b/i,
  /\b(portrait|headshot|candid|natural lighting|studio lighting|cinematic)\b/i,
  /\b(real[- ]?life|lifelike|skin texture|pore|8k|ultra detailed)\b/i,
];

/** Base-model families that are overwhelmingly anime/illustration. */
const ANIME_BASE_MODELS = [
  'pony',
  'illustrious',
  'anima',
  'anime',
  'noobai',
  'novelai',
  'aurorales',
  'nai',
  'anything',
  'counterfeit',
  'abyssorangemix',
  'aom',
  'hassaku',
  'meina',
  'pastel mix',
  'cetus',
  'holofan',
];

export function isAnimeBaseModel(baseModel: unknown): boolean {
  if (typeof baseModel !== 'string' || !baseModel.trim()) return false;
  const lower = baseModel.toLowerCase();
  return ANIME_BASE_MODELS.some((token) => lower.includes(token));
}

export function hasRealismCue(text: string): boolean {
  return REALISM_PATTERNS.some((re) => re.test(text));
}

export function hasWomanCue(text: string): boolean {
  return WOMAN_PATTERNS.some((re) => re.test(text));
}

export function hasMaleCue(text: string): boolean {
  return MALE_PATTERNS.some((re) => re.test(text));
}

export function hasRejectCue(text: string): boolean {
  return REJECT_PATTERNS.some((re) => re.test(text));
}

/**
 * Photoreal adult woman only.
 * Requires a real prompt with woman + realism cues. Never accepts empty metadata.
 */
export function isPhotorealHumanWomanPrompt(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 20) return false;
  if (hasRejectCue(trimmed)) return false;
  if (!hasWomanCue(trimmed)) return false;
  // Men / male-primary prompts out — even if "woman" appears as a weak token elsewhere.
  if (hasMaleCue(trimmed) && !/\b(woman|women|female|lady|ladies)\b/i.test(trimmed)) return false;
  if (/\b(portrait of a (man|male|boy|guy)|handsome man|male model)\b/i.test(trimmed)) return false;
  if (!hasRealismCue(trimmed)) return false;
  return true;
}
