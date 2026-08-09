import { describe, expect, it } from "vitest";
import { createCharacterProfiles } from "../src/game/characters.ts";

const profiles = createCharacterProfiles((source) => source);

describe("キャラクター定義", () => {
  it("キャラクターIDと技IDが一意である", () => {
    expect(Object.keys(profiles)).toEqual(["etokichi", "kuroboshi", "sutekichi"]);
    for (const profile of Object.values(profiles)) {
      const techniqueIds = profile.techniques.map((technique) => technique.id);
      expect(new Set(techniqueIds).size).toBe(techniqueIds.length);
    }
  });

  it("全技に専用アイコンとアニメーションを持たせる", () => {
    for (const profile of Object.values(profiles)) {
      for (const technique of profile.techniques) {
        expect(technique.iconSvg.length).toBeGreaterThan(20);
        expect(technique.animation).toBeTruthy();
      }
    }
  });

  it("おひるねは超遠距離枠に共存する全回復技である", () => {
    const longRangeTechniques = profiles.sutekichi.techniques.filter((technique) => technique.range === 3);
    const nap = longRangeTechniques.find((technique) => technique.id === "nap");

    expect(longRangeTechniques).toHaveLength(2);
    expect(nap?.healFull).toBe(true);
    expect(nap?.animation).toBe("sutekichiNap");
  });

  it("ステキチは低耐久・高命中回避・高速ガッツ回復である", () => {
    const { stats } = profiles.sutekichi;
    expect(stats.life).toBeLessThan(profiles.etokichi.stats.life);
    expect(stats.defense).toBeLessThan(profiles.etokichi.stats.defense);
    expect(stats.accuracy).toBeGreaterThan(profiles.etokichi.stats.accuracy);
    expect(stats.evasion).toBeGreaterThan(stats.accuracy);
    expect(stats.gutsRegen).toBeGreaterThanOrEqual(profiles.etokichi.stats.gutsRegen * 2);
  });

  it("ステキチは元気状態の専用ポーズを持つ", () => {
    expect(profiles.sutekichi.images.statusGenki).toBe("assets/enemies/sutekichi/status-genki.webp");
  });
});
