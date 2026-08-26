import { describe, expect, it, vi } from "vitest";
import { EVENT_CATALOG } from "../src/content/event-catalog.ts";
import { createGameController } from "../src/game/game-controller.ts";
import { createGameSession, createInitialWorldState } from "../src/game/game-session.ts";
import { createMapRuntime } from "../src/game/map-runtime.ts";
import { createMap, createRuntime } from "./fixtures/map.ts";

function setup() {
  const initial = createInitialWorldState({ mapId: "test-map", x: 100, y: 100, facing: "right" });
  initial.scene = "map";
  const session = createGameSession(initial);
  const runtime = createRuntime();
  const controller = createGameController(session, (eventId) => EVENT_CATALOG.get(eventId));
  controller.attachMapRuntime(runtime);
  return { session, runtime, controller };
}

function advanceToAction(controller: ReturnType<typeof setup>["controller"]) {
  controller.advanceEvent();
  return controller.advanceEvent();
}

describe("GameController", () => {
  it("操作キャラクターのruntime更新後にWorldStateをpublishする", () => {
    const { session, runtime, controller } = setup();
    const observedRuntimeIds: string[] = [];
    session.subscribe(() => observedRuntimeIds.push(runtime.getSnapshot().controlledCharacterId));

    controller.startActorEvent("aster-home");
    advanceToAction(controller);
    expect(controller.advanceEvent("switch")).toBeNull();

    expect(session.getState().controlledCharacterId).toBe("aster");
    expect(observedRuntimeIds).toEqual(["aster"]);
    expect(runtime.getSnapshot()).toMatchObject({ controlledCharacterId: "aster", inputLocked: false });
  });

  it("WorldStateの操作変更に失敗したらMapRuntimeも元へ戻す", () => {
    const { session, runtime, controller } = setup();
    vi.spyOn(session, "swapControlledCharacter").mockImplementation(() => {
      throw new Error("swap failed");
    });
    controller.startActorEvent("aster-home");
    advanceToAction(controller);

    expect(() => controller.advanceEvent("switch")).toThrow("swap failed");
    expect(session.getState().controlledCharacterId).toBe("etokichi");
    expect(runtime.getSnapshot()).toMatchObject({ controlledCharacterId: "etokichi", inputLocked: false });
  });

  it("battle直前に位置をcheckpointし、型付きpresenterを呼ぶ", () => {
    const { session, runtime, controller } = setup();
    const presenter = { present: vi.fn(), resetToMap: vi.fn() };
    controller.setBattlePresenter(presenter);
    runtime.movePlayer({ x: 25, y: 0 }, "right");

    controller.startActorEvent("aster-home");
    advanceToAction(controller);
    controller.advanceEvent("battle");

    expect(session.getState()).toMatchObject({
      scene: "battle",
      player: { mapId: "test-map", x: 125, y: 100, facing: "right" },
      activeBattle: { heroId: "etokichi", opponentId: "aster", returnScene: "map" },
    });
    expect(presenter.present).toHaveBeenCalledWith({
      encounterId: "test-map:etokichi-vs-aster",
      heroId: "etokichi",
      opponentId: "aster",
    });
    expect(runtime.getSnapshot().lockReasons).toContain("battle");
  });

  it("checkpoint、beginBattle、presentの順序を固定する", () => {
    const { session, controller } = setup();
    const calls: string[] = [];
    const checkpointPlayer = session.checkpointPlayer;
    const beginBattle = session.beginBattle;
    vi.spyOn(session, "checkpointPlayer").mockImplementation((position) => {
      calls.push("checkpoint");
      return checkpointPlayer(position);
    });
    vi.spyOn(session, "beginBattle").mockImplementation((request) => {
      calls.push("beginBattle");
      return beginBattle(request);
    });
    controller.setBattlePresenter({
      present() {
        calls.push("present");
      },
      resetToMap() {},
    });
    controller.startActorEvent("aster-home");
    advanceToAction(controller);
    controller.advanceEvent("battle");

    expect(calls).toEqual(["checkpoint", "beginBattle", "present"]);
  });

  it("Presenter未登録時はbattle状態へ変更せずeventを終了する", () => {
    const { session, runtime, controller } = setup();
    controller.startActorEvent("aster-home");
    advanceToAction(controller);

    expect(() => controller.advanceEvent("battle")).toThrow("BattlePresenterが登録されていません");
    expect(session.getState()).toMatchObject({ scene: "map", activeBattle: null });
    expect(runtime.getSnapshot()).toMatchObject({ inputLocked: false, lockReasons: [] });
  });

  it("battle表示失敗時はsession・表示・入力ロックをmapへ復旧する", () => {
    const { session, runtime, controller } = setup();
    const resetToMap = vi.fn();
    controller.setBattlePresenter({
      present() {
        throw new Error("presentation failed");
      },
      resetToMap,
    });
    controller.startActorEvent("aster-home");
    advanceToAction(controller);

    expect(() => controller.advanceEvent("battle")).toThrow("presentation failed");
    expect(session.getState()).toMatchObject({ scene: "map", activeBattle: null });
    expect(resetToMap).toHaveBeenCalledOnce();
    expect(runtime.getSnapshot()).toMatchObject({ inputLocked: false, lockReasons: [] });
  });

  it("battle状態の開始前に失敗してもbattle lockを残さない", () => {
    const { session, runtime, controller } = setup();
    controller.setBattlePresenter({ present: vi.fn(), resetToMap: vi.fn() });
    vi.spyOn(session, "beginBattle").mockImplementation(() => {
      throw new Error("begin failed");
    });
    controller.startActorEvent("aster-home");
    advanceToAction(controller);

    expect(() => controller.advanceEvent("battle")).toThrow("begin failed");
    expect(session.getState()).toMatchObject({ scene: "map", activeBattle: null });
    expect(runtime.getSnapshot()).toMatchObject({ inputLocked: false, lockReasons: [] });
  });

  it("cancelとstatus closeは対応するlockだけを解除する", () => {
    const { runtime, controller } = setup();
    controller.startActorEvent("aster-home");
    controller.openStatus();
    controller.cancelEvent();
    expect(runtime.getSnapshot()).toMatchObject({ inputLocked: true, lockReasons: ["status"] });
    controller.closeStatus();
    expect(runtime.getSnapshot().inputLocked).toBe(false);
  });

  it("現操作actorがないマップでも会話・対戦を許可し、操作変更だけを隠す", () => {
    const initial = createInitialWorldState({ mapId: "test-map", x: 100, y: 100, facing: "right" });
    initial.scene = "map";
    const session = createGameSession(initial);
    const map = createMap();
    map.markers = map.markers.filter((marker) => marker.properties.characterId !== "etokichi");
    const runtime = createMapRuntime({
      map,
      initialPlayer: initial.player,
      controlledCharacterId: "etokichi",
      resolveEventId: (eventId) => EVENT_CATALOG.get(eventId),
    });
    const controller = createGameController(session, (eventId) => EVENT_CATALOG.get(eventId));
    controller.attachMapRuntime(runtime);

    expect(controller.startActorEvent("aster-home")).toMatchObject({
      speakerId: "etokichi",
      nodeId: "opener:etokichi",
    });
    expect(controller.advanceEvent()).toMatchObject({ speakerId: "aster", nodeId: "response:etokichi" });
    const action = controller.advanceEvent();
    expect(action?.choices.map((choice) => choice.label)).toEqual(["対戦する", "なんでもない"]);
    controller.cancelEvent();
    expect(runtime.getSnapshot()).toMatchObject({ inputLocked: false, lockReasons: [] });
  });

  it("detachとserializeがruntime位置をcheckpointし、lockと参照を残さない", () => {
    const { session, runtime, controller } = setup();
    runtime.movePlayer({ x: 25, y: 0 }, "right");

    expect(JSON.parse(controller.serialize()).player).toMatchObject({ x: 125, y: 100 });
    runtime.movePlayer({ x: 10, y: 0 }, "right");
    runtime.setInputLock("event", true);
    controller.detachMapRuntime(runtime);

    expect(session.getState().player).toMatchObject({ x: 135, y: 100 });
    expect(runtime.getSnapshot()).toMatchObject({ inputLocked: false, lockReasons: [] });
    expect(controller.getMapSnapshot()).toBeNull();
  });

  it("runtimeのcheckpoint失敗時もControllerを確実に破棄する", () => {
    const { runtime, controller } = setup();
    runtime.destroy();

    expect(() => controller.destroy()).toThrow("破棄済みのMapRuntime");
    expect(() => controller.getMapSnapshot()).toThrow("破棄済みのGameController");
  });

  it("detach後のevent進行はruntime参照エラーで元の原因を隠さない", () => {
    const { runtime, controller } = setup();
    controller.startActorEvent("aster-home");
    controller.detachMapRuntime(runtime);

    expect(() => controller.advanceEvent()).toThrow("進行できるevent presentationがありません");
  });
});
