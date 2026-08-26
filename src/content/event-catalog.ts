import type { EventDefinition } from "../game/event-runner.ts";
import { CHARACTER_IDS, type CharacterId } from "../game/types.ts";

export interface EventCatalog {
  get(eventId: string): EventDefinition;
  has(eventId: string): boolean;
}

export function createEventCatalog(definitions: readonly EventDefinition[]): EventCatalog {
  const entries = new Map<string, EventDefinition>();
  for (const definition of definitions) {
    if (!definition.id) throw new Error("event catalogのIDが空です");
    if (entries.has(definition.id)) throw new Error(`event catalogのID ${definition.id} が重複しています`);
    if (!definition.nodes[definition.initialNodeId]) {
      throw new Error(`${definition.id}の初期node ${definition.initialNodeId} が見つかりません`);
    }
    validateEventDefinition(definition);
    entries.set(definition.id, definition);
  }
  return {
    get(eventId) {
      const definition = entries.get(eventId);
      if (!definition) throw new Error(`eventId ${eventId} はcatalogに登録されていません`);
      return definition;
    },
    has: (eventId) => entries.has(eventId),
  };
}

const CHARACTER_NAMES: Readonly<Record<CharacterId, string>> = {
  etokichi: "エトキチ",
  kuroboshi: "クロボシ",
  sutekichi: "ステキチ",
  salarymanEtokichi: "サラリーマンエトキチ",
  tatsuo: "タツヲ",
  aster: "アステール",
};

const CHARACTER_GREETINGS: Readonly<Record<CharacterId, string>> = {
  etokichi: "やあ！ きみも冒険の予感を感じた？ 今日は何をして遊ぼうか！",
  kuroboshi: "グルルル……！",
  sutekichi: "星がきらきら騒いでるよ。今日は何か、面白いことが起こりそう！",
  salarymanEtokichi: "お疲れさまです。今日の予定を確認したら、さっそく取りかかりましょう。",
  tatsuo: "来たな。困りごとなら、この大きな腕に任せてくれ。",
  aster: "来ましたね。星の巡りは、すでに読み終えています。",
};

function createCharacterActionEvent(characterId: CharacterId): EventDefinition {
  const speaker = CHARACTER_NAMES[characterId];
  return {
    id: `character-action:${characterId}`,
    initialNodeId: "face",
    nodes: {
      face: { id: "face", type: "faceEventTarget", nextNodeId: "greeting" },
      greeting: {
        id: "greeting",
        type: "say",
        speaker,
        speakerId: characterId,
        text: CHARACTER_GREETINGS[characterId],
        nextNodeId: "action",
      },
      action: {
        id: "action",
        type: "choice",
        speaker,
        speakerId: characterId,
        text: `${speaker}にどうする？`,
        choices: [
          { id: "battle", label: "対戦する", nextNodeId: "battle" },
          { id: "switch", label: "操作を変える", nextNodeId: "switch" },
          { id: "cancel", label: "なんでもない", nextNodeId: "end" },
        ],
      },
      battle: { id: "battle", type: "battle" },
      switch: { id: "switch", type: "switchControlledActor" },
      end: { id: "end", type: "end" },
    },
  };
}

// 現在の広場には配置していない。分岐・複数flag更新・再訪をUIなしで検証するfixtureとして残す。
export const PROTOTYPE_GUIDE_EVENT: EventDefinition = {
  id: "prototype-guide",
  initialNodeId: "visited",
  nodes: {
    visited: {
      id: "visited",
      type: "branch",
      flag: "talkedToPrototypeGuide",
      equals: true,
      thenNodeId: "repeat",
      elseNodeId: "welcome",
    },
    welcome: {
      id: "welcome",
      type: "say",
      speaker: "広場のガイド",
      text: "こんにちは、エトキチ！ ここは冒険の操作を試すためのプロトタイプ広場だよ。",
      nextNodeId: "question",
    },
    question: {
      id: "question",
      type: "choice",
      speaker: "広場のガイド",
      text: "まず何を確かめたい？ 選んだ答えは、この広場の状態として覚えておくよ。",
      choices: [
        { id: "interaction", label: "話しかけ方を知りたい", nextNodeId: "remember-interaction" },
        { id: "exploration", label: "広場を歩いてみたい", nextNodeId: "remember-exploration" },
      ],
    },
    "remember-interaction": {
      id: "remember-interaction",
      type: "setFlags",
      updates: { prototypeGuideAdvice: "interaction" },
      nextNodeId: "interaction-answer",
    },
    "remember-exploration": {
      id: "remember-exploration",
      type: "setFlags",
      updates: { prototypeGuideAdvice: "exploration" },
      nextNodeId: "exploration-answer",
    },
    "interaction-answer": {
      id: "interaction-answer",
      type: "say",
      speaker: "広場のガイド",
      text: "相手の方を向いて、決定ボタンを押してね。触れただけでは会話は始まらないよ。",
      nextNodeId: "farewell",
    },
    "exploration-answer": {
      id: "exploration-answer",
      type: "say",
      speaker: "広場のガイド",
      text: "池や木には当たり判定があるよ。壁へ斜めに進むと、そのまま壁沿いに歩けるはず。",
      nextNodeId: "farewell",
    },
    farewell: {
      id: "farewell",
      type: "say",
      speaker: "広場のガイド",
      text: "右下のメニューから、いつでもエトキチのステータスを確認できるよ。",
      nextNodeId: "complete",
      advanceLabel: "close",
    },
    complete: {
      id: "complete",
      type: "setFlags",
      updates: { talkedToPrototypeGuide: true },
      nextNodeId: "end",
    },
    repeat: {
      id: "repeat",
      type: "say",
      speaker: "広場のガイド",
      text: "また会えたね。さっきの選択もちゃんと覚えているよ。準備ができたら次の冒険へ進もう！",
      advanceLabel: "close",
    },
    end: { id: "end", type: "end" },
  },
};

export const EVENT_CATALOG = createEventCatalog([
  ...CHARACTER_IDS.map(createCharacterActionEvent),
  PROTOTYPE_GUIDE_EVENT,
]);

function validateEventDefinition(definition: EventDefinition): void {
  const requireNode = (nodeId: string, source: string) => {
    if (!definition.nodes[nodeId]) throw new Error(`${definition.id}:${source}の遷移先 ${nodeId} が見つかりません`);
  };
  for (const [nodeId, node] of Object.entries(definition.nodes)) {
    if (node.id !== nodeId) throw new Error(`${definition.id}のnode key ${nodeId} とnode.idが一致しません`);
    switch (node.type) {
      case "say":
        if (node.nextNodeId) requireNode(node.nextNodeId, nodeId);
        break;
      case "choice": {
        const choiceIds = new Set<string>();
        if (node.choices.length === 0) throw new Error(`${definition.id}:${nodeId}の選択肢が空です`);
        for (const choice of node.choices) {
          if (!choice.id || choiceIds.has(choice.id))
            throw new Error(`${definition.id}:${nodeId}のchoice IDが不正です`);
          choiceIds.add(choice.id);
          requireNode(choice.nextNodeId, `${nodeId}:${choice.id}`);
        }
        break;
      }
      case "branch":
        requireNode(node.thenNodeId, nodeId);
        requireNode(node.elseNodeId, nodeId);
        break;
      case "setFlags":
      case "faceEventTarget":
        requireNode(node.nextNodeId, nodeId);
        break;
      case "battle":
      case "switchControlledActor":
      case "end":
        break;
    }
  }
}
