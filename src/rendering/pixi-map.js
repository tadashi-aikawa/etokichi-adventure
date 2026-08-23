import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import MAP_SOURCE from "../../assets/maps/prototype-plaza.tmj?raw";
import ETOKICHI_MAP_SHEET_URL from "../../assets/map-characters/etokichi/walk.webp?url";
import ASTER_MAP_SHEET_URL from "../../assets/map-characters/aster/walk.webp?url";
import KUROBOSHI_MAP_SHEET_URL from "../../assets/map-characters/kuroboshi/walk.webp?url";
import SALARYMAN_ETOKICHI_MAP_SHEET_URL from "../../assets/map-characters/salarymanEtokichi/walk.webp?url";
import SUTEKICHI_MAP_SHEET_URL from "../../assets/map-characters/sutekichi/walk.webp?url";
import TATSUO_MAP_SHEET_URL from "../../assets/map-characters/tatsuo/walk.webp?url";
import TILESET_SOURCE from "../../assets/tilesets/prototype-plaza.tsj?raw";
import TILESET_IMAGE_URL from "../../assets/tilesets/prototype-plaza.svg?url";
import { createCharacterProfiles } from "../game/characters.ts";
import { createNpcCollisions, getFacingToward } from "../game/map-interaction.ts";
import { getMapCharacterFrame, MAP_CHARACTER_COLUMNS, MAP_CHARACTER_ROWS } from "../game/map-character-animation.ts";
import { calculateMapCamera, getMapBodyDepth, moveMapBody, parseTiledMap } from "../game/tiled-map.ts";
import { createMapInterface } from "./map-interface.js";

const PLAYER_BODY = { width: 34, height: 18, offsetY: 25 };
const NPC_BODY = { width: 68, height: 42, offsetY: 20 };
const MOVE_SPEED = 230;
const MAP_SCALE = 1.25;
const MAP_CHARACTER_VISUALS = {
  etokichi: { width: 123, height: 92, footRatio: 270 / 313 },
  kuroboshi: { width: 112, height: 84, footRatio: 303 / 313 },
  sutekichi: { width: 114, height: 85, footRatio: 303 / 313 },
  salarymanEtokichi: { width: 118, height: 88, footRatio: 303 / 313 },
  tatsuo: { width: 107, height: 80, footRatio: 303 / 313 },
  aster: { width: 113, height: 85, footRatio: 303 / 313 },
};
const MAP_CHARACTER_SHEET_URLS = {
  etokichi: ETOKICHI_MAP_SHEET_URL,
  kuroboshi: KUROBOSHI_MAP_SHEET_URL,
  sutekichi: SUTEKICHI_MAP_SHEET_URL,
  salarymanEtokichi: SALARYMAN_ETOKICHI_MAP_SHEET_URL,
  tatsuo: TATSUO_MAP_SHEET_URL,
  aster: ASTER_MAP_SHEET_URL,
};
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

