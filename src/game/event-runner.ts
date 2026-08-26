import type { WorldFlagValue } from "./game-session.ts";
import type { CharacterId } from "./types.ts";

export interface EventChoice {
  id: string;
  label: string;
  nextNodeId: string;
}

interface EventNodeBase {
  id: string;
}

export interface SayEventNode extends EventNodeBase {
  type: "say";
  speaker: string;
  speakerId?: CharacterId;
  text: string;
  nextNodeId?: string;
  advanceLabel?: "next" | "close";
}

export interface ChoiceEventNode extends EventNodeBase {
  type: "choice";
  speaker: string;
  speakerId?: CharacterId;
  text: string;
  choices: readonly EventChoice[];
}

export interface BranchEventNode extends EventNodeBase {
  type: "branch";
  flag: string;
  equals: WorldFlagValue;
  thenNodeId: string;
  elseNodeId: string;
}

export interface SetFlagsEventNode extends EventNodeBase {
  type: "setFlags";
  updates: Readonly<Record<string, WorldFlagValue>>;
  nextNodeId: string;
}

export interface FaceEventTargetNode extends EventNodeBase {
  type: "faceEventTarget";
  nextNodeId: string;
}

export interface BattleEventNode extends EventNodeBase {
  type: "battle";
}

export interface SwitchControlledActorEventNode extends EventNodeBase {
  type: "switchControlledActor";
}

export interface EndEventNode extends EventNodeBase {
  type: "end";
}

export type EventNode =
  | SayEventNode
  | ChoiceEventNode
  | BranchEventNode
  | SetFlagsEventNode
  | FaceEventTargetNode
  | BattleEventNode
  | SwitchControlledActorEventNode
  | EndEventNode;

export interface EventDefinition {
  id: string;
  initialNodeId: string;
  nodes: Readonly<Record<string, EventNode>>;
}

export interface EventContext {
  eventTargetEntityId: string;
  eventTargetCharacterId: CharacterId;
}

export type EventCommand =
  | { type: "setFlags"; updates: Readonly<Record<string, WorldFlagValue>> }
  | { type: "faceEventTarget"; entityId: string }
  | { type: "battle"; opponentId: CharacterId }
  | { type: "switchControlledActor"; characterId: CharacterId };

export interface EventPresentation {
  eventId: string;
  nodeId: string;
  speaker: string;
  speakerId: CharacterId | null;
  text: string;
  choices: readonly EventChoice[];
  advanceLabel: "next" | "close";
}

export interface EventRunResult {
  presentation: EventPresentation | null;
  commands: readonly EventCommand[];
  completed: boolean;
}

export interface EventRunner {
  start(eventId: string, context: EventContext, flags: Readonly<Record<string, WorldFlagValue>>): EventRunResult;
  advance(choiceId: string | null, flags: Readonly<Record<string, WorldFlagValue>>): EventRunResult;
  cancel(): EventRunResult;
  isActive(): boolean;
  destroy(): void;
}

interface ActiveEvent {
  definition: EventDefinition;
  context: EventContext;
  nodeId: string;
  awaitingPresentation: boolean;
}

const MAX_COMMAND_STEPS = 1000;

export function eventCanSwitchControlledActor(definition: EventDefinition): boolean {
  const pending = [definition.initialNodeId];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const nodeId = pending.pop();
    if (!nodeId || visited.has(nodeId)) continue;
    visited.add(nodeId);
    const node = definition.nodes[nodeId];
    if (!node) continue;
    switch (node.type) {
      case "switchControlledActor":
        return true;
      case "say":
        if (node.nextNodeId) pending.push(node.nextNodeId);
        break;
      case "choice":
        pending.push(...node.choices.map((choice) => choice.nextNodeId));
        break;
      case "branch":
        pending.push(node.thenNodeId, node.elseNodeId);
        break;
      case "setFlags":
      case "faceEventTarget":
        pending.push(node.nextNodeId);
        break;
      case "battle":
      case "end":
        break;
    }
  }
  return false;
}

