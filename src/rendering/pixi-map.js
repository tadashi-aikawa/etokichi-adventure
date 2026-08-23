import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import MAP_SOURCE from "../../assets/maps/prototype-plaza.tmj?raw";
import ETOKICHI_MAP_SHEET_URL from "../../assets/map-characters/etokichi/walk.webp?url";
import GUIDE_MAP_SHEET_URL from "../../assets/map-characters/guide/walk.webp?url";
import TILESET_SOURCE from "../../assets/tilesets/prototype-plaza.tsj?raw";
import TILESET_IMAGE_URL from "../../assets/tilesets/prototype-plaza.svg?url";
import { getMapCharacterFrame, MAP_CHARACTER_COLUMNS, MAP_CHARACTER_ROWS } from "../game/map-character-animation.ts";
import { calculateMapCamera, moveMapBody, parseTiledMap } from "../game/tiled-map.ts";

const PLAYER_BODY = { width: 34, height: 38 };
const MOVE_SPEED = 230;
const MAP_SCALE = 1.25;
const MAP_KEYS = new Map([
  ["ArrowUp", "up"],
  ["KeyW", "up"],
  ["ArrowDown", "down"],
  ["KeyS", "down"],
  ["ArrowLeft", "left"],
  ["KeyA", "left"],
  ["ArrowRight", "right"],
  ["KeyD", "right"],
]);

export async function createMapSystem({ stage, ticker, getScreen, gameSession }) {
  const map = parseTiledMap(JSON.parse(MAP_SOURCE), JSON.parse(TILESET_SOURCE));
  const [atlasTexture, etokichiSheet, guideSheet] = await Promise.all([
    Assets.load(TILESET_IMAGE_URL),
    Assets.load(ETOKICHI_MAP_SHEET_URL),
    Assets.load(GUIDE_MAP_SHEET_URL),
  ]);
  const tileTextures = createTileTextures(map, atlasTexture);
  const root = new Container({ label: "map-scene" });
  const backdrop = new Graphics();
  const world = new Container({ label: map.id });
  world.scale.set(MAP_SCALE);
  const groundLayer = createTileLayer(map, "ground", tileTextures);
  const actorLayer = new Container({ label: "map-actors" });
  const foregroundLayer = createTileLayer(map, "foreground", tileTextures);
  const entranceLayer = createEntranceLayer(map);
  const player = createMapCharacterActor(etokichiSheet, { label: "map-player", width: 123, height: 92 });
  const npcLayer = createNpcLayer(map, guideSheet);
  actorLayer.addChild(entranceLayer, npcLayer, player.root);
  world.addChild(groundLayer, actorLayer, foregroundLayer);
  root.addChild(backdrop, world);
  stage.addChildAt(root, 0);

  const pressed = new Set();
  let elapsed = 0;
  let viewport = { width: 1, height: 1 };
  let facing = gameSession.getState().player.facing;
  player.setMotion(facing, 0, false);

  const isMapScene = () => gameSession.getState().scene === "map";
  const syncScene = (state) => {
    root.visible = state.scene === "map";
    if (!root.visible) pressed.clear();
    if (state.player.mapId !== map.id) return;
    player.root.position.set(state.player.x, state.player.y);
    if (facing !== state.player.facing) {
      facing = state.player.facing;
    }
    player.setMotion(facing, elapsed, false);
    applyCamera(state.player);
  };

  const onKeyDown = (event) => {
    const direction = MAP_KEYS.get(event.code);
    if (!direction || !isMapScene()) return;
    event.preventDefault();
    pressed.add(direction);
  };
  const onKeyUp = (event) => {
    const direction = MAP_KEYS.get(event.code);
    if (direction) pressed.delete(direction);
  };
  const onBlur = () => pressed.clear();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  const update = (frame) => {
    if (!root.visible) return;
    const deltaSeconds = Math.min(frame.deltaMS, 50) / 1000;
    elapsed += deltaSeconds;
    const horizontal = Number(pressed.has("right")) - Number(pressed.has("left"));
    const vertical = Number(pressed.has("down")) - Number(pressed.has("up"));
    if (horizontal === 0 && vertical === 0) {
      player.setMotion(facing, elapsed, false);
      player.root.y = gameSession.getState().player.y + Math.sin(elapsed * 4) * 1.2;
      return;
    }

    const magnitude = Math.hypot(horizontal, vertical) || 1;
    const state = gameSession.getState();
    const nextFacing = Math.abs(horizontal) > Math.abs(vertical)
      ? horizontal < 0 ? "left" : "right"
      : vertical < 0 ? "up" : "down";
    const next = moveMapBody(
      state.player,
      {
        x: horizontal / magnitude * MOVE_SPEED * deltaSeconds,
        y: vertical / magnitude * MOVE_SPEED * deltaSeconds,
      },
      PLAYER_BODY,
      map.collisions,
      { width: map.pixelWidth, height: map.pixelHeight },
    );
    gameSession.updatePlayer({ ...next, facing: nextFacing });
    player.setMotion(nextFacing, elapsed, true);
  };
  ticker.add(update);

  function applyCamera(target) {
    const worldViewport = { width: viewport.width / MAP_SCALE, height: viewport.height / MAP_SCALE };
    const camera = calculateMapCamera(target, worldViewport, { width: map.pixelWidth, height: map.pixelHeight });
    world.position.set(viewport.width / 2 - camera.x * MAP_SCALE, viewport.height / 2 - camera.y * MAP_SCALE);
  }

  function layout() {
    viewport = getScreen();
    backdrop.clear().rect(0, 0, viewport.width, viewport.height).fill(map.backgroundColor);
    syncScene(gameSession.getState());
  }

  const unsubscribe = gameSession.subscribe(syncScene);
  layout();

  return {
    map,
    layout,
    getDebugState() {
      const state = gameSession.getState();
      return {
        visible: root.visible,
        mapId: map.id,
        mapSize: { width: map.pixelWidth, height: map.pixelHeight },
        viewport: { ...viewport },
        player: { ...state.player },
        playerFrame: player.getFrameIndex(),
        worldPosition: { x: world.x, y: world.y },
        collisionCount: map.collisions.length,
        markerCount: map.markers.length,
      };
    },
    setVisible(visible) {
      root.visible = visible;
      if (!visible) pressed.clear();
    },
    destroy() {
      unsubscribe();
      ticker.remove(update);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      root.destroy({ children: true, texture: true });
    },
  };
}

