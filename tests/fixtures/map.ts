import { createMapRuntime } from "../../src/game/map-runtime.ts";
import type { ParsedTiledMap } from "../../src/game/tiled-map.ts";

export function createRuntime() {
  return createMapRuntime({
    map: createMap(),
    initialPlayer: { mapId: "test-map", x: 100, y: 100, facing: "right" },
    controlledCharacterId: "etokichi",
    resolveEventId: () => {},
  });
}

export function createMap(): ParsedTiledMap {
  return {
    id: "test-map",
    width: 20,
    height: 20,
    tileWidth: 32,
    tileHeight: 32,
    pixelWidth: 640,
    pixelHeight: 640,
    backgroundColor: "#000000",
    tileLayers: [],
    collisions: [],
    markers: [actorMarker(1, "aster-home", "aster", 200, 100), actorMarker(2, "etokichi-home", "etokichi", 400, 400)],
    props: [],
    tileset: {
      firstGid: 1,
      name: "test",
      image: "test.svg",
      imageWidth: 32,
      imageHeight: 32,
      tileWidth: 32,
      tileHeight: 32,
      columns: 1,
      tileCount: 1,
      depthYByLocalId: {},
    },
  };
}

function actorMarker(id: number, entityId: string, characterId: "aster" | "etokichi", x: number, y: number) {
  return {
    id,
    name: entityId,
    kind: "npc" as const,
    x,
    y,
    width: 0,
    height: 0,
    properties: {
      entityId,
      characterId,
      eventId: `character-action:${characterId}`,
      behaviorId: "idle",
    },
  };
}
