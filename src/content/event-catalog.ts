import type { EventDefinition, EventNode } from "../game/event-runner.ts";
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

interface CharacterConversation {
  opener: string;
  response: string;
}

// 外側を会話相手、内側を操作キャラクターとする。character eventを相手ごとに生成するため、この向きなら定義をそのまま展開できる。
const CHARACTER_CONVERSATIONS: Readonly<
  Record<CharacterId, Readonly<Partial<Record<CharacterId, CharacterConversation>>>>
> = {
  etokichi: {
    kuroboshi: {
      opener: "グルッ、グルルル！",
      response: "わかった！ その『行こう』って声、ちゃんと聞こえたキチ！",
    },
    sutekichi: {
      opener: "エトキチ〜、あっちの星が出発しようって光ってるよ。もう少ししたら行こ〜。",
      response: "ほんとだ！ 星が待ってるなら、すぐ出発するキチ！",
    },
    salarymanEtokichi: {
      opener: "エトキチさん、本日の冒険プランを三案にまとめました。",
      response: "三案とも面白そう！ 順番に全部やってみようよ！",
    },
    tatsuo: {
      opener: "エトキチ、先頭は任せろウホ。危ないものは俺が受け止めるウホ。",
      response: "頼もしいなあ！ じゃあぼくは、一番わくわくする道を選ぶね！",
    },
    aster: {
      opener: "エトキチ。あなたの向かう先に、強い星の瞬きが見えます。",
      response: "強い星？ きっと大冒険のしるしだね！",
    },
  },
  kuroboshi: {
    etokichi: {
      opener: "クロボシ、今日もその角、かっこいいね！ 一緒にひと暴れするキチ！",
      response: "グルルッ！ ワォン！",
    },
    sutekichi: {
      opener: "クロボシの角、三日月みたいで素敵だねぇ。そばでお昼寝してもいい？",
      response: "グル……クゥン。",
    },
    salarymanEtokichi: {
      opener: "クロボシさん、こちらの申請書に肉球印をお願いします。",
      response: "グルルル……ペタッ。",
    },
    tatsuo: {
      opener: "クロボシ、今度こそ正面から力比べだウホ！",
      response: "グォォォン！",
    },
    aster: {
      opener: "クロボシ。その唸りは、闇への警告ですか？",
      response: "……グル。グルルル。",
    },
  },
  sutekichi: {
    etokichi: {
      opener: "ステキチ、その星はどこから来るの？ ぼくにもひとつ見せて！",
      response: "いいよ〜。でも、星を捕まえる前にちょっとお昼寝してもいい？",
    },
    kuroboshi: {
      opener: "グルル……ワフッ！",
      response: "いまの声、流れ星みたいだったねぇ。なんだか眠くなってきた〜。",
    },
    salarymanEtokichi: {
      opener: "ステキチさん、星探しの進捗を共有いただけますか？",
      response: "新しい星を三つ見つけたよ〜。報告は、お昼寝のあとでもいい？",
    },
    tatsuo: {
      opener: "ステキチ、高いところの星なら俺が持ち上げてやるウホ。",
      response: "わあ〜、お願い。肩の上なら、ぽかぽか眠れそうだねぇ。",
    },
    aster: {
      opener: "ステキチ。星々があなたの周りだけ騒がしいですね。",
      response: "あの青い星かなぁ。ゆっくり光ってて、見てると眠くなるよ〜。",
    },
  },
  salarymanEtokichi: {
    etokichi: {
      opener: "サラリーマンエトキチ、仕事が終わったら冒険に行こうよ！",
      response: "では定時まで集中し、終了後すぐ出発できる計画にしましょう。",
    },
    kuroboshi: {
      opener: "グルルル、グワッ！",
      response: "肉球印、確かに受領しました。迅速なご対応ありがとうございます。",
    },
    sutekichi: {
      opener: "ねえ〜、予定表に『お昼寝しながら星を見る時間』も入れてよ〜。",
      response: "承知しました。毎日十五分、予定表に確保しましょう。",
    },
    tatsuo: {
      opener: "サラリーマンエトキチ、無理な仕事は俺にも寄こすウホ。",
      response: "ありがとうございます。ただし、まずは分担と優先順位を整理しましょう。",
    },
    aster: {
      opener: "サラリーマンエトキチ。その計画、三手先で修正が必要です。",
      response: "助かります。修正点を先に伺い、手戻りを防ぎましょう。",
    },
  },
  tatsuo: {
    etokichi: {
      opener: "タツヲ、その腕ならどんな道でも切り開けそうだキチ！",
      response: "任せろウホ。道を塞ぐものは、この腕でまとめてどけてやるウホ！",
    },
    kuroboshi: {
      opener: "グォォン！",
      response: "いい唸りだウホ。俺も遠慮せず、全力で受けて立つウホ！",
    },
    sutekichi: {
      opener: "タツヲの腕に乗ったら、寝たまま星へ近づけるかなぁ？",
      response: "任せろウホ。落ちないよう、しっかりつかまっているウホ。",
    },
    salarymanEtokichi: {
      opener: "タツヲさん、重量物の運搬をお願いしてもよろしいですか？",
      response: "いいともウホ。だが、お前まで潰れそうな仕事は先に減らすウホ。",
    },
    aster: {
      opener: "タツヲ。力だけでは開かない扉もあります。",
      response: "なるほどウホ。なら、お前が示すウホ。俺が道を作るウホ。",
    },
  },
  aster: {
    etokichi: {
      opener: "アステール、星の先に何があるか、一緒に見に行くキチ！",
      response: "勢いだけで星へ届くつもりですか。……嫌いではありません。",
    },
    kuroboshi: {
      opener: "……グルルルル。",
      response: "ええ。その警戒心は正しい。闇もまた、こちらを見ています。",
    },
    sutekichi: {
      opener: "アステール〜、今日いちばんのんびりしてる星はどれ〜？",
      response: "あの赤い星です。騒がしいのは、あなたに似たのでしょう。",
    },
    salarymanEtokichi: {
      opener: "アステールさん、リスク予測のレビューをお願いします。",
      response: "承知しました。最悪の分岐から順に潰しましょう。",
    },
    tatsuo: {
      opener: "アステール、先が見えているなら進む道を教えてくれウホ。",
      response: "では私が鍵を読み、あなたが扉を開く。単純で良いでしょう。",
    },
  },
};

