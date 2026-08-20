import { describe, expect, it } from "vitest";
import { createCharacterProfiles } from "../src/game/characters.ts";

const profiles = createCharacterProfiles((source) => source);

describe("キャラクター定義", () => {
  it("キャラクターIDと技IDが一意である", () => {
    expect(Object.keys(profiles)).toEqual([
      "etokichi",
      "kuroboshi",
      "sutekichi",
      "salarymanEtokichi",
      "tatsuo",
      "aster",
    ]);
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
    expect(closingTimeDash?.duration).toBe(550);
    expect(closingTimeDash?.impactDelay).toBe(400);
  });

  it("エンジェルウィンクは50%魅了のかしこさ・ガッツダウン技である", () => {
    const wink = profiles.salarymanEtokichi.techniques.find(({ id }) => id === "angelWink");
    expect(wink?.attackStat).toBe("intelligence");
    expect(wink?.gutsDamage).toBeGreaterThan(0);
    expect(wink?.charmChance).toBe(0.5);
    expect(wink?.cameraReleaseDelay).toBe(420);
    expect(wink?.impactDelay).toBeGreaterThan(wink?.cameraReleaseDelay ?? 0);
  });

  it("タツヲは高耐久の重量級で、本気・追跡・快感を持つ", () => {
    const profile = profiles.tatsuo;
    expect(profile.stats.life).toBe(820);
    expect(profile.stats.power).toBe(600);
    expect(profile.stats.defense).toBe(540);
    expect(profile.stats.accuracy).toBe(390);
    expect(profile.stats.evasion).toBe(250);
    expect(profile.stats.gutsRegen).toBe(2.3);
    expect(profile.abilities).toEqual(["real", "pursuit", "pleasure"]);
    expect(profile.images.walk).toHaveLength(3);
    expect(profile.images.statusPleasure).toBe("assets/characters/tatsuo/status-pleasure.webp");
    expect(profile.images.restraintRush).toBe("assets/characters/tatsuo/restraint-rush.webp");
    expect(profile.images.restraintPin).toBe("assets/characters/tatsuo/restraint-pin.webp");
    expect(profile.imageFacings?.restraintRush).toBe("right");
  });

  it("取り押さえは重い消費と低命中の8秒拘束技である", () => {
    const restraint = profiles.tatsuo.techniques.find(({ id }) => id === "tatsuoRestraint");
    expect(restraint).toMatchObject({
      cost: 42,
      accuracy: 61,
      restraintDuration: 8000,
      range: 1,
      closesDistance: true,
      impactDelay: 940,
    });
  });

  it("咆哮は演出開始後すぐ着弾し、タツヲプレスは高威力である", () => {
    const roar = profiles.tatsuo.techniques.find(({ id }) => id === "tatsuoRoar");
    const press = profiles.tatsuo.techniques.find(({ id }) => id === "tatsuoPress");
    expect(roar?.impactDelay).toBe(1450);
    expect(press?.power).toBe(415);
  });

  it("タツヲビンタは短い発生と硬直の高速技である", () => {
    const slap = profiles.tatsuo.techniques.find(({ id }) => id === "tatsuoSlap");
    expect(slap).toMatchObject({
      duration: 1050,
      impactDelay: 430,
      range: 0,
    });
  });

  it("アステールは低耐久・低ちから・高命中かしこさで、余裕と本気を持つ", () => {
    const profile = profiles.aster;
    expect(profile.stats).toMatchObject({
      life: 410,
      power: 170,
      defense: 270,
      accuracy: 720,
      evasion: 560,
      intelligence: 760,
      gutsRegen: 2.4,
    });
    expect(profile.abilities).toEqual(["ease", "real"]);
    expect(profile.techniques.filter(({ range }) => range === 0)).toHaveLength(0);
    expect(profile.images.walk).toHaveLength(3);
  });

  it("魔眼は通常ダメージとガッツダウンを伴う50%の8秒石化技である", () => {
    const evilEye = profiles.aster.techniques.find(({ id }) => id === "asterEvilEye");
    expect(evilEye).toMatchObject({
      attackStat: "intelligence",
      power: 70,
      gutsDamage: 18,
      accuracy: 85,
      petrifyChance: 0.5,
      petrifyDuration: 8000,
      range: 2,
    });
  });

  it("マイグレーションは低命中でライフとガッツを等倍吸収する", () => {
    const migration = profiles.aster.techniques.find(({ id }) => id === "asterMigration");
    expect(migration).toMatchObject({
      attackStat: "intelligence",
      accuracy: 44,
      lifeDrainRatio: 1,
      gutsDrainRatio: 1,
      range: 1,
    });
  });
});
