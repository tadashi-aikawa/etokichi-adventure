import ASTER_MAP_SHEET_URL from "../../assets/map-characters/aster/walk.webp?url";
import ETOKICHI_MAP_SHEET_URL from "../../assets/map-characters/etokichi/walk.webp?url";
import KUROBOSHI_MAP_SHEET_URL from "../../assets/map-characters/kuroboshi/walk.webp?url";
import SALARYMAN_ETOKICHI_MAP_SHEET_URL from "../../assets/map-characters/salarymanEtokichi/walk.webp?url";
import SUTEKICHI_MAP_SHEET_URL from "../../assets/map-characters/sutekichi/walk.webp?url";
import TATSUO_MAP_SHEET_URL from "../../assets/map-characters/tatsuo/walk.webp?url";
import type { CharacterId } from "../game/types.ts";
import type { ParsedTiledMap } from "../game/tiled-map.ts";

export interface MapActorDefinition {
  characterId: CharacterId;
  sheetUrl: string;
  width: number;
  height: number;
  footRatio: number;
}

export const MAP_ACTOR_CATALOG: Readonly<Record<CharacterId, MapActorDefinition>> = {
  etokichi: { characterId: "etokichi", sheetUrl: ETOKICHI_MAP_SHEET_URL, width: 123, height: 92, footRatio: 270 / 313 },
  kuroboshi: {
    characterId: "kuroboshi",
    sheetUrl: KUROBOSHI_MAP_SHEET_URL,
    width: 112,
    height: 84,
    footRatio: 303 / 313,
  },
  sutekichi: {
    characterId: "sutekichi",
    sheetUrl: SUTEKICHI_MAP_SHEET_URL,
    width: 114,
    height: 85,
    footRatio: 303 / 313,
  },
  salarymanEtokichi: {
    characterId: "salarymanEtokichi",
    sheetUrl: SALARYMAN_ETOKICHI_MAP_SHEET_URL,
    width: 118,
    height: 88,
    footRatio: 303 / 313,
  },
  tatsuo: { characterId: "tatsuo", sheetUrl: TATSUO_MAP_SHEET_URL, width: 107, height: 80, footRatio: 303 / 313 },
  aster: { characterId: "aster", sheetUrl: ASTER_MAP_SHEET_URL, width: 113, height: 85, footRatio: 303 / 313 },
};

export function getMapActorDefinition(characterId: CharacterId): MapActorDefinition {
  return MAP_ACTOR_CATALOG[characterId];
}

export function getRequiredMapCharacterIds(
  map: ParsedTiledMap,
  controlledCharacterId: CharacterId,
): readonly CharacterId[] {
  const characterIds = new Set<CharacterId>([controlledCharacterId]);
  for (const marker of map.markers.filter((candidate) => candidate.kind === "npc")) {
    const characterId = marker.properties.characterId;
    if (typeof characterId !== "string" || !isCharacterId(characterId)) {
      throw new Error(`${marker.name}のcharacterIdがmap actor catalogに登録されていません`);
    }
    characterIds.add(characterId);
  }
  return [...characterIds];
}

function isCharacterId(value: string): value is CharacterId {
  return Object.hasOwn(MAP_ACTOR_CATALOG, value);
}
