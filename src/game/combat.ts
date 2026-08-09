export type RangeBand = 0 | 1 | 2 | 3;

export const GENKI_EFFECT = {
  duration: 8000,
  gutsRegenMultiplier: 1.35,
  movementMultiplier: 1.15,
  maxGutsRegenMultiplier: 2,
} as const;

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getRangeForDistance(distance: number, maximumTechniqueDistance = 80): RangeBand | null {
  if (distance <= 19) return 0;
  if (distance <= 33) return 1;
  if (distance <= 48) return 2;
  if (distance <= maximumTechniqueDistance) return 3;
  return null;
}

export function calculateBaseHitRate(
  techniqueAccuracy: number,
  guts: number,
  attackerAccuracy: number,
  defenderEvasion: number,
): number {
  const gutsBonus = (guts - 50) * 0.24;
  const abilityBonus = (attackerAccuracy - defenderEvasion) / 18;
  return techniqueAccuracy + gutsBonus + abilityBonus;
}

export function calculateRecoverySuccessChance(baseChance: number, guts: number): number {
  return clamp(Math.round(baseChance + (guts - 50) * 0.3), 25, 90);
}

export function applyGenkiGutsRegenMultiplier(multiplier: number, active: boolean): number {
  if (!active) return multiplier;
  return Math.min(GENKI_EFFECT.maxGutsRegenMultiplier, multiplier * GENKI_EFFECT.gutsRegenMultiplier);
}

export function applyGenkiMovementMultiplier(multiplier: number, active: boolean): number {
  return active ? multiplier * GENKI_EFFECT.movementMultiplier : multiplier;
}
