import { createBodyCollisions, findFacingTarget, getFacingToward } from "./map-interaction.ts";
import type { MapFacing, MapPosition } from "./game-session.ts";
import { moveMapBody, type MapBody, type MapMarker, type MapPoint, type ParsedTiledMap } from "./tiled-map.ts";
import { CHARACTER_IDS, type CharacterId } from "./types.ts";

export const MAP_PLAYER_BODY: MapBody = { width: 34, height: 18, offsetY: 25 };
export const MAP_NPC_BODY: MapBody = { width: 68, height: 42, offsetY: 20 };

export type MapInputLockReason = "event" | "status" | "loading" | "battle";

export interface MapActorState {
  entityId: string;
  characterId: CharacterId;
  eventId: string;
  behaviorId: "idle";
  x: number;
  y: number;
  facing: MapFacing;
  visible: boolean;
}

export interface MapRuntimeSnapshot {
  version: number;
  actorVersion: number;
  mapId: string;
  player: Readonly<MapPosition>;
  controlledCharacterId: CharacterId;
  actors: readonly Readonly<MapActorState>[];
  inputLocked: boolean;
  lockReasons: readonly MapInputLockReason[];
}

export interface MapRuntime {
  readonly mapId: string;
  getSnapshot(): MapRuntimeSnapshot;
  getActor(entityId: string): MapActorState;
  findFacingActor(maximumDistance?: number, maximumLateralDistance?: number): MapActorState | null;
  movePlayer(delta: MapPoint, facing: MapFacing): MapRuntimeSnapshot;
  faceActor(entityId: string, target?: MapPoint): MapRuntimeSnapshot;
  canChangeControlledCharacter(characterId: CharacterId): boolean;
  validateControlledCharacterChange(characterId: CharacterId): void;
  setControlledCharacter(characterId: CharacterId): MapRuntimeSnapshot;
  setInputLock(reason: MapInputLockReason, locked: boolean): MapRuntimeSnapshot;
  clearInputLocks(): MapRuntimeSnapshot;
  checkpoint(): MapPosition;
  destroy(): void;
}

export interface CreateMapRuntimeOptions {
  map: ParsedTiledMap;
  initialPlayer: MapPosition;
  controlledCharacterId: CharacterId;
  resolveEventId: (eventId: string) => unknown;
}

