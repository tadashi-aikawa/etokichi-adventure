import { describe, expect, it } from "vitest";
import { getMapCharacterFrame, MAP_WALK_FRAME_DURATION } from "../src/game/map-character-animation.ts";

describe("マップキャラクター歩行", () => {
  it("停止中は各方向の中央フレームを使う", () => {
    const facings = ["down", "left", "right", "up"] as const;
    expect(facings.map((facing) => getMapCharacterFrame(facing, 10, false))).toEqual([1, 4, 7, 10]);
  });

  it("移動中は左足・中央・右足・中央を繰り返す", () => {
    expect([0, 1, 2, 3, 4].map((step) => getMapCharacterFrame("right", step * MAP_WALK_FRAME_DURATION, true))).toEqual([
      6, 7, 8, 7, 6,
    ]);
  });
});
