export interface MapPoint {
  x: number;
  y: number;
}

export interface MapRectangle extends MapPoint {
  width: number;
  height: number;
}

export interface MapBody {
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
}

export interface MapTileLayer {
  name: "ground" | "foreground";
  opacity: number;
  visible: boolean;
  data: number[];
}

export interface MapMarker extends MapRectangle {
  id: number;
  name: string;
  kind: "npc" | "entrance";
  properties: Record<string, boolean | number | string>;
}

export interface ParsedTileset {
  firstGid: number;
  name: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  tileCount: number;
  depthYByLocalId: Record<number, number>;
}

export interface ParsedTiledMap {
  id: string;
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  pixelWidth: number;
  pixelHeight: number;
  backgroundColor: string;
  tileLayers: MapTileLayer[];
  collisions: MapRectangle[];
  markers: MapMarker[];
  tileset: ParsedTileset;
}

interface TiledGid {
  id: number;
  flipped: boolean;
}

const FLIP_FLAGS = 0xf0000000;
const GID_MASK = 0x0fffffff;

export function parseTiledMap(mapValue: unknown, tilesetValue: unknown): ParsedTiledMap {
  const map = record(mapValue, "マップ");
  const tileset = record(tilesetValue, "タイルセット");
  if (map.orientation !== "orthogonal" || map.infinite === true) {
    throw new Error("有限のorthogonal Tiledマップだけを利用できます");
  }

  const width = positiveInteger(map.width, "マップ幅");
  const height = positiveInteger(map.height, "マップ高さ");
  const tileWidth = positiveInteger(map.tilewidth, "タイル幅");
  const tileHeight = positiveInteger(map.tileheight, "タイル高さ");
  const properties = parseProperties(map.properties);
  const id = typeof properties.mapId === "string" ? properties.mapId : "";
  if (!id) throw new Error("マップには文字列のmapIdプロパティが必要です");

  const mapTilesets = array(map.tilesets, "マップのtilesets");
  if (mapTilesets.length !== 1) throw new Error("プロトタイプでは外部タイルセットを1つ指定してください");
  const mapTileset = record(mapTilesets[0], "マップのtileset");
  if (typeof mapTileset.source !== "string" || !mapTileset.source.endsWith(".tsj")) {
    throw new Error("タイルセットは外部TSJで指定してください");
  }
  const firstGid = positiveInteger(mapTileset.firstgid, "firstgid");

  const parsedTileset: ParsedTileset = {
    firstGid,
    name: stringValue(tileset.name, "タイルセット名"),
    image: stringValue(tileset.image, "タイルセット画像"),
    imageWidth: positiveInteger(tileset.imagewidth, "タイルセット画像幅"),
    imageHeight: positiveInteger(tileset.imageheight, "タイルセット画像高さ"),
    tileWidth: positiveInteger(tileset.tilewidth, "タイルセットのタイル幅"),
    tileHeight: positiveInteger(tileset.tileheight, "タイルセットのタイル高さ"),
    columns: positiveInteger(tileset.columns, "タイルセット列数"),
    tileCount: positiveInteger(tileset.tilecount, "タイル数"),
    depthYByLocalId: parseTileDepths(tileset.tiles, tileHeight),
  };
  if (parsedTileset.tileWidth !== tileWidth || parsedTileset.tileHeight !== tileHeight) {
    throw new Error("マップとタイルセットのタイル寸法が一致しません");
  }

  const layers = array(map.layers, "マップのlayers").map((layer) => record(layer, "レイヤー"));
  const tileLayers = (["ground", "foreground"] as const).map((name) => {
    const layer = requiredLayer(layers, name, "tilelayer");
    const data = array(layer.data, `${name}のdata`).map((value) => integer(value, `${name}のGID`));
    if (data.length !== width * height) throw new Error(`${name}のタイル数がマップ寸法と一致しません`);
    for (const gid of data) {
      const decoded = decodeTiledGid(gid);
      if (decoded.flipped) throw new Error("反転・回転したタイルGIDはプロトタイプ規約では利用できません");
      if (decoded.id !== 0 && (decoded.id < firstGid || decoded.id >= firstGid + parsedTileset.tileCount)) {
        throw new Error(`${name}にタイルセット範囲外のGIDがあります`);
      }
    }
    return {
      name,
      opacity: typeof layer.opacity === "number" ? layer.opacity : 1,
      visible: layer.visible !== false,
      data,
    };
  });

  const collisionLayer = requiredLayer(layers, "collision", "objectgroup");
  const collisions = array(collisionLayer.objects, "collisionのobjects").map((value) => {
    const object = record(value, "衝突オブジェクト");
    return {
      x: finiteNumber(object.x, "衝突X"),
      y: finiteNumber(object.y, "衝突Y"),
      width: positiveNumber(object.width, "衝突幅"),
      height: positiveNumber(object.height, "衝突高さ"),
    };
  });

  const markers = [...parseMarkerLayer(layers, "actors", "npc"), ...parseMarkerLayer(layers, "entrances", "entrance")];

  return {
    id,
    width,
    height,
    tileWidth,
    tileHeight,
    pixelWidth: width * tileWidth,
    pixelHeight: height * tileHeight,
    backgroundColor: typeof map.backgroundcolor === "string" ? map.backgroundcolor : "#172f2b",
    tileLayers,
    collisions,
    markers,
    tileset: parsedTileset,
  };
}

