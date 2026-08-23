import type { MapFacing } from "./game-session.ts";

export const MAP_CHARACTER_COLUMNS = 3;
export const MAP_CHARACTER_ROWS = 4;
export const MAP_WALK_FRAME_DURATION = 0.14;

const FACING_ROW: Record<MapFacing, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};
const WALK_COLUMNS = [0, 1, 2, 1] as const;

export function getMapCharacterFrame(facing: MapFacing, elapsedSeconds: number, moving: boolean): number {
  const row = FACING_ROW[facing];
  const column = moving
    ? (WALK_COLUMNS[Math.floor(Math.max(0, elapsedSeconds) / MAP_WALK_FRAME_DURATION) % WALK_COLUMNS.length] ?? 1)
    : 1;
  return row * MAP_CHARACTER_COLUMNS + column;
}
