import { describe, expect, it } from "vitest";
import { EVENT_CATALOG } from "../src/content/event-catalog.ts";
import { createEventRunner } from "../src/game/event-runner.ts";

const context = { eventTargetEntityId: "aster", eventTargetCharacterId: "aster" } as const;

describe("EventRunner", () => {
  it("commandを定義順に返してpresentationまで進む", () => {
    const runner = createEventRunner(() => ({
      id: "ordered",
      initialNodeId: "flags",
      nodes: {
        flags: { id: "flags", type: "setFlags", updates: { route: "star" }, nextNodeId: "branch" },
        branch: {
          id: "branch",
          type: "branch",
          flag: "route",
          equals: "star",
          thenNodeId: "face",
          elseNodeId: "end",
        },
        face: { id: "face", type: "faceEventTarget", nextNodeId: "line" },
        line: { id: "line", type: "say", speaker: "星", text: "到着", advanceLabel: "close" },
        end: { id: "end", type: "end" },
      },
    }));

    const result = runner.start("ordered", context, {});

    expect(result.commands).toEqual([
      { type: "setFlags", updates: { route: "star" } },
      { type: "faceEventTarget", entityId: "aster" },
    ]);
    expect(result.presentation).toMatchObject({ nodeId: "line", text: "到着", advanceLabel: "close" });
  });

  it("choiceから終端のbattle commandへ進みeventを閉じる", () => {
    const runner = createEventRunner((eventId) => EVENT_CATALOG.get(eventId));
    expect(runner.start("character-action:aster", context, {}).presentation?.nodeId).toBe("greeting");
    const action = runner.advance(null, {}).presentation;
    expect(action?.nodeId).toBe("action");
    expect(action?.choices.map((choice) => choice.label)).toEqual(["対戦する", "操作を変える", "なんでもない"]);

    const result = runner.advance("battle", {});

    expect(result).toEqual({
      presentation: null,
      commands: [{ type: "battle", opponentId: "aster" }],
      completed: true,
    });
    expect(runner.isActive()).toBe(false);
  });

  it("cancelと同時eventを制御し、destroy後の操作を拒否する", () => {
    const runner = createEventRunner((eventId) => EVENT_CATALOG.get(eventId));
    runner.start("character-action:aster", context, {});
    expect(() => runner.start("character-action:aster", context, {})).toThrow("別のeventが進行中です");
    expect(runner.cancel().completed).toBe(true);
    expect(runner.isActive()).toBe(false);
    runner.destroy();
    expect(() => runner.start("character-action:aster", context, {})).toThrow("破棄済み");
  });

  it("解決失敗時はactive eventを残さない", () => {
    const runner = createEventRunner(() => ({
      id: "broken",
      initialNodeId: "line",
      nodes: { line: { id: "line", type: "say", speaker: "test", text: "test", nextNodeId: "missing" } },
    }));
    runner.start("broken", context, {});
    expect(() => runner.advance(null, {})).toThrow("見つかりません");
    expect(runner.isActive()).toBe(false);
  });

  it("ガイドfixtureは選択直後と最終ページ後でflag commandを分ける", () => {
    const runner = createEventRunner((eventId) => EVENT_CATALOG.get(eventId));
    expect(runner.start("prototype-guide", context, {}).presentation?.nodeId).toBe("welcome");
    expect(runner.advance(null, {}).presentation?.nodeId).toBe("question");
    const answer = runner.advance("exploration", {});
    expect(answer.commands).toEqual([{ type: "setFlags", updates: { prototypeGuideAdvice: "exploration" } }]);
    expect(answer.presentation?.nodeId).toBe("exploration-answer");
    expect(runner.advance(null, { prototypeGuideAdvice: "exploration" }).presentation?.nodeId).toBe("farewell");
    expect(runner.advance(null, { prototypeGuideAdvice: "exploration" }).commands).toEqual([
      { type: "setFlags", updates: { talkedToPrototypeGuide: true } },
    ]);
  });

  it("cancelは適用済みflagを戻すcommandを発行しない", () => {
    const runner = createEventRunner((eventId) => EVENT_CATALOG.get(eventId));
    runner.start("prototype-guide", context, {});
    runner.advance(null, {});
    const answer = runner.advance("interaction", {});
    expect(answer.commands).toHaveLength(1);
    expect(runner.cancel()).toEqual({ presentation: null, commands: [], completed: true });
  });
});
