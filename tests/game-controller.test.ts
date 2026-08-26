import { describe, expect, it, vi } from "vitest";
import { EVENT_CATALOG } from "../src/content/event-catalog.ts";
import { createGameController } from "../src/game/game-controller.ts";
import { createGameSession, createInitialWorldState } from "../src/game/game-session.ts";
import { createMapRuntime } from "../src/game/map-runtime.ts";
import { createMap, createRuntime } from "./fixtures/map.ts";

function setup() {
  const initial = createInitialWorldState();
  initial.scene = "map";
  initial.player = { mapId: "test-map", x: 100, y: 100, facing: "right" };
  const session = createGameSession(initial);
  const runtime = createRuntime();
  const controller = createGameController(session, (eventId) => EVENT_CATALOG.get(eventId));
  controller.attachMapRuntime(runtime);
  return { session, runtime, controller };
}

describe("GameController", () => {
  it("操作キャラクターのruntime更新後にWorldStateをpublishする", () => {
    const { session, runtime, controller } = setup();
    const observedRuntimeIds: string[] = [];
    session.subscribe(() => observedRuntimeIds.push(runtime.getSnapshot().controlledCharacterId));

    controller.startActorEvent("aster-home");
    controller.advanceEvent();
    expect(controller.advanceEvent("switch")).toBeNull();

    expect(session.getState().controlledCharacterId).toBe("aster");
    expect(observedRuntimeIds).toEqual(["aster"]);
    expect(runtime.getSnapshot()).toMatchObject({ controlledCharacterId: "aster", inputLocked: false });
  });

  it("battle直前に位置をcheckpointし、型付きpresenterを呼ぶ", () => {
    const { session, runtime, controller } = setup();
    const presenter = { present: vi.fn(), resetToMap: vi.fn() };
    controller.setBattlePresenter(presenter);
    runtime.movePlayer({ x: 25, y: 0 }, "right");

    controller.startActorEvent("aster-home");
    controller.advanceEvent();
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
    controller.advanceEvent();
    controller.advanceEvent("battle");

    expect(calls).toEqual(["checkpoint", "beginBattle", "present"]);
  });

  it("Presenter未登録時はbattle状態へ変更せずeventを終了する", () => {
    const { session, runtime, controller } = setup();
    controller.startActorEvent("aster-home");
    controller.advanceEvent();

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
    controller.advanceEvent();

    expect(() => controller.advanceEvent("battle")).toThrow("presentation failed");
    expect(session.getState()).toMatchObject({ scene: "map", activeBattle: null });
    expect(resetToMap).toHaveBeenCalledOnce();
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

  it("操作変更に必要な現操作actorがない場合はevent開始前に拒否する", () => {
    const initial = createInitialWorldState();
    initial.scene = "map";
    initial.player = { mapId: "test-map", x: 100, y: 100, facing: "right" };
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

    expect(() => controller.startActorEvent("aster-home")).toThrow("etokichiのactorが現在のマップに存在しません");
    expect(runtime.getSnapshot()).toMatchObject({ inputLocked: false, lockReasons: [] });
  });
});
