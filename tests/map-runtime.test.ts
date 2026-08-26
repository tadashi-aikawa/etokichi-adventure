import { describe, expect, it } from "vitest";
import { createMapRuntime } from "../src/game/map-runtime.ts";
import { createMap, createRuntime } from "./fixtures/map.ts";

describe("MapRuntime", () => {
  it("高頻度の位置・向きと可視actorをWorldStateから独立して更新する", () => {
    const runtime = createMapRuntime({
      map: createMap(),
      initialPlayer: { mapId: "test-map", x: 100, y: 100, facing: "right" },
      controlledCharacterId: "etokichi",
      resolveEventId: (eventId) => {
        if (!eventId.startsWith("character-action:")) throw new Error("unknown event");
      },
    });

    expect(runtime.findFacingActor()).toMatchObject({ entityId: "aster-home", characterId: "aster" });
    runtime.movePlayer({ x: 20, y: 0 }, "right");
    runtime.faceActor("aster-home");

    expect(runtime.checkpoint()).toEqual({ mapId: "test-map", x: 120, y: 100, facing: "right" });
    expect(runtime.getActor("aster-home").facing).toBe("left");
  });

  it("reason別の入力ロック中は移動せず、解除したreasonだけを取り除く", () => {
    const runtime = createRuntime();
    runtime.setInputLock("event", true);
    runtime.setInputLock("status", true);
    runtime.movePlayer({ x: 20, y: 0 }, "right");

    expect(runtime.checkpoint().x).toBe(100);
    expect(runtime.setInputLock("event", false)).toMatchObject({ inputLocked: true, lockReasons: ["status"] });
    expect(runtime.setInputLock("status", false).inputLocked).toBe(false);
  });

  it("操作キャラクターの表示と衝突対象を一度に入れ替える", () => {
    const runtime = createRuntime();
    runtime.validateControlledCharacterChange("aster");

    const snapshot = runtime.setControlledCharacter("aster");

    expect(snapshot.controlledCharacterId).toBe("aster");
    expect(snapshot.actors.find((actor) => actor.characterId === "aster")?.visible).toBe(false);
    expect(snapshot.actors.find((actor) => actor.characterId === "etokichi")?.visible).toBe(true);
    expect(() => runtime.setControlledCharacter("aster")).toThrow("すでに操作中");
  });

  it("actorとlockの不変スナップショットを変更時だけ作り直す", () => {
    const runtime = createRuntime();
    const initial = runtime.getSnapshot();

    const moved = runtime.movePlayer({ x: 10, y: 0 }, "right");
    expect(moved.version).toBeGreaterThan(initial.version);
    expect(moved.actorVersion).toBe(initial.actorVersion);
    expect(moved.actors).toBe(initial.actors);

    const faced = runtime.faceActor("aster-home");
    expect(faced.actorVersion).toBeGreaterThan(moved.actorVersion);
    expect(faced.actors).not.toBe(moved.actors);

    const locked = runtime.setInputLock("status", true);
    expect(locked.version).toBeGreaterThan(faced.version);
    expect(locked.actors).toBe(faced.actors);
    expect(runtime.clearInputLocks()).toMatchObject({ inputLocked: false, lockReasons: [] });
  });

  it("不正なactor参照と破棄後の更新を拒否する", () => {
    const map = createMap();
    const firstActor = map.markers[0];
    if (!firstActor) throw new Error("actor fixtureがありません");
    firstActor.properties.eventId = "unknown";
    expect(() =>
      createMapRuntime({
        map,
        initialPlayer: { mapId: "test-map", x: 100, y: 100, facing: "right" },
        controlledCharacterId: "etokichi",
        resolveEventId: () => {
          throw new Error("unknown event");
        },
      }),
    ).toThrow("unknown event");

    const runtime = createRuntime();
    runtime.destroy();
    expect(() => runtime.movePlayer({ x: 1, y: 0 }, "right")).toThrow("破棄済み");
  });

  it.each([
    ["entityId", "", "entityIdが不正"],
    ["characterId", "unknown", "characterIdが不正"],
    ["behaviorId", "walk", "behaviorId walk は未対応"],
  ])("不正な%sをロード時に拒否する", (property, value, message) => {
    const map = createMap();
    const firstActor = map.markers[0];
    if (!firstActor) throw new Error("actor fixtureがありません");
    firstActor.properties[property] = value;
    expect(() =>
      createMapRuntime({
        map,
        initialPlayer: { mapId: "test-map", x: 100, y: 100, facing: "right" },
        controlledCharacterId: "etokichi",
        resolveEventId: () => {},
      }),
    ).toThrow(message);
  });

  it("重複entityIdをロード時に拒否する", () => {
    const map = createMap();
    const firstActor = map.markers[0];
    const secondActor = map.markers[1];
    if (!firstActor || !secondActor) throw new Error("actor fixtureが不足しています");
    secondActor.properties.entityId = firstActor.properties.entityId ?? "";
    expect(() =>
      createMapRuntime({
        map,
        initialPlayer: { mapId: "test-map", x: 100, y: 100, facing: "right" },
        controlledCharacterId: "etokichi",
        resolveEventId: () => {},
      }),
    ).toThrow("マップ内で重複");
  });
});
