import { opponentOf } from "./actors.ts";
import type { BattleActor, Side, TechniqueDefinition } from "./types.ts";

export interface TechniqueAnimationPlan {
  actorSide: Side;
  targetSide: Side;
  direction: 1 | -1;
  characterId: BattleActor["profile"]["id"];
  techniqueId: string;
  animation: TechniqueDefinition["animation"];
}

export const SUTEKICHI_COMET_WAVES = [
  { launchDelay: 1050, impactDelay: 2150 },
  { launchDelay: 1425, impactDelay: 2525 },
  { launchDelay: 1800, impactDelay: 2900 },
] as const;

export function createTechniqueAnimationPlan(
  actor: BattleActor,
  technique: TechniqueDefinition,
): TechniqueAnimationPlan {
  return {
    actorSide: actor.side,
    targetSide: opponentOf(actor.side),
    direction: actor.side === "hero" ? 1 : -1,
    characterId: actor.profile.id,
    techniqueId: technique.id,
    animation: technique.animation,
  };
}