export function createEventRunner(resolveDefinition: (eventId: string) => EventDefinition): EventRunner {
  let active: ActiveEvent | null = null;
  let destroyed = false;

  const assertUsable = () => {
    if (destroyed) throw new Error("破棄済みのEventRunnerは利用できません");
  };

  const currentNode = (): EventNode => {
    if (!active) throw new Error("進行中のeventがありません");
    const node = active.definition.nodes[active.nodeId];
    if (!node) throw new Error(`event node ${active.definition.id}:${active.nodeId} が見つかりません`);
    return node;
  };

  const runUntilPresentation = (inputFlags: Readonly<Record<string, WorldFlagValue>>): EventRunResult => {
    if (!active) return { presentation: null, commands: [], completed: true };
    const flags = { ...inputFlags };
    const commands: EventCommand[] = [];

    for (let index = 0; index < MAX_COMMAND_STEPS; index += 1) {
      const node = currentNode();
      switch (node.type) {
        case "say":
        case "choice":
          active.awaitingPresentation = true;
          return {
            presentation: {
              eventId: active.definition.id,
              nodeId: node.id,
              speaker: node.speaker,
              speakerId: node.speakerId ?? null,
              text: node.text,
              choices: node.type === "choice" ? node.choices : [],
              advanceLabel: node.type === "say" ? (node.advanceLabel ?? "next") : "next",
            },
            commands,
            completed: false,
          };
        case "branch":
          active.nodeId = flags[node.flag] === node.equals ? node.thenNodeId : node.elseNodeId;
          break;
        case "setFlags":
          commands.push({ type: "setFlags", updates: node.updates });
          Object.assign(flags, node.updates);
          active.nodeId = node.nextNodeId;
          break;
        case "faceEventTarget":
          commands.push({ type: "faceEventTarget", entityId: active.context.eventTargetEntityId });
          active.nodeId = node.nextNodeId;
          break;
        case "battle":
          commands.push({ type: "battle", opponentId: active.context.eventTargetCharacterId });
          active = null;
          return { presentation: null, commands, completed: true };
        case "switchControlledActor":
          commands.push({ type: "switchControlledActor", characterId: active.context.eventTargetCharacterId });
          active = null;
          return { presentation: null, commands, completed: true };
        case "end":
          active = null;
          return { presentation: null, commands, completed: true };
      }
    }
    throw new Error("eventのcommand-only stepが上限を超えました");
  };

  return {
    start(eventId, context, flags) {
      assertUsable();
      if (active) throw new Error("別のeventが進行中です");
      const definition = resolveDefinition(eventId);
      active = { definition, context: { ...context }, nodeId: definition.initialNodeId, awaitingPresentation: false };
      try {
        return runUntilPresentation(flags);
      } catch (error) {
        active = null;
        throw error;
      }
    },
    advance(choiceId, flags) {
      assertUsable();
      if (!active?.awaitingPresentation) throw new Error("進行できるevent presentationがありません");
      const node = currentNode();
      if (node.type === "say") {
        if (choiceId) throw new Error("say nodeにchoiceIdは指定できません");
        if (!node.nextNodeId) {
          active = null;
          return { presentation: null, commands: [], completed: true };
        }
        active.nodeId = node.nextNodeId;
      } else if (node.type === "choice") {
        const choice = node.choices.find((candidate) => candidate.id === choiceId);
        if (!choice) throw new Error(`event choice ${choiceId ?? ""} が見つかりません`);
        active.nodeId = choice.nextNodeId;
      } else {
        throw new Error("presentation nodeの形式が不正です");
      }
      active.awaitingPresentation = false;
      try {
        return runUntilPresentation(flags);
      } catch (error) {
        active = null;
        throw error;
      }
    },
    cancel() {
      assertUsable();
      active = null;
      return { presentation: null, commands: [], completed: true };
    },
    isActive: () => active !== null,
    destroy() {
      active = null;
      destroyed = true;
    },
  };
}
