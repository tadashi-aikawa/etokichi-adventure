import {
  Assets,
  Container,
  Graphics,
  RendererType,
  Sprite,
  Ticker,
  Texture,
  WebGLRenderer,
  WebGPURenderer,
} from "pixi.js";
import "pixi.js/browser";
import BACKGROUND_URL from "../../assets/backgrounds/cosmic-ranch-colosseum.webp?url";
import { getFighterRenderSize } from "../game/actors.ts";
import { createEffectSystem } from "./pixi-effects.js";
import { createFighterSystem } from "./pixi-fighters.js";

const PARTICLE_COUNT = 64;
const STAR_COUNT = 150;
const PROJECTION_EPSILON = .001;
const BACKGROUND_CAMERA_PARALLAX = .18;
const BACKGROUND_COVER_PADDING = 12;

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

function interpolateKeyframes(progress, keyframes) {
  if (progress <= keyframes[0][0]) return keyframes[0][1];
  for (let index = 1; index < keyframes.length; index += 1) {
    const [nextProgress, nextValue] = keyframes[index];
    const [previousProgress, previousValue] = keyframes[index - 1];
    if (progress > nextProgress) continue;
    const local = (progress - previousProgress) / Math.max(.0001, nextProgress - previousProgress);
    return previousValue + (nextValue - previousValue) * local;
  }
  return keyframes.at(-1)[1];
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createRadialTexture(size, stops) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

async function createRenderLoop(arena, preference) {
  const rect = arena.getBoundingClientRect();
  const Renderer = preference === "webgpu" ? WebGPURenderer : WebGLRenderer;
  const renderer = new Renderer();
  try {
    await renderer.init({
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
      backgroundColor: 0x09071d,
      backgroundAlpha: 1,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      powerPreference: "low-power",
      manageImports: false,
    });
  } catch (error) {
    try { renderer.destroy(); } catch { /* 初期化途中では破棄APIも失敗する場合がある */ }
    throw error;
  }
  const stage = new Container();
  const ticker = new Ticker();
  ticker.add(() => renderer.render({ container: stage }), null, -50);
  return {
    renderer,
    stage,
    ticker,
    canvas: renderer.canvas,
    get screen() { return renderer.screen; },
    start() { ticker.start(); },
    stop() { ticker.stop(); },
    destroy() {
      ticker.destroy();
      stage.destroy({ children: true, texture: true });
      renderer.destroy(true);
    },
  };
}

async function createRenderLoopWithFallback(arena, preference) {
  const preferred = preference === "auto" ? (navigator.gpu ? "webgpu" : "webgl") : preference;
  try {
    return await createRenderLoop(arena, preferred);
  } catch (error) {
    if (preferred !== "webgpu") throw error;
    console.warn("WebGPUを初期化できなかったためWebGLへ切り替えます。", error);
    return createRenderLoop(arena, "webgl");
  }
}

function rendererName(type) {
  if (type === RendererType.WEBGPU) return "webgpu";
  if (type === RendererType.WEBGL) return "webgl";
  return "unknown";
}

export async function createPixiStage({ arena, gameShell, preference = "auto" }) {
  if (!arena || !gameShell) throw new Error("描画先のアリーナが見つかりません。");

  const app = await createRenderLoopWithFallback(arena, preference);
  document.documentElement.dataset.renderer = "loading-assets";
  let backgroundTexture;
  try {
    backgroundTexture = await Assets.load(BACKGROUND_URL);
  } catch (error) {
    app.destroy();
    throw error;
  }
  const glowTexture = createRadialTexture(64, [
    [0, "rgba(255,255,255,1)"],
    [.16, "rgba(255,255,255,.82)"],
    [.45, "rgba(255,255,255,.22)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  const hazeTexture = createRadialTexture(512, [
    [0, "rgba(255,255,255,.75)"],
    [.38, "rgba(255,255,255,.28)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  const vignetteTexture = createRadialTexture(512, [
    [0, "rgba(0,0,0,0)"],
    [.55, "rgba(0,0,0,.04)"],
    [1, "rgba(0,0,0,.8)"],
  ]);

  const background = new Sprite(backgroundTexture);
  background.anchor.set(.5);
  background.tint = 0xc9bfdc;

  const world = new Container();
  const stars = new Graphics();
  const haze = new Sprite(hazeTexture);
  haze.anchor.set(.5);
  haze.tint = 0xc99dff;
  haze.alpha = .28;
  haze.blendMode = "add";
  const floor = new Graphics();
  const particles = new Container();
  const actorShadows = new Container();
  const fighterLayer = new Container();
  const effectLayer = new Container();
  const dramaticShade = new Graphics();
  dramaticShade.alpha = 0;
  dramaticShade.visible = false;
  const cameraRoot = new Container();
  const vignette = new Sprite(vignetteTexture);
  vignette.anchor.set(.5);
  vignette.alpha = .72;

  world.addChild(stars, haze, floor, particles);
  // 超必殺技の暗幕は背景だけに掛ける。キャラと技エフェクトは前面で明るさを保つ。
  cameraRoot.addChild(background, world, dramaticShade, actorShadows, fighterLayer, effectLayer);
  app.stage.addChild(cameraRoot, vignette);
  app.stage.eventMode = "none";

  const shadowTexture = createRadialTexture(128, [
    [0, "rgba(255,255,255,.9)"],
    [.52, "rgba(255,255,255,.48)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  const heroShadow = new Sprite(shadowTexture);
  const enemyShadow = new Sprite(shadowTexture);
  for (const shadow of [heroShadow, enemyShadow]) {
    shadow.anchor.set(.5);
    shadow.tint = 0x05020d;
    shadow.alpha = .66;
  }
  actorShadows.addChild(heroShadow, enemyShadow);

  const motes = [];
  const random = seededRandom(0xe70c1);
  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const mote = new Sprite(glowTexture);
    mote.anchor.set(.5);
    mote.tint = index % 5 === 0 ? 0xffdc72 : index % 3 === 0 ? 0x9fe9ff : 0xd8b8ff;
    mote.blendMode = "add";
    mote.alpha = .08 + random() * .24;
    particles.addChild(mote);
    motes.push({
      sprite: mote,
      xRatio: random(),
      yRatio: random(),
      size: 4 + random() * 13,
      drift: 2 + random() * 8,
      sway: 3 + random() * 12,
      speed: .18 + random() * .65,
      phase: random() * Math.PI * 2,
    });
  }

  const targetProjection = {
    heroX: 23,
    enemyX: 77,
    pan: 0,
    zoom: 1,
    backdropPan: 0,
    backdropZoom: 1,
  };
  const projection = { ...targetProjection };
  let width = app.screen.width;
  let height = app.screen.height;
  let backgroundBaseScale = 1;
  let heroShadowBaseScaleY = 1;
  let enemyShadowBaseScaleY = 1;
  let elapsed = 0;
  let prebattle = gameShell.classList.contains("prebattle");

  let fighterSystem;
  try {
    fighterSystem = await createFighterSystem({
      layer: fighterLayer,
      glowTexture,
      heroElement: arena.querySelector("#hero"),
      enemyElement: arena.querySelector("#enemy"),
    });
  } catch (error) {
    app.destroy();
    throw error;
  }
  const effectSystem = createEffectSystem({
    layer: effectLayer,
    glowTexture,
    getActorPoint: (side, xRatio, yRatio) => fighterSystem.getPoint(side, xRatio, yRatio),
    getScreen: () => ({ width, height }),
  });

  const camera = {
    mode: null,
    faceCloseup: false,
    side: "hero",
    startedAt: 0,
    duration: 0,
    releaseAt: 0,
    tracksRelease: false,
    shakeStartedAt: -Infinity,
    wasShaking: false,
    closeupMode: null,
  };

  function readDuration(property, fallback) {
    const value = Number.parseFloat(getComputedStyle(arena).getPropertyValue(property));
    return Number.isFinite(value) ? value : fallback;
  }

  function syncCameraClasses(records = []) {
    const now = performance.now();
    let mode = null;
    let side = "hero";
    let duration = 0;
    let releaseAt = 0;
    let tracksRelease = false;
    let closeupMode = null;
    if (arena.classList.contains("victory-climax")) {
      mode = "victory";
      side = arena.classList.contains("victory-enemy") ? "enemy" : "hero";
      duration = 5250;
    } else if (arena.classList.contains("status-camera")) {
      mode = "status";
      side = arena.classList.contains("status-camera-enemy") ? "enemy" : "hero";
      duration = readDuration("--special-camera-duration", 1800);
    } else if (arena.classList.contains("push-camera")) {
      mode = "push";
      side = arena.classList.contains("push-camera-enemy") ? "enemy" : "hero";
      duration = readDuration("--push-camera-duration", 1800);
    } else if (arena.classList.contains("camera-hero") || arena.classList.contains("camera-enemy")) {
      mode = "attack";
      side = arena.classList.contains("camera-enemy") ? "enemy" : "hero";
      duration = readDuration("--camera-duration", 1000);
      tracksRelease = arena.classList.contains("camera-track-release");
      closeupMode = arena.classList.contains("camera-aster-evil-eye-closeup")
        ? "aster-evil-eye"
        : arena.classList.contains("camera-aster-death-energy-closeup")
          ? "aster-death-energy"
          : arena.classList.contains("camera-face-closeup") ? "face" : null;
      releaseAt = readDuration("--camera-release-delay", duration * .4);
    }
    const activeCameraClasses = mode === "victory"
      ? ["victory-climax", `victory-${side}`]
      : mode === "status"
      ? ["status-camera", `status-camera-${side}`]
      : mode === "push"
        ? ["push-camera", `push-camera-${side}`]
        : mode === "attack"
          ? [`camera-${side}`]
          : [];
    const cameraRestarted = records.some((record) => {
      const previous = new Set((record.oldValue || "").split(/\s+/));
      return activeCameraClasses.some((className) => !previous.has(className));
    });
    if (mode && (mode !== camera.mode || side !== camera.side || closeupMode !== camera.closeupMode || cameraRestarted)) {
      camera.startedAt = now;
      camera.duration = duration;
      camera.releaseAt = releaseAt;
      camera.tracksRelease = tracksRelease;
    }
    camera.mode = mode;
    camera.closeupMode = closeupMode;
    camera.side = side;
    const shaking = arena.classList.contains("shake");
    const shakeRestarted = records.some((record) => !(record.oldValue || "").split(/\s+/).includes("shake"));
    if (shaking && (!camera.wasShaking || shakeRestarted)) camera.shakeStartedAt = now;
    camera.wasShaking = shaking;
  }

  function updateCamera(now) {
    let zoom = 1;
    let focusAmount = 0;
    let desiredTargetScale = 1;
    let desiredOtherScale = 1;
    let otherAlpha = 1;
    let targetYOffset = 0;
    let pivotX = width / 2;
    let pivotY = height * .58;
    let cameraPositionX = pivotX;
    let cameraPositionY = pivotY;
    if (camera.mode && camera.duration > 0) {
      const progress = clamp((now - camera.startedAt) / camera.duration, 0, 1);
      if (camera.mode === "victory") {
        const victoryZoom = interpolateKeyframes(progress, [
          [0, 0], [.09, .06], [.24, .12], [.78, .12], [1, .08],
        ]);
        zoom += victoryZoom;
        const focus = fighterSystem.getBasePoint(camera.side, .5, .5);
        const originAmount = interpolateKeyframes(progress, [[0, 0], [.12, .82], [.24, 1], [1, 1]]);
        pivotX += (focus.x - pivotX) * originAmount;
        pivotY += (focus.y - pivotY) * originAmount;
        cameraPositionX += (width / 2 - cameraPositionX) * originAmount;
        cameraPositionY += (height * .56 - cameraPositionY) * originAmount;
      } else if (camera.mode === "status") {
        const zoomAmount = interpolateKeyframes(progress, [
          [0, 0], [.05, .025], [.14, .1], [.8, .1], [.88, .065], [.95, .02], [1, 0],
        ]);
        zoom += zoomAmount;
        focusAmount = interpolateKeyframes(progress, [[0, 0], [.12, 1], [.86, 1], [.94, 0], [1, 0]]);
        desiredTargetScale = interpolateKeyframes(progress, [
          [0, 1], [.12, 1.38], [.18, 1.58], [.25, 1.52], [.78, 1.52], [.86, 1.4], [.94, 1.06], [1, 1],
        ]);
        desiredOtherScale = interpolateKeyframes(progress, [[0, 1], [.12, .72], [.8, .72], [.91, .9], [1, 1]]);
        otherAlpha = interpolateKeyframes(progress, [[0, 1], [.12, 0], [.8, 0], [.91, .42], [1, 1]]);
        targetYOffset = -.06;
      } else if (camera.mode === "push") {
        const zoomAmount = interpolateKeyframes(progress, [[0, 0], [.05, .2], [.2, .2], [.31, .08], [1, 0]]);
        zoom += zoomAmount;
        focusAmount = interpolateKeyframes(progress, [[0, 0], [.06, 1], [.2, 1], [.31, 0], [1, 0]]);
        desiredTargetScale = interpolateKeyframes(progress, [[0, 1], [.06, 2], [.2, 2], [.31, 1.16], [1, 1]]);
        desiredOtherScale = interpolateKeyframes(progress, [[0, 1], [.05, .84], [.2, .84], [.28, 1.06], [1, 1]]);
        otherAlpha = interpolateKeyframes(progress, [[0, 1], [.05, .48], [.2, .48], [.28, 1], [1, 1]]);
        targetYOffset = -.07;
      } else {
        if (camera.closeupMode) {
          const entryEnd = clamp(160 / camera.duration, .035, .1);
          const releaseProgress = clamp(camera.releaseAt / camera.duration, entryEnd + .035, .42);
          const returnEnd = Math.min(.88, releaseProgress + clamp(1500 / camera.duration, .32, .58));
          const maximumZoom = camera.closeupMode === "aster-evil-eye" ? 5.2 : camera.closeupMode === "aster-death-energy" ? 2.85 : 5;
          const closeupAmount = interpolateKeyframes(progress, [
            [0, 0], [entryEnd, 1], [releaseProgress, 1], [returnEnd, 0], [1, 0],
          ]);
          const closeupZoom = interpolateKeyframes(progress, [
            [0, 1], [entryEnd, maximumZoom], [releaseProgress, maximumZoom], [returnEnd, 1], [1, 1],
          ]);
          zoom = closeupZoom;
          // 通常はステージのzoomを相殺するが、顔アップだけはカメラと同率でキャラも拡大する。
          desiredTargetScale = closeupZoom;
          desiredOtherScale = interpolateKeyframes(progress, [
            [0, 1], [entryEnd, .78], [releaseProgress, .78], [returnEnd, 1], [1, 1],
          ]);
          otherAlpha = interpolateKeyframes(progress, [
            [0, 1], [entryEnd, 0], [releaseProgress, 0], [returnEnd, 1], [1, 1],
          ]);
          const focusX = camera.closeupMode === "aster-evil-eye"
            ? (camera.side === "hero" ? .6 : .4)
            : camera.closeupMode === "aster-death-energy"
              ? (camera.side === "hero" ? .38 : .62)
              : .5;
          const focusY = camera.closeupMode === "aster-evil-eye" ? .27 : camera.closeupMode === "aster-death-energy" ? .22 : .13;
          const face = fighterSystem.getBasePoint(camera.side, focusX, focusY);
          pivotX += (face.x - pivotX) * closeupAmount;
          pivotY += (face.y - pivotY) * closeupAmount;
        } else if (camera.tracksRelease) {
          const entryEnd = clamp(260 / camera.duration, .05, .13);
          const releaseProgress = clamp(camera.releaseAt / camera.duration, entryEnd + .02, .84);
          const returnStart = Math.max(entryEnd, releaseProgress - .015);
          const returnEnd = Math.min(.96, releaseProgress + clamp(280 / camera.duration, .06, .16));
          const cameraFocusAmount = interpolateKeyframes(progress, [
            [0, 0], [entryEnd, .72], [returnStart, .72], [returnEnd, 0], [1, 0],
          ]);
          zoom += interpolateKeyframes(progress, [
            [0, 0], [entryEnd, .055], [returnStart, .055], [returnEnd, 0], [1, 0],
          ]);
          desiredTargetScale = interpolateKeyframes(progress, [
            [0, 1], [entryEnd, 1.17], [returnStart, 1.17], [returnEnd, 1], [1, 1],
          ]);
          desiredOtherScale = interpolateKeyframes(progress, [
            [0, 1], [entryEnd, .9], [returnStart, .9], [returnEnd, 1], [1, 1],
          ]);
          const attacker = fighterSystem.getBasePoint(camera.side, .5, .5);
          pivotX += (attacker.x - pivotX) * cameraFocusAmount;
          pivotY += (attacker.y - pivotY) * cameraFocusAmount;
        } else {
          zoom += interpolateKeyframes(progress, [[0, 0], [.25, .055], [.58, .055], [1, 0]]);
          desiredTargetScale = interpolateKeyframes(progress, [[0, 1], [.18, 1.17], [.48, 1.17], [.72, .94], [1, 1]]);
          desiredOtherScale = interpolateKeyframes(progress, [[0, 1], [.18, .9], [.48, .9], [.72, 1.13], [1, 1]]);
        }
      }
    }
    fighterSystem.setCameraPresentation({
      side: camera.side,
      focusAmount,
      centerX: width / 2,
      targetScale: desiredTargetScale / zoom,
      targetYOffset,
      otherScale: desiredOtherScale / zoom,
      otherAlpha,
    });
    let shakeX = 0;
    let shakeY = 0;
    const shakeProgress = (now - camera.shakeStartedAt) / 420;
    if (shakeProgress >= 0 && shakeProgress < 1) {
      const decay = 1 - shakeProgress;
      shakeX = Math.sin(shakeProgress * 68) * 7 * decay;
      shakeY = Math.cos(shakeProgress * 51) * 4 * decay;
    }
    const cameraTravelX = cameraPositionX + zoom * (width / 2 - pivotX) - width / 2;
    const cameraTravelY = cameraPositionY + zoom * (height / 2 - pivotY) - height / 2;
    const backgroundScreenX = width / 2 + cameraTravelX * BACKGROUND_CAMERA_PARALLAX + zoom * projection.backdropPan;
    const backgroundScreenY = height / 2 + cameraTravelY * BACKGROUND_CAMERA_PARALLAX;
    const backgroundCoverScale = Math.max(
      backgroundBaseScale * projection.backdropZoom,
      (Math.max(backgroundScreenX, width - backgroundScreenX) + BACKGROUND_COVER_PADDING) * 2 / (background.texture.width * zoom),
      (Math.max(backgroundScreenY, height - backgroundScreenY) + BACKGROUND_COVER_PADDING) * 2 / (background.texture.height * zoom),
    );
    background.scale.set(backgroundCoverScale);
    background.position.set(
      width / 2 + projection.backdropPan - cameraTravelX * (1 - BACKGROUND_CAMERA_PARALLAX) / zoom,
      height / 2 - cameraTravelY * (1 - BACKGROUND_CAMERA_PARALLAX) / zoom,
    );
    cameraRoot.pivot.set(pivotX, pivotY);
    cameraRoot.position.set(cameraPositionX + shakeX, cameraPositionY + shakeY);
    cameraRoot.scale.set(zoom);
  }

  function drawStars() {
    stars.clear();
    const starRandom = seededRandom(0x57a251);
    for (let index = 0; index < STAR_COUNT; index += 1) {
      const x = starRandom() * width;
      const y = starRandom() * (height + 90) - 45;
      const radius = starRandom() < .12 ? 1.35 : .45 + starRandom() * .65;
      const alpha = .16 + starRandom() * .54;
      stars.circle(x, y, radius).fill({ color: index % 11 === 0 ? 0xffe8a3 : 0xf2efff, alpha });
    }
  }

  function drawFloor() {
    floor.clear();
    floor
      .ellipse(width / 2, height * 1.04, width * .82, height * .29)
      .fill({ color: 0x180e31, alpha: .62 })
      .stroke({ color: 0xd8c7ff, alpha: .18, width: 2 });
    for (let index = 0; index < 3; index += 1) {
      floor
        .ellipse(width / 2, height * .91, width * (.25 + index * .09), height * (.08 + index * .026))
        .stroke({ color: 0xd9beff, alpha: .11 - index * .018, width: 2 });
    }
  }

  function layout() {
    width = app.screen.width;
    height = app.screen.height;
    backgroundBaseScale = Math.max(width / background.texture.width, height / background.texture.height) * 1.14;
    background.position.set(width / 2, height / 2);
    world.pivot.set(width / 2, height / 2);
    world.position.set(width / 2, height / 2);
    haze.position.set(width / 2, height * .47);
    haze.width = width * 1.15;
    haze.height = height * .84;
    vignette.position.set(width / 2, height / 2);
    vignette.width = width;
    vignette.height = height;
    dramaticShade
      .clear()
      .rect(-width, -height, width * 3, height * 3)
      .fill({ color: 0xffffff });
    for (const mote of motes) {
      mote.sprite.position.set(mote.xRatio * width, mote.yRatio * height);
      mote.sprite.width = mote.size;
      mote.sprite.height = mote.size;
    }
    drawStars();
    drawFloor();
  }

  function applyProjection() {
    background.scale.set(backgroundBaseScale * projection.backdropZoom);
    background.x = width / 2 + projection.backdropPan;
    world.position.set(width / 2 + projection.pan, height / 2);
    world.scale.set(projection.zoom);

    const heroVisualScale = Number.parseFloat(arena.querySelector("#hero")?.style.getPropertyValue("--character-scale")) || 1;
    const enemyVisualScale = Number.parseFloat(arena.querySelector("#enemy")?.style.getPropertyValue("--character-scale")) || 1;
    const heroSize = getFighterRenderSize(width, projection.zoom, heroVisualScale);
    const enemySize = getFighterRenderSize(width, projection.zoom, enemyVisualScale);
    heroShadow.position.set(width * projection.heroX / 100, height * .89);
    enemyShadow.position.set(width * projection.enemyX / 100, height * .89);
    heroShadow.width = heroSize * .68;
    heroShadow.height = heroSize * .13;
    enemyShadow.width = enemySize * .68;
    enemyShadow.height = enemySize * .13;
    fighterSystem.setLayout("hero", {
      x: width * projection.heroX / 100,
      groundY: height * .92,
      size: heroSize,
    });
    fighterSystem.setLayout("enemy", {
      x: width * projection.enemyX / 100,
      groundY: height * .92,
      size: enemySize,
    });
    heroShadowBaseScaleY = heroShadow.scale.y;
    enemyShadowBaseScaleY = enemyShadow.scale.y;
  }

  function syncPrebattle() {
    prebattle = gameShell.classList.contains("prebattle");
    floor.visible = !prebattle;
    actorShadows.visible = !prebattle;
    fighterSystem.setVisible(!prebattle);
    effectLayer.visible = !prebattle;
    background.tint = prebattle ? 0xa89dbd : 0xc9bfdc;
    vignette.alpha = prebattle ? .84 : .72;
  }

  layout();
  syncPrebattle();
  applyProjection();

  const resizeObserver = new ResizeObserver(() => {
    const rect = arena.getBoundingClientRect();
    app.renderer.resize(Math.max(1, Math.round(rect.width)), Math.max(1, Math.round(rect.height)));
    layout();
    applyProjection();
  });
  resizeObserver.observe(arena);

  const phaseObserver = new MutationObserver(syncPrebattle);
  phaseObserver.observe(gameShell, { attributes: true, attributeFilter: ["class"] });
  const cameraObserver = new MutationObserver(syncCameraClasses);
  cameraObserver.observe(arena, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
  syncCameraClasses();

  app.ticker.maxFPS = 60;
  app.ticker.add((ticker) => {
    const now = performance.now();
    const deltaSeconds = Math.min(ticker.deltaMS, 50) / 1000;
    elapsed += deltaSeconds;
    const smoothing = 1 - Math.exp(-ticker.deltaMS / 70);
    let projectionChanged = false;
    for (const key of Object.keys(projection)) {
      const difference = targetProjection[key] - projection[key];
      if (difference === 0) continue;
      projection[key] = Math.abs(difference) <= PROJECTION_EPSILON
        ? targetProjection[key]
        : projection[key] + difference * smoothing;
      projectionChanged = true;
    }
    if (projectionChanged) applyProjection();

    const shadeMode = arena.classList.contains("black-meteor-mode")
      ? "meteor"
      : arena.classList.contains("pentagram-nova-mode")
        ? "nova"
        : arena.classList.contains("special-mode")
          ? "galaxy"
          : null;
    const shadeTarget = prebattle ? 0 : shadeMode === "meteor" ? .55 : shadeMode === "nova" ? .46 : shadeMode === "galaxy" ? .5 : 0;
    const shadeSmoothing = 1 - Math.exp(-ticker.deltaMS / (shadeTarget > dramaticShade.alpha ? 230 : 360));
    dramaticShade.alpha += (shadeTarget - dramaticShade.alpha) * shadeSmoothing;
    dramaticShade.tint = shadeMode === "meteor" ? 0x070210 : shadeMode === "nova" ? 0x16082b : 0x09041a;
    dramaticShade.visible = dramaticShade.alpha > .003;

    stars.y = (elapsed * 2.8) % 45;
    haze.rotation = Math.sin(elapsed * .12) * .008;
    haze.alpha = .25 + Math.sin(elapsed * .7) * .035;
    for (const mote of motes) {
      const { sprite } = mote;
      const wrappedY = (mote.yRatio * height - elapsed * mote.drift + height) % height;
      sprite.x = mote.xRatio * width + Math.sin(elapsed * mote.speed + mote.phase) * mote.sway;
      sprite.y = wrappedY;
      sprite.alpha = .1 + (Math.sin(elapsed * (mote.speed + .5) + mote.phase) + 1) * .09;
    }
    const shadowPulse = .94 + Math.sin(elapsed * Math.PI * 2 / 2.1) * .06;
    heroShadow.scale.y = heroShadowBaseScaleY * shadowPulse;
    enemyShadow.scale.y = enemyShadowBaseScaleY * shadowPulse;
    fighterSystem.update(now, elapsed);
    effectSystem.update(now);
    updateCamera(now);
  });

  const onVisibilityChange = () => {
    if (document.hidden) app.stop();
    else app.start();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  app.canvas.id = "pixi-stage";
  app.canvas.className = "pixi-stage";
  app.canvas.setAttribute("aria-hidden", "true");
  arena.prepend(app.canvas);
  if (!document.hidden) app.start();

  const backend = rendererName(app.renderer.type);
  document.documentElement.dataset.renderer = backend;
  console.info(`PixiJS stage renderer: ${backend.toUpperCase()}`);

  return {
    backend,
    spawnEffect(type, options) {
      return effectSystem.spawn(type, options);
    },
    startFighterMotion(side, type, options) {
      return fighterSystem.startMotion(side, type, options);
    },
    getActorPoint(side, xRatio, yRatio) {
      return fighterSystem.getScreenPoint(side, xRatio, yRatio);
    },
    setProjection(nextProjection) {
      for (const key of Object.keys(targetProjection)) {
        const value = nextProjection[key];
        if (Number.isFinite(value)) targetProjection[key] = value;
      }
    },
    destroy() {
      resizeObserver.disconnect();
      phaseObserver.disconnect();
      cameraObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      effectSystem.clear();
      fighterSystem.destroy();
      app.destroy();
    },
  };
}
