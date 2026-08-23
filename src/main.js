import { resolveActorUrl } from "./actor-assets.ts";
import { createGameSession } from "./game/game-session.ts";
import { createPixiStage } from "./rendering/pixi-stage.js";

const requestedRenderer = new URLSearchParams(window.location.search).get("renderer");
const preference = requestedRenderer === "webgl" || requestedRenderer === "webgpu"
  ? requestedRenderer
  : "auto";
window.etokichiAssetUrl = resolveActorUrl;
window.etokichiGameSession = createGameSession();
document.documentElement.dataset.gameScene = window.etokichiGameSession.getState().scene;
window.etokichiGameSession.subscribe((state) => {
  document.documentElement.dataset.gameScene = state.scene;
});
document.documentElement.dataset.renderer = "initializing";

try {
  window.etokichiRenderer = await createPixiStage({
    arena: document.querySelector("#arena"),
    gameShell: document.querySelector(".game-shell"),
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
