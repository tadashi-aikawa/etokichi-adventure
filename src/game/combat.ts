export type RangeBand = 0 | 1 | 2 | 3;

export const NORMAL_MAX_HIT_RATE = 99;

export const GENKI_EFFECT = {
  duration: 8000,
  gutsRegenMultiplier: 1.35,
  movementMultiplier: 1.15,
  maxGutsRegenMultiplier: 2,
} as const;

export const CHARM_EFFECT = {
  duration: 10000,
  triggerChance: 0.5,
  evasionMultiplier: 0.5,
} as const;

export const ZONE_EFFECT = {
  duration: 10000,
  finalSecondsThreshold: 10,
  opponentLifeThreshold: 0.2,
  opponentLifeTriggerChance: 0.5,
  hitRateMultiplier: 1.5,
  techniqueCostMultiplier: 1.5,
  gutsRegenMultiplier: 1.5,
  gutsRecovery: 50,
  evasionMultiplier: 0.5,
  criticalMultiplier: 1.5,
} as const;

export const RESTRAINT_EFFECT = {
  duration: 8000,
  movementMultiplier: 1 / 3,
  gutsRegenMultiplier: 1 / 3,
} as const;

export const PETRIFICATION_EFFECT = {
  duration: 10000,
  triggerChance: 0.5,
  hitRate: 100,
  movementMultiplier: 0,
  gutsRegenMultiplier: 0,
} as const;

export const PURSUIT_EFFECT = {
  duration: 9000,
  triggerDuration: 1500,
  movementMultiplier: 1.45,
  hitRateBonus: 12,
  gutsRegenMultiplier: 2.5,
} as const;

export const PLEASURE_EFFECT = {
  duration: 8000,
  triggerHits: 3,
  activationGutsRecovery: 30,
  hitGutsRecovery: 15,
} as const;

export function canActivateBattleSpecialDuringKnockout(knockoutPending: boolean, specialType: string): boolean {
  return !knockoutPending || specialType === "grit" || specialType === "awakening";
}

export function applyCharmEvasionPenalty(hitRate: number, charmed: boolean): number {
  if (!charmed) return hitRate;
  const evasionRate = 100 - hitRate;
  return 100 - evasionRate * CHARM_EFFECT.evasionMultiplier;
}

export function shouldGuaranteeZone(
  remainingSeconds: number,
  ownLifeRatio: number,
  opponentLifeRatio: number,
): boolean {
  return remainingSeconds < ZONE_EFFECT.finalSecondsThreshold && ownLifeRatio < opponentLifeRatio;
}

export function reachedZoneLifeThreshold(opponentLifeRatio: number): boolean {
  return opponentLifeRatio < ZONE_EFFECT.opponentLifeThreshold;
}

export function closeToMinimumRange(
  heroX: number,
  enemyX: number,
  attacker: "hero" | "enemy",
  minimumStageX: number,
  maximumStageX: number,
  targetDistance: number,
): { heroX: number; enemyX: number } {
  if (attacker === "hero") {
    return { heroX: Math.max(minimumStageX, enemyX - targetDistance), enemyX };
  }
  return { heroX, enemyX: Math.min(maximumStageX, heroX + targetDistance) };
}

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
  attackerGuts: number,
  defenderGuts: number,
  attackerAccuracy: number,
  defenderEvasion: number,
): number {
  // MF2の「能力差50ごとに4ポイント」を連続値化する。技命中率は基礎50込みの値なので、そのまま使う。
  const gutsBonus = (attackerGuts - defenderGuts) * 0.2;
  const abilityBonus = (attackerAccuracy - defenderEvasion) / 12.5;
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

export function applyRestraintMovementMultiplier(multiplier: number, active: boolean): number {
  return active ? multiplier * RESTRAINT_EFFECT.movementMultiplier : multiplier;
}

export function applyRestraintGutsRegenMultiplier(multiplier: number, active: boolean): number {
  return active ? multiplier * RESTRAINT_EFFECT.gutsRegenMultiplier : multiplier;
}

export function applyPetrificationMovementMultiplier(multiplier: number, active: boolean): number {
  return active ? multiplier * PETRIFICATION_EFFECT.movementMultiplier : multiplier;
}

export function applyPetrificationGutsRegenMultiplier(multiplier: number, active: boolean): number {
  return active ? multiplier * PETRIFICATION_EFFECT.gutsRegenMultiplier : multiplier;
}

export function applyPursuitMovementMultiplier(multiplier: number, active: boolean): number {
  return active ? multiplier * PURSUIT_EFFECT.movementMultiplier : multiplier;
}

export function applyPursuitGutsRegenMultiplier(multiplier: number, active: boolean): number {
  return active ? multiplier * PURSUIT_EFFECT.gutsRegenMultiplier : multiplier;
}

export function shouldTriggerPleasure(consecutiveHitsReceived: number): boolean {
  return consecutiveHitsReceived >= PLEASURE_EFFECT.triggerHits;
}
