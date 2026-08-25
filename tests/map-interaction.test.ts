import { describe, expect, it } from "vitest";
import type { MapPosition } from "../src/game/game-session.ts";
import {
  advanceDialogue,
  createCharacterHomeMarkers,
  createNpcCollisions,
  findFacingNpc,
  getCharacterGreeting,
  getFacingToward,
  getDialogueNode,
  getDialogueSpeakerId,
  getVisibleCharacterHomeMarkers,
  selectDialogueChoice,
  startDialogue,
} from "../src/game/map-interaction.ts";
import type { MapMarker } from "../src/game/tiled-map.ts";
import { CHARACTER_IDS } from "../src/game/types.ts";

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
  it("全メインキャラクターに本題前の導入があり、クロボシは鳴き声だけで応じる", () => {
    expect(
      CHARACTER_IDS.map((characterId) => getCharacterGreeting(characterId).length).every((length) => length > 0),
    ).toBe(true);
    expect(getCharacterGreeting("kuroboshi")).toBe("グルルル……！");
  });

  it("会話ノードの話者IDを立ち絵選択用に返す", () => {
    expect(getDialogueSpeakerId({ id: "line", speaker: "エトキチ", speakerId: "etokichi", text: "行こう！" })).toBe(
      "etokichi",
    );
    expect(getDialogueSpeakerId({ id: "narration", speaker: "広場のガイド", text: "説明するよ。" })).toBeNull();
  });

  it("操作中キャラクター以外のホーム地点をNPCとして返す", () => {
    const homes = CHARACTER_IDS.map(
      (characterId, index): MapMarker => ({
        id: index + 10,
        name: characterId,
        kind: "npc",
        x: 100 + index * 80,
        y: 200,
        width: 0,
        height: 0,
        properties: { characterId, dialogueId: "prototype-guide" },
      }),
    );
    const homeMarkers = createCharacterHomeMarkers(homes);

    expect(getVisibleCharacterHomeMarkers(homeMarkers, "sutekichi").map((marker) => marker.name)).toEqual(
      CHARACTER_IDS.filter((characterId) => characterId !== "sutekichi"),
    );
    expect(() => createCharacterHomeMarkers(homes.slice(1))).toThrow("etokichiのホーム地点がありません");
    const etokichiHome = homes[0];
    if (!etokichiHome) throw new Error("エトキチのテスト用ホーム地点がありません");
    expect(() =>
      createCharacterHomeMarkers([...homes, { ...etokichiHome, id: 99, name: "duplicate-etokichi" }]),
    ).toThrow("etokichiのホーム地点が重複しています");
  });

  it("プレイヤー正面の範囲内にいるNPCだけを会話対象にする", () => {
    expect(findFacingNpc(player, markers)?.name).toBe("front");
    expect(findFacingNpc({ ...player, facing: "down" }, markers)?.name).toBe("behind");
    expect(findFacingNpc({ ...player, x: 300 }, markers)).toBeNull();
  });

  it("NPCの中心座標からキャラクター同士の衝突矩形を作る", () => {
    expect(createNpcCollisions(markers, { width: 46, height: 40, offsetY: 20 })).toEqual([
      { x: 81, y: 30, width: 46, height: 40 },
      { x: 77, y: 150, width: 46, height: 40 },
      { x: 157, y: 70, width: 46, height: 40 },
    ]);
  });

  it("NPCから見てプレイヤーがいる方向を優勢な軸で求める", () => {
    const npc = { ...player, x: 100, y: 100 };
    expect(getFacingToward(npc, { ...player, x: 160, y: 110 })).toBe("right");
    expect(getFacingToward(npc, { ...player, x: 40, y: 90 })).toBe("left");
    expect(getFacingToward(npc, { ...player, x: 110, y: 40 })).toBe("up");
    expect(getFacingToward(npc, { ...player, x: 90, y: 160 })).toBe("down");
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
