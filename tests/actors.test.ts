import { describe, expect, it } from "vitest";
import { createTechniqueAnimationPlan, getFighterDepth, SUTEKICHI_COMET_WAVES } from "../src/game/animation-plan.ts";
import { createBattleActor, getTechnique, getWalkFrame, opponentOf, shouldMirror } from "../src/game/actors.ts";
import { createCharacterProfiles } from "../src/game/characters.ts";
import type { CharacterId, Side } from "../src/game/types.ts";

const profiles = createCharacterProfiles((source) => source);
const characterIds = Object.keys(profiles) as CharacterId[];
const sides: Side[] = ["hero", "enemy"];

describe("敵味方に依存しないキャラクターモデル", () => {
  it("どのキャラクターも両陣営のアクターとして生成できる", () => {
    for (const characterId of characterIds) {
      for (const side of sides) {
        const actor = createBattleActor(side, profiles[characterId]);
        expect(actor.side).toBe(side);
        expect(actor.profile.id).toBe(characterId);
      }
    }
  });

  it("陣営を変えても技定義とアニメーションIDは変わらない", () => {
    for (const characterId of characterIds) {
      const profile = profiles[characterId];
      const hero = createBattleActor("hero", profile);
      const enemy = createBattleActor("enemy", profile);

      for (const technique of profile.techniques) {
        expect(getTechnique(hero, technique.id)).toBe(technique);
        expect(getTechnique(enemy, technique.id)).toBe(technique);
        expect(createTechniqueAnimationPlan(hero, technique).animation).toBe(
          createTechniqueAnimationPlan(enemy, technique).animation,
        );
      }
    }
  });

  it("陣営によって変わるのは攻撃方向と対象だけである", () => {
    for (const characterId of characterIds) {
      const technique = profiles[characterId].techniques[0];
      expect(technique).toBeDefined();
      if (!technique) continue;

      const heroPlan = createTechniqueAnimationPlan(createBattleActor("hero", profiles[characterId]), technique);
      const enemyPlan = createTechniqueAnimationPlan(createBattleActor("enemy", profiles[characterId]), technique);

      expect(heroPlan.direction).toBe(1);
      expect(heroPlan.targetSide).toBe("enemy");
      expect(enemyPlan.direction).toBe(-1);
      expect(enemyPlan.targetSide).toBe("hero");
    }
  });

  it("素材の基準方向と配置陣営から反転要否を決定する", () => {
    expect(shouldMirror(profiles.etokichi, "hero")).toBe(false);
    expect(shouldMirror(profiles.etokichi, "enemy")).toBe(true);
    expect(shouldMirror(profiles.sutekichi, "hero")).toBe(true);
    expect(shouldMirror(profiles.sutekichi, "enemy")).toBe(false);
  });

  it("全キャラクターが陣営に関係なく3フレームの移動素材を使う", () => {
    for (const profile of Object.values(profiles)) {
      expect(profile.images.walk).toHaveLength(3);
      expect(getWalkFrame(profile, 0)).toBe(profile.images.walk?.[0]);
      expect(getWalkFrame(profile, 3)).toBe(profile.images.walk?.[0]);
    }
  });

  it("ディスカバリー・コメットは時間差で3発着弾する", () => {
    expect(SUTEKICHI_COMET_WAVES).toHaveLength(3);
    expect(SUTEKICHI_COMET_WAVES.map(({ launchDelay }) => launchDelay)).toEqual([1050, 1425, 1800]);
    expect(SUTEKICHI_COMET_WAVES.map(({ impactDelay }) => impactDelay)).toEqual([2150, 2525, 2900]);
  });

  it("相手陣営を対称に解決する", () => {
    expect(opponentOf("hero")).toBe("enemy");
    expect(opponentOf("enemy")).toBe("hero");
  });

  it("攻撃中のキャラクターを陣営にかかわらず手前へ描画する", () => {
    expect(getFighterDepth("hero", ["physical-punch-sequence"])).toBe(2);
    expect(getFighterDepth("enemy", ["meteor-claw-sequence"])).toBe(2);
    expect(getFighterDepth("hero", [])).toBeLessThan(getFighterDepth("enemy", []));
  });
});
