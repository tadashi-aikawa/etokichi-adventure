import { findFacingNpc, getFacingToward } from "./map-interaction.ts";
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
  mapId: string;
  player: MapPosition;
  controlledCharacterId: CharacterId;
  actors: readonly MapActorState[];
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
  validateControlledCharacterChange(characterId: CharacterId): void;
  setControlledCharacter(characterId: CharacterId): MapRuntimeSnapshot;
  setInputLock(reason: MapInputLockReason, locked: boolean): MapRuntimeSnapshot;
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
  const lockReasons = new Set<MapInputLockReason>();

  const assertUsable = () => {
    if (destroyed) throw new Error("破棄済みのMapRuntimeは利用できません");
  };

  const snapshot = (): MapRuntimeSnapshot => ({
    mapId: map.id,
    player: { ...player },
    controlledCharacterId: controlled,
    actors: [...actors.values()].map((actor) => ({ ...actor })),
    inputLocked: lockReasons.size > 0,
    lockReasons: [...lockReasons],
  });

  const visibleActorMarkers = (): MapMarker[] =>
    [...actors.values()]
      .filter((actor) => actor.visible)
      .map((actor, index) => ({
        id: index + 1,
        name: actor.entityId,
        kind: "npc",
        x: actor.x,
        y: actor.y,
        width: 0,
        height: 0,
        properties: {
          entityId: actor.entityId,
          characterId: actor.characterId,
          eventId: actor.eventId,
          behaviorId: actor.behaviorId,
        },
      }));

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
      const marker = findFacingNpc(player, visibleActorMarkers(), maximumDistance, maximumLateralDistance);
      if (!marker) return null;
      const actor = actors.get(String(marker.properties.entityId));
      if (!actor) throw new Error("会話対象のactorがruntimeに存在しません");
      return { ...actor };
    },
    movePlayer(delta, facing) {
      assertUsable();
      if (lockReasons.size > 0) return snapshot();
      const actorCollisions = visibleActorMarkers().map((marker) => ({
        x: marker.x + (MAP_NPC_BODY.offsetX ?? 0) - MAP_NPC_BODY.width / 2,
        y: marker.y + (MAP_NPC_BODY.offsetY ?? 0) - MAP_NPC_BODY.height / 2,
        width: MAP_NPC_BODY.width,
        height: MAP_NPC_BODY.height,
      }));
      const next = moveMapBody(player, delta, MAP_PLAYER_BODY, [...map.collisions, ...actorCollisions], {
        width: map.pixelWidth,
        height: map.pixelHeight,
      });
      player = { ...player, ...next, facing };
      return snapshot();
    },
    faceActor(entityId, target = player) {
      assertUsable();
      const actor = actors.get(entityId);
      if (!actor) throw new Error(`entityId ${entityId} は現在のマップに存在しません`);
      actor.facing = getFacingToward(actor, target);
      return snapshot();
    },
    validateControlledCharacterChange(characterId) {
      assertUsable();
      if (characterId === controlled) throw new Error(`${characterId}はすでに操作中です`);
      if (![...actors.values()].some((actor) => actor.characterId === characterId)) {
        throw new Error(`${characterId}のactorが現在のマップに存在しません`);
      }
      if (![...actors.values()].some((actor) => actor.characterId === controlled)) {
        throw new Error(`${controlled}のactorが現在のマップに存在しません`);
      }
    },
    setControlledCharacter(characterId) {
      assertUsable();
      this.validateControlledCharacterChange(characterId);
      for (const actor of actors.values()) actor.visible = actor.characterId !== characterId;
      controlled = characterId;
      return snapshot();
    },
    setInputLock(reason, locked) {
      assertUsable();
      if (locked) lockReasons.add(reason);
      else lockReasons.delete(reason);
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
