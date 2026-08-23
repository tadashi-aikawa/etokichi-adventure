import { describe, expect, it } from "vitest";
import type { MapPosition } from "../src/game/game-session.ts";
import {
  advanceDialogue,
  findFacingNpc,
  getDialogueNode,
  selectDialogueChoice,
  startDialogue,
} from "../src/game/map-interaction.ts";
import type { MapMarker } from "../src/game/tiled-map.ts";

const player: MapPosition = { mapId: "test", x: 100, y: 100, facing: "up" };
const markers: MapMarker[] = [
  {
    id: 1,
    name: "front",
    kind: "npc",
    x: 104,
    y: 30,
    width: 0,
    height: 0,
    properties: { dialogueId: "prototype-guide" },
  },
  {
    id: 2,
    name: "behind",
    kind: "npc",
    x: 100,
    y: 150,
    width: 0,
    height: 0,
    properties: { dialogueId: "prototype-guide" },
  },
  {
    id: 3,
    name: "side",
    kind: "npc",
    x: 180,
    y: 70,
    width: 0,
    height: 0,
    properties: { dialogueId: "prototype-guide" },
  },
];

describe("マップ会話", () => {
  it("プレイヤー正面の範囲内にいるNPCだけを会話対象にする", () => {
    expect(findFacingNpc(player, markers)?.name).toBe("front");
    expect(findFacingNpc({ ...player, facing: "down" }, markers)?.name).toBe("behind");
    expect(findFacingNpc({ ...player, x: 300 }, markers)).toBeNull();
  });

  it("複数ページを進め、選択結果と完了フラグを返す", () => {
    let progress = startDialogue("prototype-guide", {});
    expect(progress).not.toBeNull();
    if (!progress) throw new Error("会話を開始できませんでした");
    expect(getDialogueNode(progress).id).toBe("welcome");

    progress = advanceDialogue(progress).progress;
    expect(progress).not.toBeNull();
    if (!progress) throw new Error("選択ページへ進めませんでした");
    const choice = selectDialogueChoice(progress, "exploration");
    expect(choice.flagUpdates).toEqual({ prototypeGuideAdvice: "exploration" });
    expect(choice.progress?.nodeId).toBe("exploration-answer");
    if (!choice.progress) throw new Error("選択結果の会話へ進めませんでした");

    const farewell = advanceDialogue(choice.progress);
    expect(farewell.progress?.nodeId).toBe("farewell");
    if (!farewell.progress) throw new Error("最後の会話へ進めませんでした");
    expect(advanceDialogue(farewell.progress)).toEqual({
      progress: null,
      flagUpdates: { talkedToPrototypeGuide: true },
    });
  });

  it("完了フラグがあれば二度目専用の会話から始める", () => {
    const progress = startDialogue("prototype-guide", { talkedToPrototypeGuide: true });
    expect(progress?.nodeId).toBe("repeat");
    if (!progress) throw new Error("二度目の会話を開始できませんでした");
    expect(getDialogueNode(progress).text).toContain("覚えている");
  });

  it("未知の会話IDや選択肢を拒否する", () => {
    expect(startDialogue("unknown", {})).toBeNull();
    const progress = startDialogue("prototype-guide", {});
    if (!progress) throw new Error("会話を開始できませんでした");
    expect(() => selectDialogueChoice(progress, "unknown")).toThrow("会話の選択肢");
  });
});
