import { CHARACTER_IDS, type CharacterId } from "./types.ts";

export const WORLD_STATE_VERSION = 2 as const;

export type AppScene = "title" | "map" | "battle";
export type MapFacing = "up" | "down" | "left" | "right";
export type WorldFlagValue = boolean | number | string;
export type BattleOutcome = "win" | "loss" | "draw";

export interface MapPosition {
  mapId: string;
  x: number;
  y: number;
  facing: MapFacing;
}

export interface BattleResult {
  encounterId: string;
  heroId: CharacterId;
  opponentId: CharacterId;
  outcome: BattleOutcome;
  reason: "ko" | "time";
}

export interface ActiveBattle {
  encounterId: string;
  heroId: CharacterId;
  opponentId: CharacterId;
  returnScene: "title" | "map";
  result: BattleResult | null;
}

export interface WorldState {
  version: typeof WORLD_STATE_VERSION;
  scene: AppScene;
  player: MapPosition;
  controlledCharacterId: CharacterId;
  flags: Record<string, WorldFlagValue>;
  activeBattle: ActiveBattle | null;
  lastBattle: BattleResult | null;
}

export interface BattleRequest {
  encounterId: string;
  heroId?: CharacterId;
  opponentId: CharacterId;
  returnScene?: "title" | "map";
}

export interface BattleResolution {
  outcome: BattleOutcome;
  reason: "ko" | "time";
}

export interface GameSession {
  getState(): WorldState;
  enterMap(position?: Partial<MapPosition>): WorldState;
  checkpointPlayer(position: MapPosition): WorldState;
  swapControlledCharacter(characterId: CharacterId): WorldState;
  setFlags(updates: Readonly<Record<string, WorldFlagValue>>): WorldState;
  beginBattle(request: BattleRequest): WorldState;
  abortBattleStart(): WorldState;
  resolveBattle(resolution: BattleResolution): WorldState;
  restartBattle(): WorldState;
  leaveBattle(): WorldState;
  serialize(): string;
  subscribe(listener: (state: WorldState) => void): () => void;
}

const INITIAL_POSITION: MapPosition = {
  mapId: "prototype-plaza",
  x: 736,
  y: 512,
  facing: "down",
};

export function createInitialWorldState(): WorldState {
  return {
    version: WORLD_STATE_VERSION,
    scene: "title",
    player: { ...INITIAL_POSITION },
    controlledCharacterId: "etokichi",
    flags: {},
    activeBattle: null,
    lastBattle: null,
  };
}

export function parseWorldState(serialized: string): WorldState {
  const value: unknown = JSON.parse(serialized);
  if (!isWorldState(value)) throw new Error("ワールド状態の形式が不正です");
  return cloneWorldState(value);
}

