import MAP_SOURCE from "../../assets/maps/prototype-plaza.tmj?raw";
import GUILD_MAP_PROP_URL from "../../assets/maps/props/prototype-guild.svg?url";
import POND_MAP_PROP_URL from "../../assets/maps/props/prototype-pond.svg?url";
import TILESET_SOURCE from "../../assets/tilesets/prototype-plaza.tsj?raw";
import TILESET_IMAGE_URL from "../../assets/tilesets/prototype-plaza.svg?url";
import type { ParsedTiledMap } from "../game/tiled-map.ts";

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

export const MAP_CONTENT_CATALOG = createMapContentCatalog([
  {
    id: "prototype-plaza",
    mapSource: MAP_SOURCE,
    tilesetSource: TILESET_SOURCE,
    tilesetImageUrl: TILESET_IMAGE_URL,
    propUrls: {
      guild: GUILD_MAP_PROP_URL,
      pond: POND_MAP_PROP_URL,
    },
  },
]);
