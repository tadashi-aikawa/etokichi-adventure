import type { MapFacing, MapPosition, WorldFlagValue } from "./game-session.ts";
import type { MapBody, MapMarker, MapRectangle } from "./tiled-map.ts";

export interface DialogueChoice {
  id: string;
  label: string;
  nextNodeId: string;
  flagUpdates?: Record<string, WorldFlagValue>;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  nextNodeId?: string;
  choices?: readonly DialogueChoice[];
  completionFlags?: Record<string, WorldFlagValue>;
}

export interface DialogueDefinition {
  id: string;
  initialNodeId: string;
  repeatNodeId: string;
  completionFlag: string;
  nodes: Readonly<Record<string, DialogueNode>>;
}

export interface DialogueProgress {
  dialogueId: string;
  nodeId: string;
}

export interface DialogueTransition {
  progress: DialogueProgress | null;
  flagUpdates: Record<string, WorldFlagValue>;
}

const PROTOTYPE_GUIDE: DialogueDefinition = {
  id: "prototype-guide",
  initialNodeId: "welcome",
  repeatNodeId: "repeat",
  completionFlag: "talkedToPrototypeGuide",
  nodes: {
    welcome: {
      id: "welcome",
      speaker: "広場のガイド",
      text: "こんにちは、エトキチ！ ここは冒険の操作を試すためのプロトタイプ広場だよ。",
      nextNodeId: "question",
    },
    question: {
      id: "question",
      speaker: "広場のガイド",
      text: "まず何を確かめたい？ 選んだ答えは、この広場の状態として覚えておくよ。",
      choices: [
        {
          id: "interaction",
          label: "話しかけ方を知りたい",
          nextNodeId: "interaction-answer",
          flagUpdates: { prototypeGuideAdvice: "interaction" },
        },
        {
          id: "exploration",
          label: "広場を歩いてみたい",
          nextNodeId: "exploration-answer",
          flagUpdates: { prototypeGuideAdvice: "exploration" },
        },
      ],
    },
    "interaction-answer": {
      id: "interaction-answer",
      speaker: "広場のガイド",
      text: "相手の方を向いて、決定ボタンを押してね。触れただけでは会話は始まらないよ。",
      nextNodeId: "farewell",
    },
    "exploration-answer": {
      id: "exploration-answer",
      speaker: "広場のガイド",
      text: "池や木には当たり判定があるよ。壁へ斜めに進むと、そのまま壁沿いに歩けるはず。",
      nextNodeId: "farewell",
    },
    farewell: {
      id: "farewell",
      speaker: "広場のガイド",
      text: "右下のメニューから、いつでもエトキチのステータスを確認できるよ。",
      completionFlags: { talkedToPrototypeGuide: true },
    },
    repeat: {
      id: "repeat",
      speaker: "広場のガイド",
      text: "また会えたね。さっきの選択もちゃんと覚えているよ。準備ができたら次の冒険へ進もう！",
    },
  },
};

export const DIALOGUE_DEFINITIONS: Readonly<Record<string, DialogueDefinition>> = {
  [PROTOTYPE_GUIDE.id]: PROTOTYPE_GUIDE,
};

export function findFacingNpc(
  player: MapPosition,
  markers: readonly MapMarker[],
  maximumDistance = 104,
  maximumLateralDistance = 56,
): MapMarker | null {
  const forward = facingVector(player.facing);
  return (
    markers
      .filter((marker) => marker.kind === "npc" && typeof marker.properties.dialogueId === "string")
      .map((marker) => {
        const deltaX = marker.x - player.x;
        const deltaY = marker.y - player.y;
        return {
          marker,
          forwardDistance: deltaX * forward.x + deltaY * forward.y,
          lateralDistance: Math.abs(deltaX * forward.y - deltaY * forward.x),
          distance: Math.hypot(deltaX, deltaY),
        };
      })
      .filter(
        ({ forwardDistance, lateralDistance, distance }) =>
          forwardDistance > 0 && distance <= maximumDistance && lateralDistance <= maximumLateralDistance,
      )
      .sort((left, right) => left.distance - right.distance)[0]?.marker ?? null
  );
}

export function createNpcCollisions(markers: readonly MapMarker[], body: MapBody): MapRectangle[] {
  return markers
    .filter((marker) => marker.kind === "npc")
    .map((marker) => ({
      x: marker.x - body.width / 2,
      y: marker.y - body.height / 2,
      width: body.width,
      height: body.height,
    }));
}

export function getFacingToward(origin: MapPosition, target: MapPosition): MapFacing {
  const deltaX = target.x - origin.x;
  const deltaY = target.y - origin.y;
  if (Math.abs(deltaX) > Math.abs(deltaY)) return deltaX < 0 ? "left" : "right";
  return deltaY < 0 ? "up" : "down";
}

export function startDialogue(
  dialogueId: string,
  flags: Readonly<Record<string, WorldFlagValue>>,
): DialogueProgress | null {
  const definition = DIALOGUE_DEFINITIONS[dialogueId];
  if (!definition) return null;
  return {
    dialogueId,
    nodeId: flags[definition.completionFlag] === true ? definition.repeatNodeId : definition.initialNodeId,
  };
}

export function getDialogueNode(progress: DialogueProgress): DialogueNode {
  const node = DIALOGUE_DEFINITIONS[progress.dialogueId]?.nodes[progress.nodeId];
  if (!node) throw new Error(`会話ノード ${progress.dialogueId}:${progress.nodeId} が見つかりません`);
  return node;
}

export function advanceDialogue(progress: DialogueProgress): DialogueTransition {
  const node = getDialogueNode(progress);
  if (node.choices?.length) throw new Error("選択肢がある会話ノードは選択して進めてください");
  return {
    progress: node.nextNodeId ? { ...progress, nodeId: node.nextNodeId } : null,
    flagUpdates: { ...node.completionFlags },
  };
}

export function selectDialogueChoice(progress: DialogueProgress, choiceId: string): DialogueTransition {
  const choice = getDialogueNode(progress).choices?.find((candidate) => candidate.id === choiceId);
  if (!choice) throw new Error(`会話の選択肢 ${choiceId} が見つかりません`);
  return {
    progress: { ...progress, nodeId: choice.nextNodeId },
    flagUpdates: { ...choice.flagUpdates },
  };
}

function facingVector(facing: MapFacing): { x: number; y: number } {
  switch (facing) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
  }
}