export function createMapRuntime(options: CreateMapRuntimeOptions): MapRuntime {
  const { map, initialPlayer, controlledCharacterId, resolveEventId } = options;
  if (initialPlayer.mapId !== map.id)
    throw new Error(`playerのmapId ${initialPlayer.mapId} と ${map.id} が一致しません`);

  const actors = new Map<string, MapActorState>();
  for (const marker of map.markers.filter((candidate) => candidate.kind === "npc")) {
    const entityId = requiredStringProperty(marker, "entityId");
    const characterId = requiredCharacterId(marker);
    const eventId = requiredStringProperty(marker, "eventId");
    const behaviorId = requiredStringProperty(marker, "behaviorId");
    if (behaviorId !== "idle") throw new Error(`${marker.name}のbehaviorId ${behaviorId} は未対応です`);
    if (actors.has(entityId)) throw new Error(`entityId ${entityId} がマップ内で重複しています`);
    resolveEventId(eventId);
    actors.set(entityId, {
      entityId,
      characterId,
      eventId,
      behaviorId,
      x: marker.x,
      y: marker.y,
      facing: "down",
      visible: characterId !== controlledCharacterId,
    });
  }

  let player = { ...initialPlayer };
  let controlled = controlledCharacterId;
  let destroyed = false;
  let version = 0;
  let actorVersion = 0;
  const lockReasons = new Set<MapInputLockReason>();
  let actorSnapshot: readonly MapActorState[] = [];
  let actorCollisions = [] as ReturnType<typeof createBodyCollisions>;
  let lockSnapshot: readonly MapInputLockReason[] = [];

  const assertUsable = () => {
    if (destroyed) throw new Error("破棄済みのMapRuntimeは利用できません");
  };

  const rebuildActorDerivedState = () => {
    actorSnapshot = Object.freeze([...actors.values()].map((actor) => Object.freeze({ ...actor })));
    actorCollisions = createBodyCollisions(
      actorSnapshot.filter((actor) => actor.visible),
      MAP_NPC_BODY,
    );
    actorVersion += 1;
    version += 1;
  };

  const rebuildLockSnapshot = () => {
    lockSnapshot = Object.freeze([...lockReasons]);
    version += 1;
  };

  const snapshot = (): MapRuntimeSnapshot => ({
    version,
    actorVersion,
    mapId: map.id,
    player: { ...player },
    controlledCharacterId: controlled,
    actors: actorSnapshot,
    inputLocked: lockReasons.size > 0,
    lockReasons: lockSnapshot,
  });

  const canChangeControlledCharacter = (characterId: CharacterId): boolean =>
    characterId !== controlled &&
    [...actors.values()].some((actor) => actor.characterId === characterId) &&
    [...actors.values()].some((actor) => actor.characterId === controlled);

  const validateControlledCharacterChange = (characterId: CharacterId) => {
    if (characterId === controlled) throw new Error(`${characterId}はすでに操作中です`);
    if (![...actors.values()].some((actor) => actor.characterId === characterId)) {
      throw new Error(`${characterId}のactorが現在のマップに存在しません`);
    }
    if (![...actors.values()].some((actor) => actor.characterId === controlled)) {
      throw new Error(`${controlled}のactorが現在のマップに存在しません`);
    }
  };

  rebuildActorDerivedState();

  return {
    mapId: map.id,
    getSnapshot() {
      assertUsable();
      return snapshot();
    },
    getActor(entityId) {
      assertUsable();
      const actor = actors.get(entityId);
      if (!actor) throw new Error(`entityId ${entityId} は現在のマップに存在しません`);
      return { ...actor };
    },
    findFacingActor(maximumDistance, maximumLateralDistance) {
      assertUsable();
      const actor = findFacingTarget(
        player,
        actorSnapshot.filter((candidate) => candidate.visible),
        maximumDistance,
        maximumLateralDistance,
      );
      return actor ? { ...actor } : null;
    },
    movePlayer(delta, facing) {
      assertUsable();
      if (lockReasons.size > 0) return snapshot();
      const next = moveMapBody(player, delta, MAP_PLAYER_BODY, [...map.collisions, ...actorCollisions], {
        width: map.pixelWidth,
        height: map.pixelHeight,
      });
      const changed = player.x !== next.x || player.y !== next.y || player.facing !== facing;
      player = { ...player, ...next, facing };
      if (changed) version += 1;
      return snapshot();
    },
    faceActor(entityId, target = player) {
      assertUsable();
      const actor = actors.get(entityId);
      if (!actor) throw new Error(`entityId ${entityId} は現在のマップに存在しません`);
      const nextFacing = getFacingToward(actor, target);
      if (actor.facing !== nextFacing) {
        actor.facing = nextFacing;
        rebuildActorDerivedState();
      }
      return snapshot();
    },
    canChangeControlledCharacter(characterId) {
      assertUsable();
      return canChangeControlledCharacter(characterId);
    },
    validateControlledCharacterChange(characterId) {
      assertUsable();
      validateControlledCharacterChange(characterId);
    },
    setControlledCharacter(characterId) {
      assertUsable();
      validateControlledCharacterChange(characterId);
      for (const actor of actors.values()) actor.visible = actor.characterId !== characterId;
      controlled = characterId;
      rebuildActorDerivedState();
      return snapshot();
    },
    setInputLock(reason, locked) {
      assertUsable();
      const changed = locked ? !lockReasons.has(reason) : lockReasons.has(reason);
      if (locked) lockReasons.add(reason);
      else lockReasons.delete(reason);
      if (changed) rebuildLockSnapshot();
      return snapshot();
    },
    clearInputLocks() {
      assertUsable();
      if (lockReasons.size > 0) {
        lockReasons.clear();
        rebuildLockSnapshot();
      }
      return snapshot();
    },
    checkpoint() {
      assertUsable();
      return { ...player };
    },
    destroy() {
      actors.clear();
      lockReasons.clear();
      destroyed = true;
    },
  };
}

function requiredStringProperty(marker: MapMarker, key: string): string {
  const value = marker.properties[key];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${marker.name}の${key}が不正です`);
  return value;
}

function requiredCharacterId(marker: MapMarker): CharacterId {
  const value = requiredStringProperty(marker, "characterId");
  if (!CHARACTER_IDS.some((candidate) => candidate === value)) throw new Error(`${marker.name}のcharacterIdが不正です`);
  return value as CharacterId;
}
