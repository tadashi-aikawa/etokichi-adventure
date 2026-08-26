import type { EventPresentation, EventRunResult } from "./event-runner.ts";
import { createEventRunner } from "./event-runner.ts";
import { serializeWorldState, type GameSession } from "./game-session.ts";
import type { MapActorState, MapRuntime, MapRuntimeSnapshot } from "./map-runtime.ts";
import type { CharacterId } from "./types.ts";

export interface BattlePresentationPayload {
  encounterId: string;
  heroId: CharacterId;
  opponentId: CharacterId;
}

export interface BattlePresenter {
  present(payload: BattlePresentationPayload): void;
  resetToMap(): void;
}

export interface GameController {
  attachMapRuntime(runtime: MapRuntime): void;
  detachMapRuntime(runtime: MapRuntime): void;
  getMapSnapshot(): MapRuntimeSnapshot | null;
  findFacingActor(): MapActorState | null;
  setBattlePresenter(presenter: BattlePresenter): void;
  serialize(): string;
  startActorEvent(entityId: string): EventPresentation | null;
  advanceEvent(choiceId?: string): EventPresentation | null;
  cancelEvent(): void;
  openStatus(): void;
  closeStatus(): void;
  leaveBattle(): void;
  destroy(): void;
}

export function createGameController(
  gameSession: GameSession,
  resolveEventDefinition: Parameters<typeof createEventRunner>[0],
): GameController {
  const runner = createEventRunner(resolveEventDefinition);
  let runtime: MapRuntime | null = null;
  let battlePresenter: BattlePresenter | null = null;
  let destroyed = false;

  const assertUsable = () => {
    if (destroyed) throw new Error("破棄済みのGameControllerは利用できません");
  };

  const requireRuntime = () => {
    if (!runtime) throw new Error("MapRuntimeがattachされていません");
    return runtime;
  };

  const changeControlledCharacter = (characterId: CharacterId) => {
    const currentRuntime = requireRuntime();
    const state = gameSession.getState();
    if (state.scene !== "map" || state.activeBattle) throw new Error("マップ外では操作キャラクターを変更できません");
    currentRuntime.validateControlledCharacterChange(characterId);
    const previousCharacterId = state.controlledCharacterId;
    // sessionの同期購読者が読む時点で、runtime側も新しい操作キャラクターへ切り替わっている。
    currentRuntime.setControlledCharacter(characterId);
    try {
      gameSession.swapControlledCharacter(characterId);
    } catch (error) {
      try {
        currentRuntime.setControlledCharacter(previousCharacterId);
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "操作キャラクター変更に失敗し、MapRuntimeのrollbackにも失敗しました",
        );
      }
      throw error;
    }
  };

  const startBattle = (opponentId: CharacterId) => {
    const currentRuntime = requireRuntime();
    if (!battlePresenter) throw new Error("BattlePresenterが登録されていません");
    const state = gameSession.getState();
    const encounterId = `${currentRuntime.mapId}:${state.controlledCharacterId}-vs-${opponentId}`;
    currentRuntime.setInputLock("event", false);
    currentRuntime.setInputLock("status", false);
    currentRuntime.setInputLock("battle", true);
    let presentationAttempted = false;
    try {
      gameSession.checkpointPlayer(currentRuntime.checkpoint());
      gameSession.beginBattle({ encounterId, opponentId, returnScene: "map" });
      presentationAttempted = true;
      battlePresenter.present({ encounterId, heroId: state.controlledCharacterId, opponentId });
    } catch (error) {
      const rollbackErrors: unknown[] = [];
      if (gameSession.getState().activeBattle?.encounterId === encounterId) {
        try {
          gameSession.abortBattleStart();
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (presentationAttempted) {
        try {
          battlePresenter.resetToMap();
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      try {
        currentRuntime.setInputLock("battle", false);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      if (rollbackErrors.length > 0) {
        throw new AggregateError([error, ...rollbackErrors], "battle表示とrollbackに失敗しました");
      }
      throw error;
    }
  };

  const applyResult = (result: EventRunResult): EventPresentation | null => {
    const currentRuntime = requireRuntime();
    if (result.completed) currentRuntime.setInputLock("event", false);
    for (const command of result.commands) {
      switch (command.type) {
        case "setFlags":
          gameSession.setFlags(command.updates);
          break;
        case "faceEventTarget":
          currentRuntime.faceActor(command.entityId);
          break;
        case "switchControlledActor":
          changeControlledCharacter(command.characterId);
          break;
        case "battle":
          startBattle(command.opponentId);
          break;
        default:
          assertNever(command, "未対応のevent commandです");
      }
    }
    return result.presentation;
  };

  const recoverEventFailure = (error: unknown, currentRuntime: MapRuntime): never => {
    const recoveryErrors: unknown[] = [];
    try {
      runner.cancel();
    } catch (recoveryError) {
      recoveryErrors.push(recoveryError);
    }
    try {
      currentRuntime.setInputLock("event", false);
    } catch (recoveryError) {
      recoveryErrors.push(recoveryError);
    }
    if (recoveryErrors.length > 0) {
      throw new AggregateError([error, ...recoveryErrors], "event処理と復旧に失敗しました");
    }
    throw error;
  };

  return {
    attachMapRuntime(nextRuntime) {
      assertUsable();
      if (runtime && runtime !== nextRuntime) throw new Error("別のMapRuntimeがすでにattachされています");
      if (nextRuntime.mapId !== gameSession.getState().player.mapId) {
        throw new Error("WorldStateとMapRuntimeのmapIdが一致しません");
      }
      runtime = nextRuntime;
    },
    detachMapRuntime(targetRuntime) {
      assertUsable();
      if (runtime !== targetRuntime) return;
      gameSession.checkpointPlayer(targetRuntime.checkpoint());
      runner.cancel();
      targetRuntime.clearInputLocks();
      runtime = null;
    },
    getMapSnapshot() {
      assertUsable();
      return runtime?.getSnapshot() ?? null;
    },
    findFacingActor() {
      assertUsable();
      return runtime?.findFacingActor() ?? null;
    },
    setBattlePresenter(presenter) {
      assertUsable();
      battlePresenter = presenter;
    },
    serialize() {
      assertUsable();
      if (runtime) gameSession.checkpointPlayer(runtime.checkpoint());
      return serializeWorldState(gameSession.getState());
    },
    startActorEvent(entityId) {
      assertUsable();
      const currentRuntime = requireRuntime();
      const state = gameSession.getState();
      if (state.scene !== "map" || state.activeBattle) throw new Error("マップ外ではeventを開始できません");
      const actor = currentRuntime.getActor(entityId);
      currentRuntime.setInputLock("event", true);
      try {
        return applyResult(
          runner.start(
            actor.eventId,
            {
              eventTargetEntityId: actor.entityId,
              eventTargetCharacterId: actor.characterId,
              controlledCharacterId: state.controlledCharacterId,
              canSwitchControlledActor: currentRuntime.canChangeControlledCharacter(actor.characterId),
            },
            gameSession.getState().flags,
          ),
        );
      } catch (error) {
        return recoverEventFailure(error, currentRuntime);
      }
    },
    advanceEvent(choiceId) {
      assertUsable();
      try {
        return applyResult(runner.advance(choiceId ?? null, gameSession.getState().flags));
      } catch (error) {
        if (!runtime) {
          runner.cancel();
          throw error;
        }
        return recoverEventFailure(error, runtime);
      }
    },
    cancelEvent() {
      assertUsable();
      runner.cancel();
      runtime?.setInputLock("event", false);
    },
    openStatus() {
      assertUsable();
      const state = gameSession.getState();
      if (state.scene !== "map" || state.activeBattle) throw new Error("マップ外ではstatusを開けません");
      requireRuntime().setInputLock("status", true);
    },
    closeStatus() {
      assertUsable();
      runtime?.setInputLock("status", false);
    },
    leaveBattle() {
      assertUsable();
      gameSession.leaveBattle();
      runtime?.setInputLock("battle", false);
    },
    destroy() {
      try {
        if (runtime) {
          gameSession.checkpointPlayer(runtime.checkpoint());
          runtime.clearInputLocks();
        }
      } finally {
        runner.destroy();
        runtime = null;
        battlePresenter = null;
        destroyed = true;
      }
    },
  };
}

function assertNever(value: never, message: string): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
