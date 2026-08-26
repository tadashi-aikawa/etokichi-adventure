import { describe, expect, it } from "vitest";
import type { MapPosition } from "../src/game/game-session.ts";
import { createNpcCollisions, findFacingNpc, getFacingToward } from "../src/game/map-interaction.ts";
import type { MapMarker } from "../src/game/tiled-map.ts";

const player: MapPosition = { mapId: "test", x: 100, y: 100, facing: "up" };
const markers: MapMarker[] = [
  createMarker(1, "front", 104, 30),
  createMarker(2, "behind", 100, 150),
  createMarker(3, "side", 180, 70),
];

describe("マップ上の相互作用", () => {
  it("プレイヤー正面の範囲内にいるevent actorだけを対象にする", () => {
    expect(findFacingNpc(player, markers)?.name).toBe("front");
    expect(findFacingNpc({ ...player, facing: "down" }, markers)?.name).toBe("behind");
    expect(findFacingNpc({ ...player, x: 300 }, markers)).toBeNull();
    const front = markers[0];
    if (!front) throw new Error("正面NPCのfixtureがありません");
    expect(findFacingNpc(player, [{ ...front, properties: {} }])).toBeNull();
  });

  it("NPCの中心座標からキャラクター同士の衝突矩形を作る", () => {
    expect(createNpcCollisions(markers, { width: 46, height: 40, offsetY: 20 })).toEqual([
      { x: 81, y: 30, width: 46, height: 40 },
      { x: 77, y: 150, width: 46, height: 40 },
      { x: 157, y: 70, width: 46, height: 40 },
    ]);
  });

  it("NPCから見てプレイヤーがいる方向を優勢な軸で求める", () => {
    const npc = { ...player, x: 100, y: 100 };
    expect(getFacingToward(npc, { ...player, x: 160, y: 110 })).toBe("right");
    expect(getFacingToward(npc, { ...player, x: 40, y: 90 })).toBe("left");
    expect(getFacingToward(npc, { ...player, x: 110, y: 40 })).toBe("up");
    expect(getFacingToward(npc, { ...player, x: 90, y: 160 })).toBe("down");
  });
});

function createMarker(id: number, name: string, x: number, y: number): MapMarker {
  return {
    id,
    name,
    kind: "npc",
    x,
    y,
    width: 0,
    height: 0,
    properties: { eventId: `event:${name}` },
  };
}
