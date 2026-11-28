import { SKIN_TYPES } from './SkinTypes';

/**
 * Body sites with different skin (roadmap; Lance 2026-11-28: sliders with presets, and the pad
 * should look like that part of the body). Each site sets three sliders relative to standard
 * dermis, and a skin look. Approximate practice values, not measured tissue properties.
 *  - thickness: dermis thickness (× standard)
 *  - toughness: how far a forced needle can go before tearing (× standard tear limits)
 *  - tension: how far the wound edges pull apart (× the standard gap)
 */
export interface SkinLook {
  /** Base skin colour (0–255 RGB). */
  tone: readonly [number, number, number];
  pores: number;
  creases: number;
  /** Short dark hair stubs (scalp). */
  hair: number;
  freckles: number;
}

export interface BodySite {
  id: string;
  label: string;
  thickness: number;
  toughness: number;
  tension: number;
  look: SkinLook;
}

export const SITE_SLIDER = { min: 0.5, max: 2, step: 0.05 } as const;

export const BODY_SITES: readonly BodySite[] = [
  { id: 'forearm', label: 'Forearm', thickness: 1, toughness: 1, tension: 1, look: { tone: [202, 150, 133], pores: 1500, creases: 16, hair: 0, freckles: 0 } },
  { id: 'face', label: 'Face', thickness: 0.7, toughness: 0.8, tension: 0.7, look: { tone: [214, 158, 142], pores: 2600, creases: 6, hair: 0, freckles: 90 } },
  { id: 'scalp', label: 'Scalp', thickness: 1.5, toughness: 1.3, tension: 1.1, look: { tone: [208, 166, 146], pores: 900, creases: 2, hair: 2600, freckles: 0 } },
  { id: 'hand', label: 'Back of hand', thickness: 0.8, toughness: 0.9, tension: 0.9, look: { tone: [196, 146, 128], pores: 900, creases: 46, hair: 0, freckles: 30 } },
  // Fragile skin (roadmap, 2026-11-28): thin, papery skin (elderly forearm, long steroid use); tears and cuts through easily.
  { id: 'fragile', label: 'Fragile skin (elderly forearm)', thickness: 0.55, toughness: 0.5, tension: 0.8, look: { tone: [222, 178, 164], pores: 700, creases: 60, hair: 0, freckles: 140 } },
  { id: 'back', label: 'Back', thickness: 1.8, toughness: 1.3, tension: 1.4, look: { tone: [210, 164, 144], pores: 2400, creases: 4, hair: 0, freckles: 20 } },
];

const STANDARD = SKIN_TYPES[1];
/** Top of the dermis (scene units, as src/tissue/anatomy.ts). */
const DERMIS_TOP = 0.38;
/** Deepest the dermis may go (keeps some fat below). */
const DERMIS_FLOOR = 0.08;
/** Standard wound gap (scene units, as PracticeSession). */
export const STANDARD_GAP = 0.1;

const clampSlider = (value: number) => Math.min(SITE_SLIDER.max, Math.max(SITE_SLIDER.min, Number.isFinite(value) ? value : 1));

/** The skin for a body site, with optional slider overrides (each × standard). */
export function siteSkin(site: BodySite, overrides: Partial<Pick<BodySite, 'thickness' | 'toughness' | 'tension'>> = {}) {
  const thickness = clampSlider(overrides.thickness ?? site.thickness);
  const toughness = clampSlider(overrides.toughness ?? site.toughness);
  const tension = clampSlider(overrides.tension ?? site.tension);
  const standardDepth = DERMIS_TOP - STANDARD.dermalBottom;
  return {
    id: `site-${site.id}`,
    label: `${site.label} skin`,
    dermalBottom: Math.max(DERMIS_FLOOR, DERMIS_TOP - standardDepth * thickness),
    tear: { degrees: STANDARD.tear.degrees * toughness, units: STANDARD.tear.units * toughness, seconds: STANDARD.tear.seconds * toughness },
    gap: STANDARD_GAP * tension,
    look: site.look,
    site: { id: site.id, thickness, toughness, tension },
  };
}

/** From URL parameters: `site` (preset id) and optional `thick`, `tough`, `tension` (× standard). */
export function resolveSiteSkin(params: { get(name: string): string | null }) {
  const site = BODY_SITES.find((s) => s.id === params.get('site'));
  if (!site) return null;
  const number = (name: string) => (params.get(name) === null ? undefined : Number(params.get(name)));
  return siteSkin(site, { thickness: number('thick'), toughness: number('tough'), tension: number('tension') });
}
