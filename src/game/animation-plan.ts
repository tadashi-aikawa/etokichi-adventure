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

// 飛行時間は従来の1150msから半減し、全体尺を延ばさず6発を見せるため200ms間隔で連射する。
export const SUTEKICHI_COMET_WAVES = [
  { launchDelay: 1050, impactDelay: 1625 },
  { launchDelay: 1250, impactDelay: 1825 },
  { launchDelay: 1450, impactDelay: 2025 },
  { launchDelay: 1650, impactDelay: 2225 },
  { launchDelay: 1850, impactDelay: 2425 },
  { launchDelay: 2050, impactDelay: 2625 },
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
  "tatsuo-slap-sequence",
  "tatsuo-restraint-sequence",
  "tatsuo-roar-sequence",
  "tatsuo-press-sequence",
  "aster-death-energy-sequence",
  "aster-evil-eye-sequence",
  "aster-migration-sequence",
  "aster-tail-sweep-sequence",
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
