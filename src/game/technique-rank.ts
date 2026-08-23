export type TechniqueRank = "S++" | "S+" | "S" | "A" | "B" | "C" | "D" | "E";
export type TechniqueRankMetric = "damage" | "accuracy" | "gutsDown";

const RANK_THRESHOLDS: Readonly<Record<TechniqueRankMetric, readonly [number, TechniqueRank][]>> = {
  damage: [
    [380, "S++"],
    [280, "S+"],
    [220, "S"],
    [160, "A"],
    [110, "B"],
    [70, "C"],
    [40, "D"],
    [0, "E"],
  ],
  accuracy: [
    [95, "S++"],
    [90, "S+"],
    [85, "S"],
    [75, "A"],
    [65, "B"],
    [55, "C"],
    [45, "D"],
    [0, "E"],
  ],
  gutsDown: [
    [40, "S++"],
    [30, "S+"],
    [24, "S"],
    [18, "A"],
    [12, "B"],
    [8, "C"],
    [1, "D"],
    [0, "E"],
  ],
};

export function getTechniqueRank(metric: TechniqueRankMetric, value: number): TechniqueRank {
  return RANK_THRESHOLDS[metric].find(([minimum]) => value >= minimum)?.[1] ?? "E";
}
