import { describe, expect, it } from "vitest";
import { createCharacterProfiles } from "../src/game/characters.ts";

const profiles = createCharacterProfiles((source) => source);

describe("キャラクター定義", () => {
  it("キャラクターIDと技IDが一意である", () => {
    expect(Object.keys(profiles)).toEqual(["etokichi", "kuroboshi", "sutekichi", "salarymanEtokichi"]);
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

  it("サラリーマンエトキチは中距離を空け、超遠距離の2番目に定時ダッシュを持つ", () => {
    const profile = profiles.salarymanEtokichi;
    expect(profile.techniques.filter(({ range }) => range === 1)).toHaveLength(0);
    expect(profile.techniques.filter(({ range }) => range === 3).map(({ id }) => id)).toEqual([
      "approvalMeteor",
      "closingTimeDash",
    ]);
    expect(profile.images.walk).toHaveLength(3);
    expect(profile.images.businessCardStrikeCast).toBeTruthy();
    expect(profile.images.closingTimeDashCast).toBeTruthy();
    expect(profile.images.angelWinkCast).toBeTruthy();
    expect(profile.images.approvalMeteorCast).toBeTruthy();
    expect(profile.baseFacing).toBe("left");
    expect(profile.imageFacings?.businessCardStrikeCast).toBe("right");
    expect(profile.imageFacings?.closingTimeDashCast).toBe("right");
    expect(profile.visualScale).toBe(1.2);
    expect(profile.abilities).toContain("zone");
    const closingTimeDash = profile.techniques.find(({ id }) => id === "closingTimeDash");
    expect(closingTimeDash?.closesDistance).toBe(true);
    expect(closingTimeDash?.duration).toBe(1250);
    expect(closingTimeDash?.impactDelay).toBe(980);
  });

  it("エンジェルウィンクは80%魅了のかしこさ・ガッツダウン技である", () => {
    const wink = profiles.salarymanEtokichi.techniques.find(({ id }) => id === "angelWink");
    expect(wink?.attackStat).toBe("intelligence");
    expect(wink?.gutsDamage).toBeGreaterThan(0);
    expect(wink?.charmChance).toBe(0.8);
  });
});
