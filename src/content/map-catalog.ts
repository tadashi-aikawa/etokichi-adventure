import MAP_SOURCE from "../../assets/maps/prototype-plaza.tmj?raw";
import GUILD_MAP_PROP_URL from "../../assets/maps/props/prototype-guild.svg?url";
import POND_MAP_PROP_URL from "../../assets/maps/props/prototype-pond.svg?url";
import TILESET_SOURCE from "../../assets/tilesets/prototype-plaza.tsj?raw";
import TILESET_IMAGE_URL from "../../assets/tilesets/prototype-plaza.svg?url";
import type { MapFacing, MapPosition } from "../game/game-session.ts";
import { parseTiledMap, type ParsedTiledMap } from "../game/tiled-map.ts";

export interface MapContentDefinition {
  id: string;
  mapSource: string;
  tilesetSource: string;
  tilesetImageUrl: string;
  propUrls: Readonly<Record<string, string>>;
}

export interface MapContentCatalog {
  get(mapId: string): MapContentDefinition;
  has(mapId: string): boolean;
}

export const INITIAL_MAP_ID = "prototype-plaza";

export function createMapContentCatalog(definitions: readonly MapContentDefinition[]): MapContentCatalog {
  const entries = new Map<string, MapContentDefinition>();
  for (const definition of definitions) {
    if (!definition.id) throw new Error("map catalogのIDが空です");
    if (entries.has(definition.id)) throw new Error(`map catalogのID ${definition.id} が重複しています`);
    entries.set(definition.id, definition);
  }
  return {
    get(mapId) {
      const definition = entries.get(mapId);
      if (!definition) throw new Error(`mapId ${mapId} はcatalogに登録されていません`);
      return definition;
    },
    has: (mapId) => entries.has(mapId),
  };
}

export function validateMapPropAssets(map: ParsedTiledMap, propUrls: Readonly<Record<string, string>>): void {
  for (const prop of map.props) {
    if (!propUrls[prop.assetId]) {
      throw new Error(`${prop.name}のassetId ${prop.assetId} はmap catalogに登録されていません`);
    }
  }
}

export function getMapInitialPosition(mapId: string): MapPosition {
  const content = MAP_CONTENT_CATALOG.get(mapId);
  const map = parseTiledMap(JSON.parse(content.mapSource), JSON.parse(content.tilesetSource));
  const starts = map.markers.filter((marker) => marker.kind === "entrance" && marker.name === "player-start");
  if (starts.length !== 1) throw new Error(`${mapId}にはplayer-startを1つだけ配置してください`);
  const start = starts[0];
  if (!start) throw new Error(`${mapId}にplayer-startがありません`);
  const facing = start.properties.facing;
  if (!isMapFacing(facing)) throw new Error(`${mapId}のplayer-startにはfacingを指定してください`);
  return { mapId, x: start.x, y: start.y, facing };
}

export const MAP_CONTENT_CATALOG = createMapContentCatalog([
  {
    id: INITIAL_MAP_ID,
    mapSource: MAP_SOURCE,
    tilesetSource: TILESET_SOURCE,
    tilesetImageUrl: TILESET_IMAGE_URL,
    propUrls: {
      guild: GUILD_MAP_PROP_URL,
      pond: POND_MAP_PROP_URL,
    },
  },
]);

function isMapFacing(value: unknown): value is MapFacing {
  return value === "up" || value === "down" || value === "left" || value === "right";
}
