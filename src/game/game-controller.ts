import type { EventPresentation, EventRunResult } from "./event-runner.ts";
import { createEventRunner, eventCanSwitchControlledActor } from "./event-runner.ts";
import type { GameSession } from "./game-session.ts";
import type { MapRuntime } from "./map-runtime.ts";
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
  getMapRuntime(): MapRuntime | null;
  setBattlePresenter(presenter: BattlePresenter): void;
  checkpointMap(): void;
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
    // sessionの同期購読者が読む時点で、runtime側も新しい操作キャラクターへ切り替わっている。
    currentRuntime.setControlledCharacter(characterId);
    gameSession.swapControlledCharacter(characterId);
  };

  const startBattle = (opponentId: CharacterId) => {
    const currentRuntime = requireRuntime();
    if (!battlePresenter) throw new Error("BattlePresenterが登録されていません");
    const state = gameSession.getState();
    const encounterId = `${currentRuntime.mapId}:${state.controlledCharacterId}-vs-${opponentId}`;
    currentRuntime.setInputLock("event", false);
    currentRuntime.setInputLock("status", false);
    currentRuntime.setInputLock("battle", true);
    gameSession.checkpointPlayer(currentRuntime.checkpoint());
    gameSession.beginBattle({ encounterId, opponentId, returnScene: "map" });
    try {
      battlePresenter.present({ encounterId, heroId: state.controlledCharacterId, opponentId });
    } catch (error) {
      try {
        gameSession.abortBattleStart();
      } finally {
        try {
          battlePresenter.resetToMap();
        } finally {
          currentRuntime.setInputLock("battle", false);
        }
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
      }
    }
    return result.presentation;
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
      runner.cancel();
      runtime = null;
    },
    getMapRuntime: () => runtime,
    setBattlePresenter(presenter) {
      assertUsable();
      battlePresenter = presenter;
    },
    checkpointMap() {
      assertUsable();
      gameSession.checkpointPlayer(requireRuntime().checkpoint());
    },
    startActorEvent(entityId) {
      assertUsable();
      const currentRuntime = requireRuntime();
      const actor = currentRuntime.getActor(entityId);
      const definition = resolveEventDefinition(actor.eventId);
      if (eventCanSwitchControlledActor(definition)) {
        currentRuntime.validateControlledCharacterChange(actor.characterId);
      }
      currentRuntime.setInputLock("event", true);
      try {
        return applyResult(
          runner.start(
            actor.eventId,
            { eventTargetEntityId: actor.entityId, eventTargetCharacterId: actor.characterId },
            gameSession.getState().flags,
          ),
        );
      } catch (error) {
        runner.cancel();
        currentRuntime.setInputLock("event", false);
        throw error;
      }
    },
    advanceEvent(choiceId) {
      assertUsable();
      try {
        return applyResult(runner.advance(choiceId ?? null, gameSession.getState().flags));
      } catch (error) {
        runner.cancel();
        runtime?.setInputLock("event", false);
        throw error;
      }
    },
    cancelEvent() {
      assertUsable();
      runner.cancel();
      runtime?.setInputLock("event", false);
    },
    openStatus() {
      assertUsable();
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
      runner.destroy();
      runtime = null;
      battlePresenter = null;
      destroyed = true;
    },
  };
}
