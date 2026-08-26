import { resolveActorUrl } from "./actor-assets.ts";
import { EVENT_CATALOG } from "./content/event-catalog.ts";
import { getMapInitialPosition, INITIAL_MAP_ID } from "./content/map-catalog.ts";
import { createGameController } from "./game/game-controller.ts";
import { createGameSession, createInitialWorldState } from "./game/game-session.ts";
import { createPixiStage } from "./rendering/pixi-stage.js";

const requestedRenderer = new URLSearchParams(window.location.search).get("renderer");
const preference = requestedRenderer === "webgl" || requestedRenderer === "webgpu"
  ? requestedRenderer
  : "auto";
window.etokichiAssetUrl = resolveActorUrl;
window.etokichiGameSession = createGameSession(createInitialWorldState(getMapInitialPosition(INITIAL_MAP_ID)));
window.etokichiGameController = createGameController(window.etokichiGameSession, (eventId) => EVENT_CATALOG.get(eventId));
document.documentElement.dataset.gameScene = window.etokichiGameSession.getState().scene;
window.etokichiGameSession.subscribe((state) => {
  document.documentElement.dataset.gameScene = state.scene;
});
document.documentElement.dataset.renderer = "initializing";

try {
  window.etokichiRenderer = await createPixiStage({
    arena: document.querySelector("#arena"),
    gameShell: document.querySelector(".game-shell"),
    gameSession: window.etokichiGameSession,
    gameController: window.etokichiGameController,
    preference,
  });
} catch (error) {
  console.error("GPUレンダラーを初期化できないため、ゲームを開始できません。", error);
  document.documentElement.dataset.renderer = "error";
  const message = document.createElement("p");
  message.className = "renderer-error";
  message.textContent = "この環境ではWebGPU/WebGLを初期化できませんでした。";
  document.querySelector(".title-card")?.append(message);
  throw error;
}

await import("../game.js");