function createCharacterActionEvent(characterId: CharacterId): EventDefinition {
  const speaker = CHARACTER_NAMES[characterId];
  const nodes: Record<string, EventNode> = {
    face: { id: "face", type: "faceEventTarget", nextNodeId: "speaker-route" },
    "speaker-route": {
      id: "speaker-route",
      type: "branchControlledCharacter",
      // 操作中のactorは非表示だが、全CharacterIdを列挙して不正な同一人物eventも決定的に終了させる。
      routes: Object.fromEntries(
        CHARACTER_IDS.map((controlledCharacterId) => [
          controlledCharacterId,
          controlledCharacterId === characterId ? "action" : `opener:${controlledCharacterId}`,
        ]),
      ) as Record<CharacterId, string>,
    },
    action: {
      id: "action",
      type: "choice",
      speaker,
      speakerId: characterId,
      text:
        characterId === "sutekichi"
          ? "ステキチと、なにする〜？"
          : characterId === "tatsuo"
            ? "タツヲにどうするウホ？"
            : `${speaker}にどうする？`,
      choices: [
        { id: "battle", label: "対戦する", nextNodeId: "battle" },
        {
          id: "switch",
          label: "操作を変える",
          nextNodeId: "switch",
          requirement: { type: "canSwitchControlledActor" },
        },
        { id: "cancel", label: "なんでもない", nextNodeId: "end" },
      ],
    },
    battle: { id: "battle", type: "battle" },
    switch: { id: "switch", type: "switchControlledActor" },
    end: { id: "end", type: "end" },
  };
  for (const controlledCharacterId of CHARACTER_IDS) {
    if (controlledCharacterId === characterId) continue;
    const conversation = CHARACTER_CONVERSATIONS[characterId][controlledCharacterId];
    if (!conversation) {
      throw new Error(`${controlledCharacterId}から${characterId}への会話が定義されていません`);
    }
    const openerId = `opener:${controlledCharacterId}`;
    const responseId = `response:${controlledCharacterId}`;
    nodes[openerId] = {
      id: openerId,
      type: "say",
      speaker: CHARACTER_NAMES[controlledCharacterId],
      speakerId: controlledCharacterId,
      text: conversation.opener,
      nextNodeId: responseId,
    };
    nodes[responseId] = {
      id: responseId,
      type: "say",
      speaker,
      speakerId: characterId,
      text: conversation.response,
      nextNodeId: "action",
    };
  }
  return {
    id: `character-action:${characterId}`,
    initialNodeId: "face",
    nodes,
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
        if (node.choices.every((choice) => choice.requirement)) {
          throw new Error(`${definition.id}:${nodeId}には条件なしの選択肢を1つ以上指定してください`);
        }
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
      case "branchControlledCharacter":
        for (const characterId of CHARACTER_IDS) requireNode(node.routes[characterId], `${nodeId}:${characterId}`);
        break;
      case "setFlags":
      case "faceEventTarget":
        requireNode(node.nextNodeId, nodeId);
        break;
      case "battle":
      case "switchControlledActor":
      case "end":
        break;
      default:
        assertNever(node, `${definition.id}:${nodeId}のnode形式が不正です`);
    }
  }
}

function assertNever(value: never, message: string): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
