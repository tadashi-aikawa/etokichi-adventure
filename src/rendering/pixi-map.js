import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from "pixi.js";
import { getRequiredMapCharacterIds, MAP_ACTOR_CATALOG } from "../content/map-actor-catalog.ts";
import { EVENT_CATALOG } from "../content/event-catalog.ts";
import { MAP_CONTENT_CATALOG, validateMapPropAssets } from "../content/map-catalog.ts";
import { createCharacterProfiles } from "../game/characters.ts";
import { getMapCharacterFrame, MAP_CHARACTER_COLUMNS, MAP_CHARACTER_ROWS } from "../game/map-character-animation.ts";
import { createMapRuntime, MAP_NPC_BODY, MAP_PLAYER_BODY } from "../game/map-runtime.ts";
import { calculateMapCamera, getMapBodyDepth, parseTiledMap } from "../game/tiled-map.ts";
import { createMapInterface } from "./map-interface.js";

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

export async function createMapSystem({ arena, stage, ticker, gameSession, gameController, mobileControls }) {
  const initialState = gameSession.getState();
  const content = MAP_CONTENT_CATALOG.get(initialState.player.mapId);
  const map = parseTiledMap(JSON.parse(content.mapSource), JSON.parse(content.tilesetSource));
  validateMapPropAssets(map, content.propUrls);
  const requiredCharacterIds = getRequiredMapCharacterIds(map, initialState.controlledCharacterId);
  const [atlasTexture, characterSheets, propTextures] = await Promise.all([
    Assets.load(content.tilesetImageUrl),
    loadCharacterSheets(requiredCharacterIds),
    loadMapPropTextures(content.propUrls),
  ]);
  const tileTextures = createTileTextures(map, atlasTexture);
  const characterFrames = Object.fromEntries(
    Object.entries(characterSheets).map(([characterId, sheet]) => [
      characterId,
      createCharacterFrames(sheet, `map-character-${characterId}`),
    ]),
  );
  const ownedTextures = [...tileTextures, ...Object.values(characterFrames).flat()];
  const mapRuntime = createMapRuntime({
    map,
    initialPlayer: initialState.player,
    controlledCharacterId: initialState.controlledCharacterId,
    resolveEventId: (eventId) => EVENT_CATALOG.get(eventId),
  });
  gameController.attachMapRuntime(mapRuntime);
  const root = new Container({ label: "map-scene" });
  const viewportMask = new Graphics({ label: "map-viewport-mask" });
  const backdrop = new Graphics();
  const world = new Container({ label: map.id });
  world.scale.set(MAP_SCALE);
  const groundLayer = createTileLayer(map, "ground", tileTextures);
  const propLayer = createMapPropLayer(map, propTextures);
  const actorLayer = new Container({ label: "map-actors" });
  actorLayer.sortableChildren = true;
  const foregroundActors = createDepthTileSprites(map, "foreground", tileTextures);
  const entranceLayer = createEntranceLayer(map);
  const initialActorDefinition = MAP_ACTOR_CATALOG[initialState.controlledCharacterId];
  const player = createMapCharacterActor(characterFrames[initialState.controlledCharacterId], {
    label: "map-player",
    ...initialActorDefinition,
  });
  const npcSystem = createNpcSystem(mapRuntime.getSnapshot().actors, characterFrames);
  actorLayer.addChild(entranceLayer, ...foregroundActors, ...npcSystem.roots, player.root);
  world.addChild(groundLayer, propLayer, actorLayer);
  root.addChild(backdrop, world);
  stage.addChildAt(root, 0);
  stage.addChildAt(viewportMask, 1);
  root.mask = viewportMask;

  const pressed = new Set();
  const characterProfiles = createCharacterProfiles((source) => window.etokichiAssetUrl?.(source) ?? source);
  let elapsed = 0;
  let viewport = { width: 1, height: 1 };
  let facing = initialState.player.facing;
  let playerCharacterId = initialState.controlledCharacterId;
  let lastActorVersion = -1;
  let lastNearbyVersion = -1;
  let lastInputLocked = null;
  const isMapScene = () => gameSession.getState().scene === "map";
  player.setCharacter(characterFrames[playerCharacterId], MAP_ACTOR_CATALOG[playerCharacterId]);
  player.setMotion(facing, 0, false);
  const mapInterface = createMapInterface({
    arena,
    gameSession,
    gameController,
    playerProfile: characterProfiles.etokichi,
    portraitUrl: characterProfiles.etokichi.images.idle,
    characterProfiles,
    onModeChange(mode) {
      pressed.clear();
      const controlsAvailable = isMapScene() && mode === "map" && !mapRuntime.getSnapshot().inputLocked;
      mobileControls.setState({ visible: isMapScene(), enabled: controlsAvailable });
    },
  });

  function setMobileDirection(direction, active) {
    if (!isMapScene()) return;
    if (mapRuntime.getSnapshot().inputLocked) {
      pressed.delete(direction);
      return;
    }
    if (active) pressed.add(direction);
    else pressed.delete(direction);
  }

  mobileControls.setHandlers({
    moveLeft: (active) => setMobileDirection("left", active),
    moveRight: (active) => setMobileDirection("right", active),
    moveUp: (active) => setMobileDirection("up", active),
    moveDown: (active) => setMobileDirection("down", active),
    action: () => mapInterface.openDialogue(),
    menu: () => mapInterface.openStatus(),
  }, "map");

  const syncScene = (state) => {
    root.visible = state.scene === "map";
    if (!root.visible) pressed.clear();
    if (state.player.mapId !== map.id) return;
    syncRuntime(false);
  };

  function syncRuntime(moving, snapshot = mapRuntime.getSnapshot()) {
    if (playerCharacterId !== snapshot.controlledCharacterId) {
      playerCharacterId = snapshot.controlledCharacterId;
      player.setCharacter(characterFrames[playerCharacterId], MAP_ACTOR_CATALOG[playerCharacterId]);
    }
    facing = snapshot.player.facing;
    player.root.position.set(snapshot.player.x, snapshot.player.y);
    player.root.zIndex = getMapBodyDepth(snapshot.player, MAP_PLAYER_BODY);
    player.setMotion(facing, elapsed, moving);
    if (lastActorVersion !== snapshot.actorVersion) {
      npcSystem.sync(snapshot.actors);
      lastActorVersion = snapshot.actorVersion;
    }
    applyCamera(snapshot.player);
    if (lastNearbyVersion !== snapshot.version) {
      mapInterface.updateNearbyNpc();
      lastNearbyVersion = snapshot.version;
    }
    if (lastInputLocked !== snapshot.inputLocked) {
      mobileControls.setState({ visible: isMapScene(), enabled: isMapScene() && !snapshot.inputLocked });
      lastInputLocked = snapshot.inputLocked;
    }
  }

  const onKeyDown = (event) => {
    const direction = MAP_KEYS.get(event.code);
    if (!direction || !isMapScene()) return;
    event.preventDefault();
    if (mapRuntime.getSnapshot().inputLocked) return;
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
    const snapshot = mapRuntime.getSnapshot();
    if (snapshot.inputLocked) {
      pressed.clear();
      syncRuntime(false, snapshot);
      return;
    }
    const horizontal = Number(pressed.has("right")) - Number(pressed.has("left"));
    const vertical = Number(pressed.has("down")) - Number(pressed.has("up"));
    if (horizontal === 0 && vertical === 0) {
      syncRuntime(false, snapshot);
      player.root.y += Math.sin(elapsed * 4) * 1.2;
      return;
    }

    const magnitude = Math.hypot(horizontal, vertical) || 1;
    const nextFacing = Math.abs(horizontal) > Math.abs(vertical)
      ? horizontal < 0 ? "left" : "right"
      : vertical < 0 ? "up" : "down";
    const movedSnapshot = mapRuntime.movePlayer(
      {
        x: horizontal / magnitude * MOVE_SPEED * deltaSeconds,
        y: vertical / magnitude * MOVE_SPEED * deltaSeconds,
      },
      nextFacing,
    );
    syncRuntime(true, movedSnapshot);
  };
  ticker.add(update);

  function applyCamera(target) {
    const worldViewport = { width: viewport.width / MAP_SCALE, height: viewport.height / MAP_SCALE };
    const camera = calculateMapCamera(target, worldViewport, { width: map.pixelWidth, height: map.pixelHeight });
    world.position.set(
      viewport.x + viewport.width / 2 - camera.x * MAP_SCALE,
      viewport.y + viewport.height / 2 - camera.y * MAP_SCALE,
    );
  }

  function layout() {
    viewport = mobileControls.getPlayfield();
    viewportMask.clear().rect(viewport.x, viewport.y, viewport.width, viewport.height).fill({ color: 0xffffff });
    backdrop.clear().rect(viewport.x, viewport.y, viewport.width, viewport.height).fill(map.backgroundColor);
    syncScene(gameSession.getState());
  }

  const unsubscribe = gameSession.subscribe(syncScene);
  layout();

  return {
    map,
    layout,
    getDebugState() {
      const snapshot = mapRuntime.getSnapshot();
      return {
        visible: root.visible,
        mapId: map.id,
        mapSize: { width: map.pixelWidth, height: map.pixelHeight },
        viewport: { ...viewport },
        player: { ...snapshot.player },
        playerFrame: player.getFrameIndex(),
        worldPosition: { x: world.x, y: world.y },
        collisionCount: map.collisions.length + snapshot.actors.filter((actor) => actor.visible).length,
        npcCollisionCount: snapshot.actors.filter((actor) => actor.visible).length,
        visibleNpcCharacterIds: npcSystem.getVisibleCharacterIds(),
        loadedCharacterIds: [...requiredCharacterIds],
        characterHomes: Object.fromEntries(snapshot.actors.map((actor) => [actor.characterId, { x: actor.x, y: actor.y }])),
        npcFacings: npcSystem.getFacings(),
        markerCount: map.markers.length,
        propCount: map.props.length,
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
      gameController.detachMapRuntime(mapRuntime);
      mapRuntime.destroy();
      root.mask = null;
      viewportMask.destroy();
      root.destroy({ children: true, texture: false });
      for (const texture of ownedTextures) texture.destroy(false);
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

function createMapCharacterActor(initialFrames, options) {
  let frames = initialFrames;
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
    setCharacter(nextFrames, visual) {
      frames = nextFrames;
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

async function loadCharacterSheets(characterIds) {
  const entries = await Promise.all(
    characterIds.map(async (characterId) => {
      const actor = MAP_ACTOR_CATALOG[characterId];
      if (!actor) throw new Error(`${characterId}はmap actor catalogに登録されていません`);
      return [characterId, await Assets.load(actor.sheetUrl)];
    }),
  );
  return Object.fromEntries(entries);
}

async function loadMapPropTextures(propUrls) {
  const entries = await Promise.all(
    Object.entries(propUrls).map(async ([assetId, url]) => [assetId, await Assets.load(url)]),
  );
  return Object.fromEntries(entries);
}

function createMapPropLayer(map, propTextures) {
  const layer = new Container({ label: "map-props" });
  for (const prop of map.props) {
    const texture = propTextures[prop.assetId];
    if (!texture) throw new Error(`${prop.name}のassetId ${prop.assetId} に対応する画像がありません`);
    const sprite = new Sprite({ texture, roundPixels: true });
    sprite.position.set(prop.x, prop.y);
    sprite.setSize(prop.width, prop.height);
    layer.addChild(sprite);
  }
  return layer;
}

function createNpcSystem(actorStates, characterFrames) {
  const actors = new Map();
  const characterIds = new Map();
  const facings = new Map();
  const roots = [];
  for (const state of actorStates) {
    const frames = characterFrames[state.characterId];
    const visual = MAP_ACTOR_CATALOG[state.characterId];
    if (!frames || !visual) throw new Error(`${state.entityId}のcharacterIdが不正です`);
    const npc = createMapCharacterActor(frames, { label: `npc-${state.entityId}`, ...visual });
    actors.set(state.entityId, npc);
    characterIds.set(state.entityId, state.characterId);
    roots.push(npc.root);
  }
  return {
    roots,
    getVisibleCharacterIds() {
      return [...characterIds.entries()]
        .filter(([name]) => actors.get(name)?.root.visible)
        .map(([, characterId]) => characterId);
    },
    getFacings() {
      return Object.fromEntries(facings);
    },
    sync(states) {
      for (const state of states) {
        const actor = actors.get(state.entityId);
        if (!actor) continue;
        actor.root.visible = state.visible;
        actor.root.position.set(state.x, state.y);
        actor.root.zIndex = getMapBodyDepth(state, MAP_NPC_BODY);
        actor.setMotion(state.facing, 0, false);
        facings.set(state.entityId, state.facing);
      }
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
