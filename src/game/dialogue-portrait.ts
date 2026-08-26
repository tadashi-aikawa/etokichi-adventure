export type DialoguePortraitSide = "self" | "other";

export function shouldMirrorDialoguePortrait(baseFacing: "left" | "right", side: DialoguePortraitSide): boolean {
  const targetFacing = side === "self" ? "right" : "left";
  return baseFacing !== targetFacing;
}