function createTileTextures(map, atlasTexture) {
  return Array.from({ length: map.tileset.tileCount }, (_, localId) => {
    const column = localId % map.tileset.columns;
    const row = Math.floor(localId / map.tileset.columns);
    return new Texture({
      source: atlasTexture.source,
      frame: new Rectangle(
        column * map.tileset.tileWidth,
        row * map.tileset.tileHeight,
        map.tileset.tileWidth,
        map.tileset.tileHeight,
      ),
      label: `${map.tileset.name}:${localId}`,
    });
  });
}

function createTileLayer(map, name, tileTextures) {
  const definition = map.tileLayers.find((layer) => layer.name === name);
  const layer = new Container({ label: `map-${name}` });
  if (!definition) return layer;
  layer.alpha = definition.opacity;
  layer.visible = definition.visible;
  definition.data.forEach((gid, index) => {
    if (gid === 0) return;
    const texture = tileTextures[gid - map.tileset.firstGid];
    if (!texture) throw new Error(`${name}のGID ${gid} に対応するテクスチャがありません`);
    const sprite = new Sprite({ texture, roundPixels: true });
    sprite.position.set(index % map.width * map.tileWidth, Math.floor(index / map.width) * map.tileHeight);
    layer.addChild(sprite);
  });
  return layer;
}

function createMapCharacterActor(sheetTexture, options) {
  const frames = createCharacterFrames(sheetTexture, options.label);
  const root = new Container({ label: options.label });
  const shadow = new Graphics().ellipse(0, 18, 22, 8).fill({ color: 0x102e25, alpha: .35 });
  const sprite = new Sprite({ texture: frames[1], roundPixels: true });
  sprite.anchor.set(.5);
  sprite.setSize(options.width, options.height);
  root.addChild(shadow, sprite);
  let frameIndex = 1;
  return {
    root,
    getFrameIndex() {
      return frameIndex;
    },
    setMotion(facing, elapsedSeconds, moving) {
      frameIndex = getMapCharacterFrame(facing, elapsedSeconds, moving);
      sprite.texture = frames[frameIndex];
    },
  };
}

function createCharacterFrames(sheetTexture, label) {
  const frameWidth = sheetTexture.width / MAP_CHARACTER_COLUMNS;
  const frameHeight = sheetTexture.height / MAP_CHARACTER_ROWS;
  if (!Number.isInteger(frameWidth) || !Number.isInteger(frameHeight)) {
    throw new Error(`${label}のスプライトシート寸法が3列×4行で割り切れません`);
  }
  return Array.from({ length: MAP_CHARACTER_COLUMNS * MAP_CHARACTER_ROWS }, (_, index) => new Texture({
    source: sheetTexture.source,
    frame: new Rectangle(
      index % MAP_CHARACTER_COLUMNS * frameWidth,
      Math.floor(index / MAP_CHARACTER_COLUMNS) * frameHeight,
      frameWidth,
      frameHeight,
    ),
    label: `${label}:${index}`,
  }));
}

function createNpcLayer(map, sheetTexture) {
  const layer = new Container({ label: "map-npcs" });
  for (const marker of map.markers.filter((candidate) => candidate.kind === "npc")) {
    const npc = createMapCharacterActor(sheetTexture, { label: `npc-${marker.name}`, width: 82, height: 82 });
    npc.setMotion("down", 0, false);
    npc.root.position.set(marker.x, marker.y);
    layer.addChild(npc.root);
  }
  return layer;
}

function createEntranceLayer(map) {
  const layer = new Container({ label: "map-entrances" });
  for (const marker of map.markers.filter((candidate) => candidate.kind === "entrance" && candidate.name !== "player-start")) {
    const entrance = new Graphics()
      .roundRect(-25, -10, 50, 20, 8)
      .fill({ color: 0xffe68b, alpha: .55 })
      .stroke({ color: 0xffffff, width: 2, alpha: .72 });
    entrance.position.set(marker.x, marker.y);
    layer.addChild(entrance);
  }
  return layer;
}
