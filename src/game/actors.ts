import type { BattleActor, CharacterProfile, Facing, Side, TechniqueDefinition } from "./types.ts";

export function opponentOf(side: Side): Side {
  return side === "hero" ? "enemy" : "hero";
}

export function desiredFacing(side: Side): Facing {
  return side === "hero" ? "right" : "left";
}

export function shouldMirror(profile: CharacterProfile, side: Side): boolean {
  return profile.baseFacing !== desiredFacing(side);
}

export function getPresentationScaleCompensation(profile: CharacterProfile): number {
  const visualScale = profile.visualScale ?? 1;
  if (visualScale <= 1) return 1;
  return 0.9 / visualScale;
}

export function getPresentationYOffsetRatio(profile: CharacterProfile): number {
  const visualScale = profile.visualScale ?? 1;
  return Math.max(0, visualScale - 1) * 0.4;
}

export function getFighterRenderSize(viewportWidth: number, projectionZoom: number, visualScale = 1): number {
  const baseSize = Math.max(165, Math.min(335, viewportWidth * 0.23));
  return baseSize * projectionZoom * visualScale;
}

export function getImageFacing(profile: CharacterProfile, source: string): Facing {
  for (const [key, image] of Object.entries(profile.images)) {
    if (typeof image === "string" && image === source) return profile.imageFacings?.[key] ?? profile.baseFacing;
    if (Array.isArray(image) && image.includes(source)) return profile.imageFacings?.[key] ?? profile.baseFacing;
  }
  return profile.baseFacing;
}

export function createBattleActor(side: Side, profile: CharacterProfile): BattleActor {
  return { side, profile };
}

export function getTechnique(actor: BattleActor, techniqueId: string): TechniqueDefinition | undefined {
  return actor.profile.techniques.find((technique) => technique.id === techniqueId);
}

export function getWalkFrame(profile: CharacterProfile, frameIndex: number): string {
  const frames = profile.images.walk;
  if (!frames?.length) return profile.images.battleIdle;
  return frames[((frameIndex % frames.length) + frames.length) % frames.length] ?? profile.images.battleIdle;
}
