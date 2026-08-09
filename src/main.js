import { resolveActorUrl } from "./actor-assets.ts";

const rendererMode = new URLSearchParams(window.location.search).get("renderer") ?? "auto";
let rendererReady = Promise.resolve();
window.etokichiAssetUrl = resolveActorUrl;

if (rendererMode !== "dom") {
  document.documentElement.dataset.renderer = "initializing";
  rendererReady = import("./rendering/pixi-stage.js")
    .then(({ createPixiStage }) => createPixiStage({
      arena: document.querySelector("#arena"),
      gameShell: document.querySelector(".game-shell"),
      preference: rendererMode === "webgl" || rendererMode === "webgpu" ? rendererMode : "auto",
    }))
    .then((renderer) => {
      window.etokichiRenderer = renderer;
    })
    .catch((error) => {
      console.error("PixiJSの初期化に失敗したため、DOM描画へフォールバックします。", error);
      document.documentElement.dataset.renderer = "dom";
    });
} else {
  document.documentElement.dataset.renderer = "dom";
}

await import("../game.js");
await rendererReady;