export async function createMapSystem({ arena, stage, ticker, getScreen, gameSession }) {
  const map = parseTiledMap(JSON.parse(MAP_SOURCE), JSON.parse(TILESET_SOURCE));
  const [atlasTexture, characterSheets] = await Promise.all([
    Assets.load(TILESET_IMAGE_URL),
    loadCharacterSheets(),
  ]);
  const tileTextures = createTileTextures(map, atlasTexture);
  const npcCollisions = createNpcCollisions(map.markers, NPC_BODY);
  const collisions = [...map.collisions, ...npcCollisions];
  const root = new Container({ label: "map-scene" });
  const backdrop = new Graphics();
  const world = new Container({ label: map.id });
  world.scale.set(MAP_SCALE);
  const groundLayer = createTileLayer(map, "ground", tileTextures);
  const actorLayer = new Container({ label: "map-actors" });
  actorLayer.sortableChildren = true;
  const foregroundActors = createDepthTileSprites(map, "foreground", tileTextures);
  const entranceLayer = createEntranceLayer(map);
  const player = createMapCharacterActor(characterSheets.etokichi, { label: "map-player", ...MAP_CHARACTER_VISUALS.etokichi });
  const npcSystem = createNpcSystem(map, characterSheets, NPC_BODY, gameSession.getState().mapActors);
  actorLayer.addChild(entranceLayer, ...foregroundActors, ...npcSystem.roots, player.root);
  world.addChild(groundLayer, actorLayer);
  root.addChild(backdrop, world);
  stage.addChildAt(root, 0);

  const pressed = new Set();
  const characterProfiles = createCharacterProfiles((source) => window.etokichiAssetUrl?.(source) ?? source);
  let elapsed = 0;
  let viewport = { width: 1, height: 1 };
  let facing = gameSession.getState().player.facing;
  let playerCharacterId = gameSession.getState().controlledCharacterId;
  player.setCharacter(characterSheets[playerCharacterId], MAP_CHARACTER_VISUALS[playerCharacterId]);
  player.setMotion(facing, 0, false);
  const mapInterface = createMapInterface({
    arena,
    gameSession,
    map,
    playerProfile: characterProfiles.etokichi,
    portraitUrl: characterProfiles.etokichi.images.idle,
    characterProfiles,
    getNpcCharacterId: (name) => npcSystem.getCharacterId(name),
    onDialogueOpen(marker) {
      npcSystem.setFacing(marker.name, getFacingToward(marker, gameSession.getState().player));
    },
    onSwitch(marker) {
      gameSession.swapControlledCharacter(marker.name);
    },
    onBattle(_marker, opponentId) {
      const state = gameSession.getState();
      gameSession.beginBattle({
        encounterId: `${map.id}:${state.controlledCharacterId}-vs-${opponentId}`,
        heroId: state.controlledCharacterId,
        opponentId,
        returnScene: "map",
      });
      window.dispatchEvent(new CustomEvent("etokichi:map-battle-request", {
        detail: { heroId: state.controlledCharacterId, opponentId },
      }));
    },
  });

  const isMapScene = () => gameSession.getState().scene === "map";
  const syncScene = (state) => {
    root.visible = state.scene === "map";
    if (!root.visible) pressed.clear();
    if (state.player.mapId !== map.id) return;
    if (playerCharacterId !== state.controlledCharacterId) {
      playerCharacterId = state.controlledCharacterId;
      player.setCharacter(characterSheets[playerCharacterId], MAP_CHARACTER_VISUALS[playerCharacterId]);
    }
    npcSystem.syncCharacters(state.mapActors);
    player.root.position.set(state.player.x, state.player.y);
    player.root.zIndex = getMapBodyDepth(state.player, PLAYER_BODY);
    if (facing !== state.player.facing) {
      facing = state.player.facing;
    }
    player.setMotion(facing, elapsed, false);
    applyCamera(state.player);
    mapInterface.updateNearbyNpc();
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
    if (mapInterface.isBlocking()) {
      pressed.clear();
      player.setMotion(facing, elapsed, false);
      return;
    }
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
      collisions,
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
        collisionCount: collisions.length,
        npcCollisionCount: npcCollisions.length,
        npcFacings: npcSystem.getFacings(),
        markerCount: map.markers.length,
        interface: mapInterface.getDebugState(),
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
      mapInterface.destroy();
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
  layer.addChild(...createTileEntries(map, definition, tileTextures).map(({ sprite }) => sprite));
  return layer;
}

function createDepthTileSprites(map, name, tileTextures) {
  const definition = map.tileLayers.find((layer) => layer.name === name);
  if (!definition) return [];
  return createTileEntries(map, definition, tileTextures).map(({ localId, sprite }) => {
    sprite.alpha = definition.opacity;
    sprite.visible = definition.visible;
    sprite.zIndex = sprite.y + (map.tileset.depthYByLocalId[localId] ?? map.tileHeight);
    return sprite;
  });
}

function createTileEntries(map, definition, tileTextures) {
  const entries = [];
  definition.data.forEach((gid, index) => {
    if (gid === 0) return;
    const localId = gid - map.tileset.firstGid;
    const texture = tileTextures[localId];
    if (!texture) throw new Error(`${definition.name}のGID ${gid} に対応するテクスチャがありません`);
    const sprite = new Sprite({ texture, roundPixels: true });
    sprite.position.set(index % map.width * map.tileWidth, Math.floor(index / map.width) * map.tileHeight);
    entries.push({ localId, sprite });
  });
  return entries;
}

function createMapCharacterActor(sheetTexture, options) {
  let frames = createCharacterFrames(sheetTexture, options.label);
  const root = new Container({ label: options.label });
  const shadow = new Graphics().ellipse(0, 0, 22, 8).fill({ color: 0x102e25, alpha: .35 });
  const sprite = new Sprite({ texture: frames[1], roundPixels: true });
  sprite.anchor.set(.5);
  sprite.setSize(options.width, options.height);
  shadow.y = getMapCharacterFootY(options);
  root.addChild(shadow, sprite);
  let frameIndex = 1;
  return {
    root,
    getFrameIndex() {
      return frameIndex;
    },
    setCharacter(nextSheetTexture, visual) {
      frames = createCharacterFrames(nextSheetTexture, options.label);
      sprite.setSize(visual.width, visual.height);
      shadow.y = getMapCharacterFootY(visual);
      sprite.texture = frames[frameIndex];
    },
    setMotion(facing, elapsedSeconds, moving) {
      frameIndex = getMapCharacterFrame(facing, elapsedSeconds, moving);
      sprite.texture = frames[frameIndex];
    },
  };
}

function getMapCharacterFootY(visual) {
  return (visual.footRatio - .5) * visual.height;
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

async function loadCharacterSheets() {
  const entries = await Promise.all(
    Object.entries(MAP_CHARACTER_SHEET_URLS).map(async ([characterId, url]) => [characterId, await Assets.load(url)]),
  );
  return Object.fromEntries(entries);
}

function createNpcSystem(map, characterSheets, body, initialAssignments) {
  const actors = new Map();
  const characterIds = new Map();
  const facings = new Map();
  const roots = [];
  for (const marker of map.markers.filter((candidate) => candidate.kind === "npc")) {
    const characterId = initialAssignments[marker.name] ?? marker.properties.characterId;
    const sheetTexture = characterSheets[characterId];
    const visual = MAP_CHARACTER_VISUALS[characterId];
    if (!sheetTexture || !visual) throw new Error(`${marker.name}のcharacterIdが不正です`);
    const npc = createMapCharacterActor(sheetTexture, { label: `npc-${marker.name}`, ...visual });
    npc.setMotion("down", 0, false);
    npc.root.position.set(marker.x, marker.y);
    npc.root.zIndex = getMapBodyDepth(marker, body);
    actors.set(marker.name, npc);
    characterIds.set(marker.name, characterId);
    facings.set(marker.name, "down");
    roots.push(npc.root);
  }
  return {
    roots,
    getFacings() {
      return Object.fromEntries(facings);
    },
    setFacing(name, facing) {
      const actor = actors.get(name);
      if (!actor) return;
      actor.setMotion(facing, 0, false);
      facings.set(name, facing);
    },
    syncCharacters(assignments) {
      for (const [name, characterId] of Object.entries(assignments)) {
        if (characterIds.get(name) === characterId) continue;
        const actor = actors.get(name);
        const sheetTexture = characterSheets[characterId];
        const visual = MAP_CHARACTER_VISUALS[characterId];
        if (!actor || !sheetTexture || !visual) throw new Error(`${name}のキャラクター割当が不正です`);
        actor.setCharacter(sheetTexture, visual);
        characterIds.set(name, characterId);
      }
    },
    getCharacterId(name) {
      return characterIds.get(name) ?? null;
    },
  };
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
