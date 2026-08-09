import { describe, expect, it } from "vitest";
import {
  applyGenkiGutsRegenMultiplier,
  applyGenkiMovementMultiplier,
  applyCharmEvasionPenalty,
  canActivateBattleSpecialDuringKnockout,
  calculateBaseHitRate,
  calculateRecoverySuccessChance,
  CHARM_EFFECT,
  closeToMinimumRange,
  GENKI_EFFECT,
  getRangeForDistance,
  reachedZoneLifeThreshold,
  shouldGuaranteeZone,
  ZONE_EFFECT,
} from "../src/game/combat.ts";

describe("純粋な戦闘計算", () => {
  it.each([
    [19, 0],
    [20, 1],
    [33, 1],
    [34, 2],
    [48, 2],
    [49, 3],
    [80, 3],
    [81, null],
  ] as const)("距離%sを間合い%sへ変換する", (distance, expected) => {
    expect(getRangeForDistance(distance)).toBe(expected);
  });

  it("元気中はガッツ回復と移動を強化し、ガッツ回復倍率は2倍を上限にする", () => {
    expect(GENKI_EFFECT.duration).toBe(8000);
    expect(applyGenkiGutsRegenMultiplier(1, true)).toBeCloseTo(1.35);
    expect(applyGenkiGutsRegenMultiplier(1.4, true)).toBeCloseTo(1.89);
    expect(applyGenkiGutsRegenMultiplier(2, true)).toBe(2);
    expect(applyGenkiGutsRegenMultiplier(1.4, false)).toBe(1.4);
    expect(applyGenkiMovementMultiplier(1, true)).toBeCloseTo(1.15);
    expect(applyGenkiMovementMultiplier(1.35, true)).toBeCloseTo(1.5525);
    expect(applyGenkiMovementMultiplier(1.35, false)).toBe(1.35);
  });

  it("命中と回避の差およびガッツから基礎命中率を算出する", () => {
    expect(calculateBaseHitRate(70, 50, 500, 500)).toBe(70);
    expect(calculateBaseHitRate(70, 100, 680, 500)).toBe(92);
  });

  it("回復技の成功率を25〜90%へ制限する", () => {
    expect(calculateRecoverySuccessChance(65, 0)).toBe(50);
    expect(calculateRecoverySuccessChance(65, 100)).toBe(80);
    expect(calculateRecoverySuccessChance(100, 100)).toBe(90);
    expect(calculateRecoverySuccessChance(0, 0)).toBe(25);
  });

  it("魅了は10秒続き、回避率を半分にする", () => {
    expect(CHARM_EFFECT.duration).toBe(10000);
    expect(CHARM_EFFECT.triggerChance).toBe(0.8);
    expect(applyCharmEvasionPenalty(70, true)).toBe(85);
    expect(applyCharmEvasionPenalty(70, false)).toBe(70);
  });

  it("ゾーンの2つの発動条件と効果倍率を定義する", () => {
    expect(shouldGuaranteeZone(9.9, 0.4, 0.5)).toBe(true);
    expect(shouldGuaranteeZone(10, 0.4, 0.5)).toBe(false);
    expect(shouldGuaranteeZone(9, 0.5, 0.4)).toBe(false);
    expect(reachedZoneLifeThreshold(0.199)).toBe(true);
    expect(reachedZoneLifeThreshold(0.2)).toBe(false);
    expect(ZONE_EFFECT).toMatchObject({
      duration: 10000,
      opponentLifeTriggerChance: 0.5,
      hitRateMultiplier: 1.5,
      techniqueCostMultiplier: 1.5,
      gutsRegenMultiplier: 1.5,
      gutsRecovery: 50,
      evasionMultiplier: 0.5,
      criticalMultiplier: 1.5,
    });
  });

  it("K.O.判定待ちでは根性と覚醒以外の状態変化を発動しない", () => {
    expect(canActivateBattleSpecialDuringKnockout(true, "inspiration")).toBe(false);
    expect(canActivateBattleSpecialDuringKnockout(true, "zone")).toBe(false);
    expect(canActivateBattleSpecialDuringKnockout(true, "grit")).toBe(true);
    expect(canActivateBattleSpecialDuringKnockout(true, "awakening")).toBe(true);
    expect(canActivateBattleSpecialDuringKnockout(false, "inspiration")).toBe(true);
  });

  it("接近技は攻撃側だけを動かして間合い0へ縮める", () => {
    expect(closeToMinimumRange(100, 126, "hero", 10, 250, 14)).toEqual({ heroX: 112, enemyX: 126 });
    expect(closeToMinimumRange(100, 126, "enemy", 10, 250, 14)).toEqual({ heroX: 100, enemyX: 114 });
    expect(closeToMinimumRange(100, 132, "hero", 10, 250, 14)).toEqual({ heroX: 118, enemyX: 132 });
    expect(getRangeForDistance(14, 80)).toBe(0);
  });
});