function parseTileDepths(value: unknown, tileHeight: number): Record<number, number> {
  if (value === undefined) return {};
  const result: Record<number, number> = {};
  for (const tileValue of array(value, "タイルセットのtiles")) {
    const tile = record(tileValue, "タイル定義");
    const id = integer(tile.id, "タイルID");
    const depthY = parseProperties(tile.properties).depthY;
    if (depthY === undefined) continue;
    if (typeof depthY !== "number" || depthY < 0 || depthY > tileHeight) {
      throw new Error(`タイル${id}のdepthYは0以上タイル高以下の数値で指定してください`);
    }
    result[id] = depthY;
  }
  return result;
}

export function moveMapBody(
  position: MapPoint,
  delta: MapPoint,
  body: MapBody,
  collisions: MapRectangle[],
  world: MapBody,
): MapPoint {
  const halfWidth = body.width / 2;
  const halfHeight = body.height / 2;
  const offsetX = body.offsetX ?? 0;
  const offsetY = body.offsetY ?? 0;
  let x = clamp(position.x + delta.x, halfWidth - offsetX, world.width - halfWidth - offsetX);
  let y = position.y;

  for (const collision of collisions) {
    if (
      !intersects(
        { x: x + offsetX - halfWidth, y: y + offsetY - halfHeight, width: body.width, height: body.height },
        collision,
      )
    ) {
      continue;
    }
    if (delta.x > 0) x = collision.x - halfWidth - offsetX;
    else if (delta.x < 0) x = collision.x + collision.width + halfWidth - offsetX;
  }

  y = clamp(position.y + delta.y, halfHeight - offsetY, world.height - halfHeight - offsetY);
  for (const collision of collisions) {
    if (
      !intersects(
        { x: x + offsetX - halfWidth, y: y + offsetY - halfHeight, width: body.width, height: body.height },
        collision,
      )
    ) {
      continue;
    }
    if (delta.y > 0) y = collision.y - halfHeight - offsetY;
    else if (delta.y < 0) y = collision.y + collision.height + halfHeight - offsetY;
  }

  return { x, y };
}

export function getMapBodyDepth(position: MapPoint, body: MapBody): number {
  return position.y + (body.offsetY ?? 0) + body.height / 2;
}

export function calculateMapCamera(target: MapPoint, viewport: MapBody, world: MapBody): MapPoint {
  return {
    x:
      world.width <= viewport.width
        ? world.width / 2
        : clamp(target.x, viewport.width / 2, world.width - viewport.width / 2),
    y:
      world.height <= viewport.height
        ? world.height / 2
        : clamp(target.y, viewport.height / 2, world.height - viewport.height / 2),
  };
}

function parseMarkerLayer(layers: Record<string, unknown>[], layerName: string, kind: MapMarker["kind"]): MapMarker[] {
  const layer = requiredLayer(layers, layerName, "objectgroup");
  return array(layer.objects, `${layerName}のobjects`).map((value) => {
    const object = record(value, `${layerName}オブジェクト`);
    return {
      id: positiveInteger(object.id, `${layerName}のID`),
      name: stringValue(object.name, `${layerName}の名前`),
      kind,
      x: finiteNumber(object.x, `${layerName}のX`),
      y: finiteNumber(object.y, `${layerName}のY`),
      width: typeof object.width === "number" ? object.width : 0,
      height: typeof object.height === "number" ? object.height : 0,
      properties: parseProperties(object.properties),
    };
  });
}

function requiredLayer(layers: Record<string, unknown>[], name: string, type: string): Record<string, unknown> {
  const layer = layers.find((candidate) => candidate.name === name && candidate.type === type);
  if (!layer) throw new Error(`${name} ${type}レイヤーが必要です`);
  return layer;
}

function parseProperties(value: unknown): Record<string, boolean | number | string> {
  if (value === undefined) return {};
  const result: Record<string, boolean | number | string> = {};
  for (const entryValue of array(value, "properties")) {
    const entry = record(entryValue, "property");
    const name = stringValue(entry.name, "property名");
    if (!["boolean", "number", "string"].includes(typeof entry.value)) {
      throw new Error(`${name}のproperty値が不正です`);
    }
    result[name] = entry.value as boolean | number | string;
  }
  return result;
}

function decodeTiledGid(gid: number): TiledGid {
  const unsigned = gid >>> 0;
  return { id: unsigned & GID_MASK, flipped: (unsigned & FLIP_FLAGS) !== 0 };
}

function intersects(a: MapRectangle, b: MapRectangle): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label}が不正です`);
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label}が不正です`);
  return value;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label}が不正です`);
  return value;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label}が不正です`);
  return value;
}

function positiveNumber(value: unknown, label: string): number {
  const result = finiteNumber(value, label);
  if (result <= 0) throw new Error(`${label}が不正です`);
  return result;
}

function integer(value: unknown, label: string): number {
  const result = finiteNumber(value, label);
  if (!Number.isInteger(result)) throw new Error(`${label}が不正です`);
  return result;
}

function positiveInteger(value: unknown, label: string): number {
  const result = integer(value, label);
  if (result <= 0) throw new Error(`${label}が不正です`);
  return result;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
