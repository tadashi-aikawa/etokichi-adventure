import { describe, expect, it } from "vitest";
import { getTechniqueRank } from "../src/game/technique-rank.ts";

describe("技評価ランク", () => {
  it("ダメージを8段階へ変換する", () => {
    expect([380, 280, 220, 160, 110, 70, 40, 0].map((value) => getTechniqueRank("damage", value))).toEqual([
      "S++",
      "S+",
      "S",
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
  });

  it("命中を8段階へ変換する", () => {
    expect([95, 90, 85, 75, 65, 55, 45, 0].map((value) => getTechniqueRank("accuracy", value))).toEqual([
      "S++",
      "S+",
      "S",
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
  });

  it("ガッツダウン0をE、最大帯をS++にする", () => {
    expect(getTechniqueRank("gutsDown", 0)).toBe("E");
    expect(getTechniqueRank("gutsDown", 46)).toBe("S++");
  });
});
