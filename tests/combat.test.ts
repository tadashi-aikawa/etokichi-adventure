import { describe, expect, it } from "vitest";
import {
  applyGenkiGutsRegenMultiplier,
  applyGenkiMovementMultiplier,
  calculateBaseHitRate,
  calculateRecoverySuccessChance,
  GENKI_EFFECT,
  getRangeForDistance,
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
});