export function createGameSession(initialState = createInitialWorldState()): GameSession {
  let state = cloneWorldState(initialState);
  const listeners = new Set<(nextState: WorldState) => void>();

  const publish = (nextState: WorldState) => {
    state = nextState;
    // 状態commit後の表示層の失敗で、別の購読者通知やControllerの処理を巻き戻さない。
    for (const listener of listeners) {
      try {
        listener(cloneWorldState(state));
      } catch (error) {
        console.error("ゲームセッション購読者の処理に失敗しました", error);
      }
    }
    return cloneWorldState(state);
  };

  return {
    getState: () => cloneWorldState(state),
    enterMap: (position = {}) => {
      if (state.activeBattle) throw new Error("進行中のバトルからは直接マップへ移れません");
      return publish({
        ...state,
        scene: "map",
        player: { ...state.player, ...position },
      });
    },
    checkpointPlayer: (position) => {
      if (!isMapPosition(position)) throw new Error("checkpointするマップ位置が不正です");
      return publish({ ...state, player: { ...position } });
    },
    swapControlledCharacter: (characterId) => {
      if (state.scene !== "map" || state.activeBattle) throw new Error("マップ外では操作キャラクターを変更できません");
      if (!isCharacterId(characterId)) throw new Error(`${characterId}は操作可能なキャラクターではありません`);
      if (characterId === state.controlledCharacterId) throw new Error(`${characterId}はすでに操作中です`);
      return publish({
        ...state,
        controlledCharacterId: characterId,
      });
    },
    setFlags: (updates) => {
      for (const [key, value] of Object.entries(updates)) {
        if (!key || !isFlagValue(value)) throw new Error("更新するevent変数が不正です");
      }
      return publish({ ...state, flags: { ...state.flags, ...updates } });
    },
    beginBattle: (request) => {
      if (state.activeBattle) throw new Error("進行中のバトルがあります");
      const returnScene = request.returnScene ?? (state.scene === "map" ? "map" : "title");
      const heroId = request.heroId ?? state.controlledCharacterId;
      return publish({
        ...state,
        scene: "battle",
        activeBattle: {
          encounterId: request.encounterId,
          heroId,
          opponentId: request.opponentId,
          returnScene,
          result: null,
        },
      });
    },
    abortBattleStart: () => {
      if (!state.activeBattle || state.activeBattle.result || state.scene !== "battle") {
        throw new Error("開始を中断できるバトルがありません");
      }
      return publish({ ...state, scene: state.activeBattle.returnScene, activeBattle: null });
    },
    resolveBattle: (resolution) => {
      if (!state.activeBattle) throw new Error("解決対象のバトルがありません");
      if (state.activeBattle.result) return cloneWorldState(state);
      const result: BattleResult = {
        encounterId: state.activeBattle.encounterId,
        heroId: state.activeBattle.heroId,
        opponentId: state.activeBattle.opponentId,
        ...resolution,
      };
      return publish({
        ...state,
        activeBattle: { ...state.activeBattle, result },
        lastBattle: result,
      });
    },
    restartBattle: () => {
      if (!state.activeBattle?.result) throw new Error("再戦できるバトル結果がありません");
      return publish({
        ...state,
        scene: "battle",
        activeBattle: { ...state.activeBattle, result: null },
      });
    },
    leaveBattle: () => {
      if (!state.activeBattle?.result) throw new Error("未解決のバトルからは退出できません");
      return publish({
        ...state,
        scene: state.activeBattle.returnScene,
        activeBattle: null,
      });
    },
    serialize: () => JSON.stringify(state),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function cloneWorldState(state: WorldState): WorldState {
  return {
    ...state,
    player: { ...state.player },
    flags: { ...state.flags },
    activeBattle: state.activeBattle
      ? { ...state.activeBattle, result: state.activeBattle.result ? { ...state.activeBattle.result } : null }
      : null,
    lastBattle: state.lastBattle ? { ...state.lastBattle } : null,
  };
}

function isWorldState(value: unknown): value is WorldState {
  if (!isRecord(value) || value.version !== WORLD_STATE_VERSION) return false;
  if (
    !isScene(value.scene) ||
    !isMapPosition(value.player) ||
    !isCharacterId(value.controlledCharacterId) ||
    !isFlagRecord(value.flags)
  )
    return false;
  if (value.activeBattle !== null && !isActiveBattle(value.activeBattle)) return false;
  if ((value.scene === "battle") !== (value.activeBattle !== null)) return false;
  if (
    isActiveBattle(value.activeBattle) &&
    value.activeBattle.result &&
    (value.activeBattle.encounterId !== value.activeBattle.result.encounterId ||
      value.activeBattle.heroId !== value.activeBattle.result.heroId ||
      value.activeBattle.opponentId !== value.activeBattle.result.opponentId)
  ) {
    return false;
  }
  return value.lastBattle === null || isBattleResult(value.lastBattle);
}

function isMapPosition(value: unknown): value is MapPosition {
  return (
    isRecord(value) &&
    typeof value.mapId === "string" &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    isFacing(value.facing)
  );
}

function isActiveBattle(value: unknown): value is ActiveBattle {
  return (
    isRecord(value) &&
    typeof value.encounterId === "string" &&
    isCharacterId(value.heroId) &&
    isCharacterId(value.opponentId) &&
    (value.returnScene === "title" || value.returnScene === "map") &&
    (value.result === null || isBattleResult(value.result))
  );
}

function isBattleResult(value: unknown): value is BattleResult {
  return (
    isRecord(value) &&
    typeof value.encounterId === "string" &&
    isCharacterId(value.heroId) &&
    isCharacterId(value.opponentId) &&
    (value.outcome === "win" || value.outcome === "loss" || value.outcome === "draw") &&
    (value.reason === "ko" || value.reason === "time")
  );
}

function isFlagRecord(value: unknown): value is Record<string, WorldFlagValue> {
  if (!isRecord(value)) return false;
  return Object.values(value).every(isFlagValue);
}

function isFlagValue(value: unknown): value is WorldFlagValue {
  return ["boolean", "number", "string"].includes(typeof value);
}

function isScene(value: unknown): value is AppScene {
  return value === "title" || value === "map" || value === "battle";
}

function isFacing(value: unknown): value is MapFacing {
  return value === "up" || value === "down" || value === "left" || value === "right";
}

function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && CHARACTER_IDS.some((characterId) => characterId === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
