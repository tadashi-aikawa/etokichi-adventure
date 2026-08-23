import { describe, expect, it } from "vitest";
import { calculateMapCamera, getMapBodyDepth, moveMapBody, parseTiledMap } from "../src/game/tiled-map.ts";

const tileset = {
  columns: 2,
  image: "tiles.svg",
  imageheight: 64,
  imagewidth: 128,
  name: "test-tiles",
  tiles: [{ id: 1, properties: [{ name: "depthY", type: "int", value: 36 }] }],
  tilecount: 2,
  tileheight: 64,
  tilewidth: 64,
};

const map = {
  backgroundcolor: "#123456",
  height: 2,
  infinite: false,
  layers: [
    { data: [1, 2, 2, 1], height: 2, name: "ground", opacity: 1, type: "tilelayer", visible: true, width: 2 },
    { data: [0, 0, 0, 2], height: 2, name: "foreground", opacity: 1, type: "tilelayer", visible: true, width: 2 },
    { name: "collision", objects: [{ height: 20, id: 1, name: "wall", width: 40, x: 50, y: 30 }], type: "objectgroup" },
    {
      name: "actors",
      objects: [
        {
          height: 0,
          id: 2,
          name: "guide",
          properties: [{ name: "dialogueId", type: "string", value: "guide" }],
          width: 0,
          x: 80,
          y: 90,
        },
      ],
      type: "objectgroup",
    },
    { name: "entrances", objects: [{ height: 0, id: 3, name: "south", width: 0, x: 64, y: 112 }], type: "objectgroup" },
  ],
  orientation: "orthogonal",
  properties: [{ name: "mapId", type: "string", value: "test-map" }],
  tileheight: 64,
  tilesets: [{ firstgid: 1, source: "test.tsj" }],
  tilewidth: 64,
  width: 2,
};

describe("Tiledマップ", () => {
  it("TMJと外部TSJから描画・衝突・マーカー情報を読む", () => {
    expect(parseTiledMap(map, tileset)).toMatchObject({
      id: "test-map",
      pixelWidth: 128,
      pixelHeight: 128,
      tileLayers: [
        { name: "ground", data: [1, 2, 2, 1] },
        { name: "foreground", data: [0, 0, 0, 2] },
      ],
      collisions: [{ x: 50, y: 30, width: 40, height: 20 }],
      markers: [
        { id: 2, kind: "npc", name: "guide", properties: { dialogueId: "guide" } },
        { id: 3, kind: "entrance", name: "south" },
      ],
      tileset: { firstGid: 1, image: "tiles.svg", columns: 2, tileCount: 2, depthYByLocalId: { 1: 36 } },
    });
  });

  it("反転GIDと規約外レイヤーを拒否する", () => {
    const flipped = structuredClone(map);
    const firstLayer = flipped.layers[0];
    if (!firstLayer?.data) throw new Error("テスト用のgroundレイヤーがありません");
    firstLayer.data[0] = 0x80000001;
    expect(() => parseTiledMap(flipped, tileset)).toThrow("反転・回転したタイルGID");

    const missingCollision = structuredClone(map);
    missingCollision.layers = missingCollision.layers.filter((layer) => layer.name !== "collision");
    expect(() => parseTiledMap(missingCollision, tileset)).toThrow("collision objectgroupレイヤーが必要です");
  });

  it("タイル内の描画基準が範囲外なら拒否する", () => {
    const invalidTileset = structuredClone(tileset);
    const depthProperty = invalidTileset.tiles[0]?.properties[0];
    if (!depthProperty) throw new Error("テスト用のdepthYプロパティがありません");
    depthProperty.value = 65;
    expect(() => parseTiledMap(map, invalidTileset)).toThrow("depthYは0以上タイル高以下");
  });

  it("X・Yを別々に衝突解決して壁沿いに移動できる", () => {
    const next = moveMapBody(
      { x: 30, y: 75 },
      { x: 40, y: -20 },
      { width: 20, height: 20 },
      [{ x: 50, y: 50, width: 40, height: 40 }],
      { width: 200, height: 160 },
    );

    expect(next).toEqual({ x: 40, y: 55 });
  });

  it("見た目の足元へずらした当たり判定で障害物の手前に止まる", () => {
    const body = { width: 20, height: 10, offsetY: 15 };
    const next = moveMapBody({ x: 100, y: 60 }, { x: 0, y: 40 }, body, [{ x: 50, y: 100, width: 100, height: 40 }], {
      width: 200,
      height: 200,
    });

    expect(next).toEqual({ x: 100, y: 80 });
    expect(getMapBodyDepth(next, body)).toBe(100);
  });

  it("マップ端でカメラを止め、画面より小さい軸は中央へ置く", () => {
    expect(calculateMapCamera({ x: 40, y: 700 }, { width: 400, height: 900 }, { width: 1000, height: 800 })).toEqual({
      x: 200,
      y: 400,
    });
    expect(calculateMapCamera({ x: 980, y: 200 }, { width: 400, height: 300 }, { width: 1000, height: 800 })).toEqual({
      x: 800,
      y: 200,
    });
  });
});
