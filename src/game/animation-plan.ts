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

const FOREGROUND_ACTION_CLASSES = new Set([
  "attack-light",
  "casting",
  "ultimate-sequence",
  "galaxy-ray-sequence",
  "throw-kiss-sequence",
  "physical-punch-sequence",
  "star-ring-sequence",
  "pentagram-nova-sequence",
  "etoile-drive-sequence",
  "dark-orbit-sequence",
  "black-meteor-sequence",
  "meteor-claw-sequence",
  "crescent-horn-sequence",
  "sutekichi-star-touch-sequence",
  "sutekichi-halo-skip-sequence",
  "sutekichi-stella-search-sequence",
  "sutekichi-comet-sequence",
  "sutekichi-nap-sequence",
  "business-card-strike-sequence",
  "closing-time-dash-sequence",
  "angel-wink-sequence",
  "approval-meteor-sequence",
  "special-action",
  "result-winner",
  "result-winner-climax",
]);

export function getFighterDepth(side: Side, classes: Iterable<string>): number {
  for (const className of classes) {
    if (FOREGROUND_ACTION_CLASSES.has(className)) return 2;
  }
  return side === "enemy" ? 1 : 0;
}

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
