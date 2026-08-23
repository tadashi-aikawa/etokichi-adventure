import { describe, expect, it } from "vitest";
import { createTechniqueAnimationPlan, getFighterDepth, SUTEKICHI_COMET_WAVES } from "../src/game/animation-plan.ts";
import {
  createBattleActor,
  getFighterRenderSize,
  getImageFacing,
  getPresentationScaleCompensation,
  getPresentationYOffsetRatio,
  getTechnique,
  getWalkFrame,
  opponentOf,
  shouldMirror,
} from "../src/game/actors.ts";
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
    expect(shouldMirror(profiles.salarymanEtokichi, "hero")).toBe(true);
    expect(shouldMirror(profiles.salarymanEtokichi, "enemy")).toBe(false);
  });

  it("サラリーマンエトキチの方向付き技画像は歩行画像とは逆の右向きである", () => {
    const profile = profiles.salarymanEtokichi;
    const businessCardStrike = profile.images.businessCardStrikeCast;
    const closingTimeDash = profile.images.closingTimeDashCast;
    expect(typeof businessCardStrike).toBe("string");
    expect(typeof closingTimeDash).toBe("string");
    expect(getImageFacing(profile, profile.images.walk?.[0] ?? "")).toBe("left");
    expect(getImageFacing(profile, typeof businessCardStrike === "string" ? businessCardStrike : "")).toBe("right");
    expect(getImageFacing(profile, typeof closingTimeDash === "string" ? closingTimeDash : "")).toBe("right");
  });

  it("拡大キャラクターは接写演出で余白を確保する", () => {
    expect(getPresentationScaleCompensation(profiles.salarymanEtokichi)).toBeCloseTo(0.9 / 1.2);
    expect(getPresentationYOffsetRatio(profiles.salarymanEtokichi)).toBeCloseTo(0.08);
    expect(getPresentationScaleCompensation(profiles.etokichi)).toBe(1);
    expect(getPresentationYOffsetRatio(profiles.etokichi)).toBe(0);
  });

  it("全キャラクターが陣営に関係なく3フレームの移動素材を使う", () => {
    for (const profile of Object.values(profiles)) {
      expect(profile.images.walk).toHaveLength(3);
      expect(getWalkFrame(profile, 0)).toBe(profile.images.walk?.[0]);
      expect(getWalkFrame(profile, 3)).toBe(profile.images.walk?.[0]);
    }
  });

  it("ディスカバリー・コメットは従来の2倍速で6発着弾する", () => {
    expect(SUTEKICHI_COMET_WAVES).toHaveLength(6);
    expect(SUTEKICHI_COMET_WAVES.map(({ launchDelay }) => launchDelay)).toEqual([1050, 1250, 1450, 1650, 1850, 2050]);
    expect(SUTEKICHI_COMET_WAVES.map(({ impactDelay }) => impactDelay)).toEqual([1625, 1825, 2025, 2225, 2425, 2625]);
    expect(SUTEKICHI_COMET_WAVES.map(({ launchDelay, impactDelay }) => impactDelay - launchDelay)).toEqual(
      Array(6).fill(575),
    );
  });

  it("相手陣営を対称に解決する", () => {
    expect(opponentOf("hero")).toBe("enemy");
    expect(opponentOf("enemy")).toBe("hero");
  });

  it("描画サイズは陣営に依存せず、キャラクター倍率と近距離ズームだけを反映する", () => {
    expect(getFighterRenderSize(1000, 1, 1.2)).toBe(276);
    expect(getFighterRenderSize(1000, 1.25, 1.2)).toBe(345);
    expect(getFighterRenderSize(500, 1, 1)).toBe(165);
    expect(getFighterRenderSize(2000, 1, 1)).toBe(335);
  });

  it("攻撃中のキャラクターを陣営にかかわらず手前へ描画する", () => {
    expect(getFighterDepth("hero", ["physical-punch-sequence"])).toBe(2);
    expect(getFighterDepth("enemy", ["meteor-claw-sequence"])).toBe(2);
    expect(getFighterDepth("hero", [])).toBeLessThan(getFighterDepth("enemy", []));
  });
});
