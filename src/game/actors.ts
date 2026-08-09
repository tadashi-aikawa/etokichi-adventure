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
