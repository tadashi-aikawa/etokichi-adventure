import type { MapFacing, MapPosition } from "./game-session.ts";
import type { MapBody, MapPoint, MapRectangle } from "./tiled-map.ts";

export function findFacingTarget<T extends MapPoint>(
  player: MapPosition,
  targets: readonly T[],
  maximumDistance = 104,
  maximumLateralDistance = 56,
): T | null {
  const forward = facingVector(player.facing);
  return (
    targets
      .map((target) => {
        const deltaX = target.x - player.x;
        const deltaY = target.y - player.y;
        return {
          target,
          forwardDistance: deltaX * forward.x + deltaY * forward.y,
          lateralDistance: Math.abs(deltaX * forward.y - deltaY * forward.x),
          distance: Math.hypot(deltaX, deltaY),
        };
      })
      .filter(
        ({ forwardDistance, lateralDistance, distance }) =>
          forwardDistance > 0 && distance <= maximumDistance && lateralDistance <= maximumLateralDistance,
      )
      .sort((left, right) => left.distance - right.distance)[0]?.target ?? null
  );
}

export function createBodyCollisions(points: readonly MapPoint[], body: MapBody): MapRectangle[] {
  return points.map((point) => ({
    x: point.x + (body.offsetX ?? 0) - body.width / 2,
    y: point.y + (body.offsetY ?? 0) - body.height / 2,
    width: body.width,
    height: body.height,
  }));
}

export function getFacingToward(origin: MapPoint, target: MapPoint): MapFacing {
  const deltaX = target.x - origin.x;
  const deltaY = target.y - origin.y;
  if (Math.abs(deltaX) > Math.abs(deltaY)) return deltaX < 0 ? "left" : "right";
  return deltaY < 0 ? "up" : "down";
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
