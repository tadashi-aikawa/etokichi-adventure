import { describe, expect, it } from "vitest";
import { createCharacterProfiles } from "../src/game/characters.ts";
import { calculateBaseHitRate, clamp, NORMAL_MAX_HIT_RATE } from "../src/game/combat.ts";

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

  it("全技に固有の短い説明文を持たせ、各距離を4スロット以内に収める", () => {
    const descriptions = Object.values(profiles).flatMap((profile) =>
      profile.techniques.map((technique) => technique.description),
    );

    expect(descriptions.every((description) => description.length >= 18 && description.length <= 40)).toBe(true);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const profile of Object.values(profiles)) {
      for (const range of [0, 1, 2, 3]) {
        expect(profile.techniques.filter((technique) => technique.range === range).length).toBeLessThanOrEqual(4);
      }
    }
  });

  it("全キャラクターに固有の説明文を持たせる", () => {
    const descriptions = Object.values(profiles).map(({ description }) => description);
    expect(descriptions.every((description) => description.length >= 40)).toBe(true);
    expect(new Set(descriptions).size).toBe(Object.keys(profiles).length);
  });

  it("全攻撃技の命中値を新しい戦闘計算向けに調整している", () => {
    const attackAccuracies = Object.fromEntries(
      Object.values(profiles).flatMap((profile) =>
        profile.techniques.filter(({ kind }) => kind !== "support").map(({ id, accuracy }) => [id, accuracy]),
      ),
    );

    expect(attackAccuracies).toEqual({
      punch: 91,
      pentagramNova: 55,
      starRing: 81,
      galaxyRay: 71,
      galaxyFlash: 62,
      throwKiss: 93,
      meteorClaw: 89,
      crescentHorn: 79,
      darkOrbit: 70,
      blackMeteor: 60,
      starTouch: 90,
      haloSkip: 80,
      stellaSearch: 74,
      discoveryComet: 56,
      businessCardStrike: 91,
      angelWink: 86,
      approvalMeteor: 58,
      closingTimeDash: 79,
      tatsuoSlap: 92,
      tatsuoRestraint: 63,
      tatsuoRoar: 88,
      tatsuoPress: 59,
      asterTailSweep: 70,
      asterMigration: 35,
      asterEvilEye: 60,
      asterDeathEnergy: 65,
    });
  });

  it("高回避型と低回避型の被命中率に明確な差を保つ", () => {
    const hitRatesAgainst = (defender: (typeof profiles)[keyof typeof profiles]) =>
      Object.values(profiles).flatMap((attacker) =>
        attacker.techniques
          .filter(({ kind }) => kind !== "support")
          .map((technique) =>
            clamp(
              Math.round(
                calculateBaseHitRate(technique.accuracy, 50, 50, attacker.stats.accuracy, defender.stats.evasion),
              ),
              18,
              NORMAL_MAX_HIT_RATE,
            ),
          ),
      );
    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const sutekichiRates = hitRatesAgainst(profiles.sutekichi);
    const tatsuoRates = hitRatesAgainst(profiles.tatsuo);

    expect(average(sutekichiRates)).toBeGreaterThanOrEqual(50);
    expect(average(sutekichiRates)).toBeLessThanOrEqual(56);
    expect(Math.max(...sutekichiRates)).toBeLessThanOrEqual(80);
    expect(average(tatsuoRates) - average(sutekichiRates)).toBeGreaterThanOrEqual(35);
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
      accuracy: 63,
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
      accuracy: 820,
      evasion: 560,
      intelligence: 860,
      gutsRegen: 2.4,
    });
    expect(profile.abilities).toEqual(["ease", "real"]);
    expect(profile.techniques.filter(({ range }) => range === 0)).toHaveLength(0);
    expect(profile.images.walk).toHaveLength(3);
  });

  it("魔眼は通常ダメージとガッツダウンを伴う50%の10秒石化技である", () => {
    const evilEye = profiles.aster.techniques.find(({ id }) => id === "asterEvilEye");
    expect(evilEye).toMatchObject({
      attackStat: "intelligence",
      power: 70,
      gutsDamage: 18,
      accuracy: 60,
      petrifyChance: 0.5,
      petrifyDuration: 10000,
      range: 2,
    });
  });

  it("マイグレーションは低命中でライフとガッツを等倍吸収する", () => {
    const migration = profiles.aster.techniques.find(({ id }) => id === "asterMigration");
    expect(migration).toMatchObject({
      attackStat: "intelligence",
      accuracy: 35,
      lifeDrainRatio: 1,
      gutsDrainRatio: 1,
      range: 1,
    });
  });

  it("デスエナジーは消費29の高威力な知力技である", () => {
    const deathEnergy = profiles.aster.techniques.find(({ id }) => id === "asterDeathEnergy");
    expect(deathEnergy).toMatchObject({
      cost: 29,
      power: 155,
      accuracy: 65,
      attackStat: "intelligence",
      range: 3,
    });
  });
});
