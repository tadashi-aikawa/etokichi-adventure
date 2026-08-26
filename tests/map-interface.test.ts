import { describe, expect, it } from "vitest";
import { shouldMirrorDialoguePortrait } from "../src/game/dialogue-portrait.ts";

describe("マップ会話の立ち絵", () => {
  it.each([
    ["right", "self", false],
    ["right", "other", true],
    ["left", "self", true],
    ["left", "other", false],
  ] as const)("元が%s向きで%s側へ出す場合の反転は%s", (baseFacing, side, expected) => {
    expect(shouldMirrorDialoguePortrait(baseFacing, side)).toBe(expected);
  });
});
