import type { WorldFlagValue } from "./game-session.ts";
import type { CharacterId } from "./types.ts";

export interface EventChoice {
  id: string;
  label: string;
  nextNodeId: string;
  requirement?: EventChoiceRequirement;
}

export type EventChoiceRequirement = { type: "canSwitchControlledActor" };

export interface EventPresentationChoice {
  id: string;
  label: string;
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
  canSwitchControlledActor: boolean;
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
  choices: readonly EventPresentationChoice[];
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
        case "choice": {
          const choices =
            node.type === "choice"
              ? node.choices
                  .filter((choice) => isChoiceAvailable(choice, active?.context))
                  .map(({ id, label }) => ({ id, label }))
              : [];
          if (node.type === "choice" && choices.length === 0) {
            throw new Error(`event ${active.definition.id}:${node.id} に現在選択できるchoiceがありません`);
          }
          active.awaitingPresentation = true;
          return {
            presentation: {
              eventId: active.definition.id,
              nodeId: node.id,
              speaker: node.speaker,
              speakerId: node.speakerId ?? null,
              text: node.text,
              choices,
              advanceLabel: node.type === "say" ? (node.advanceLabel ?? "next") : "next",
            },
            commands,
            completed: false,
          };
        }
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
        default:
          return assertNever(node, "未対応のevent nodeです");
      }
    }
    throw new Error(
      `event ${active.definition.id}:${active.nodeId} のcommand-only stepが上限 ${MAX_COMMAND_STEPS} を超えました`,
    );
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
      switch (node.type) {
        case "say":
          if (choiceId) throw new Error("say nodeにchoiceIdは指定できません");
          if (!node.nextNodeId) {
            active = null;
            return { presentation: null, commands: [], completed: true };
          }
          active.nodeId = node.nextNodeId;
          break;
        case "choice": {
          const choice = node.choices.find(
            (candidate) => candidate.id === choiceId && isChoiceAvailable(candidate, active?.context),
          );
          if (!choice) throw new Error(`event choice ${choiceId ?? ""} は存在しないか、現在は選択できません`);
          active.nodeId = choice.nextNodeId;
          break;
        }
        default:
          throw new Error(`presentation nodeの形式が不正です: ${node.type}`);
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

function isChoiceAvailable(choice: EventChoice, context: EventContext | undefined): boolean {
  if (!choice.requirement) return true;
  const handlers = {
    canSwitchControlledActor: () => context?.canSwitchControlledActor === true,
  } satisfies Record<EventChoiceRequirement["type"], () => boolean>;
  return handlers[choice.requirement.type]();
}

function assertNever(value: never, message: string): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
