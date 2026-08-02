import { Assets, Container, Graphics, Sprite } from "pixi.js";
import { resolveActorUrl } from "../actor-assets.js";

const STATUS_COLORS = {
  "status-power": 0xff9d31,
  "status-ease": 0x78e9ff,
  "status-real": 0xc08cff,
  "status-jealousy": 0x5def68,
  "status-serenity": 0xbaf8ff,
  "status-awakening": 0xffe66f,
  "status-etoile": 0xfff2a0,
};

const ACTION_CLASSES = [
  "moving-forward", "moving-back", "hero-walking", "walk-facing-left",
  "attack-light", "casting", "ultimate-sequence", "galaxy-ray-sequence", "throw-kiss-sequence",
  "physical-punch-sequence", "star-ring-sequence", "pentagram-nova-sequence", "etoile-drive-sequence",
  "dark-orbit-sequence", "black-meteor-sequence", "meteor-claw-sequence", "crescent-horn-sequence",
  "galaxy-ray-recoil", "technique-recoil", "pentagram-nova-combo", "pentagram-nova-finisher",
  "pentagram-nova-diving", "pentagram-nova-miss", "etoile-drive-peak",
  "special-action", "hurt", "critical-hit", "dodging", "push-focus", "push-threatened", "push-travel",
  "blown-right", "blown-left", "nova-captured", "ko", "ko-pending", "result-loser", "result-winner",
  "result-winner-climax",
];

function textureScale(sprite, size, facing = 1) {
  const textureWidth = Math.max(1, sprite.texture.width);
  const textureHeight = Math.max(1, sprite.texture.height);
  const scale = size / Math.max(textureWidth, textureHeight);
  sprite.scale.set(scale * facing, scale);
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function sampleMotionKeyframes(keyframes, progress) {
  if (progress <= keyframes[0].offset) return keyframes[0];
  for (let index = 1; index < keyframes.length; index += 1) {
    const next = keyframes[index];
    const previous = keyframes[index - 1];
    if (progress > next.offset) continue;
    const local = (progress - previous.offset) / Math.max(.0001, next.offset - previous.offset);
    return {
      x: previous.x + (next.x - previous.x) * local,
      y: previous.y + (next.y - previous.y) * local,
      rotation: previous.rotation + (next.rotation - previous.rotation) * local,
      scale: previous.scale + (next.scale - previous.scale) * local,
    };
  }
  return keyframes.at(-1);
}

export async function createFighterSystem({ layer, glowTexture, heroElement, enemyElement }) {
  const elements = {
    hero: { root: heroElement, image: heroElement?.querySelector(".sprite") },
    enemy: { root: enemyElement, image: enemyElement?.querySelector(".sprite") },
  };
  if (!elements.hero.image || !elements.enemy.image) throw new Error("PixiJSへ移行するキャラクター画像が見つかりません。");

  const initialTextures = await Promise.all([
    Assets.load(resolveActorUrl(elements.hero.image.getAttribute("src") || elements.hero.image.currentSrc)),
    Assets.load(resolveActorUrl(elements.enemy.image.getAttribute("src") || elements.enemy.image.currentSrc)),
  ]);

  function createActor(side, texture) {
    const container = new Container();
    const aura = new Container();
    const auraGlow = new Sprite(glowTexture);
    auraGlow.anchor.set(.5);
    auraGlow.blendMode = "add";
    const auraRingOuter = new Graphics().circle(0, 0, 1).stroke({ color: 0xffffff, alpha: .72, width: .035 });
    const auraRingInner = new Graphics().circle(0, 0, 1).stroke({ color: 0xffffff, alpha: .46, width: .025 });
    aura.addChild(auraGlow, auraRingOuter, auraRingInner);

    const trails = new Container();
    const sprite = new Sprite(texture);
    sprite.anchor.set(.5, 1);
    container.addChild(aura, trails, sprite);
    layer.addChild(container);

    return {
      side,
      container,
      aura,
      auraGlow,
      auraRingOuter,
      auraRingInner,
      trails,
      sprite,
      source: elements[side].image.getAttribute("src") || elements[side].image.currentSrc,
      classes: new Set(elements[side].root.classList),
      actionStartedAt: performance.now(),
      classSignature: "",
      baseX: 0,
      baseY: 0,
      size: 200,
      visible: true,
      transitionStartedAt: 0,
      transitionDuration: 260,
      ghosts: [],
      textureToken: 0,
      dodgeToken: 0,
      scriptedMotion: null,
    };
  }

  const actors = {
    hero: createActor("hero", initialTextures[0]),
    enemy: createActor("enemy", initialTextures[1]),
  };
  const cameraPresentation = {
    side: "hero",
    focusAmount: 0,
    centerX: 0,
    targetScale: 1,
    targetYOffset: 0,
    otherScale: 1,
    otherAlpha: 1,
  };

  async function syncTexture(side) {
    const actor = actors[side];
    const image = elements[side].image;
    const source = image.getAttribute("src") || image.currentSrc;
    if (!source || source === actor.source) return;
    actor.source = source;
    const shouldSwapImmediately = elements[side].root.classList.contains("hero-walking");
    const token = ++actor.textureToken;
    try {
      const texture = await Assets.load(resolveActorUrl(source));
      if (token !== actor.textureToken) return;
      if (shouldSwapImmediately) {
        actor.sprite.texture = texture;
        actor.sprite.alpha = 1;
        actor.transitionStartedAt = 0;
        textureScale(actor.sprite, actor.size, actor.classes.has("walk-facing-left") ? -1 : 1);
        return;
      }
      const ghost = new Sprite(actor.sprite.texture);
      ghost.anchor.copyFrom(actor.sprite.anchor);
      ghost.position.copyFrom(actor.sprite.position);
      textureScale(ghost, actor.size, actor.sprite.scale.x < 0 ? -1 : 1);
      ghost.alpha = .82;
      actor.trails.addChild(ghost);
      actor.ghosts.push({ sprite: ghost, startedAt: performance.now(), duration: 320, drift: side === "hero" ? -10 : 10 });
      actor.sprite.texture = texture;
      actor.sprite.alpha = .08;
      actor.transitionStartedAt = performance.now();
      textureScale(actor.sprite, actor.size, actor.classes.has("walk-facing-left") ? -1 : 1);
    } catch (error) {
      console.warn(`PixiJSキャラクター画像の読込に失敗しました: ${source}`, error);
    }
  }

  function createDodgeTrails(actor) {
    actor.dodgeToken += 1;
    for (let index = 0; index < 3; index += 1) {
      const ghost = new Sprite(actor.sprite.texture);
      ghost.anchor.copyFrom(actor.sprite.anchor);
      textureScale(ghost, actor.size, actor.sprite.scale.x < 0 ? -1 : 1);
      ghost.tint = actor.side === "hero" ? 0xbff8ff : 0xd8b8ff;
      ghost.blendMode = "add";
      actor.trails.addChild(ghost);
      actor.ghosts.push({
        sprite: ghost,
        startedAt: performance.now() + index * 46,
        duration: 520,
        drift: (actor.side === "hero" ? 1 : -1) * (26 + index * 22),
        delayed: true,
        baseScaleY: ghost.scale.y,
      });
    }
  }

  function syncClasses(side) {
    const actor = actors[side];
    const nextClasses = new Set(elements[side].root.classList);
    const signature = ACTION_CLASSES.filter((name) => nextClasses.has(name)).join("|");
    if (signature !== actor.classSignature) {
      if (nextClasses.has("dodging") && !actor.classes.has("dodging")) createDodgeTrails(actor);
      actor.classSignature = signature;
      actor.actionStartedAt = performance.now();
    }
    if (actor.classes.has("pentagram-nova-sequence") && !nextClasses.has("pentagram-nova-sequence")) {
      actor.scriptedMotion = null;
    }
    actor.classes = nextClasses;
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const side of ["hero", "enemy"]) {
        if (record.target === elements[side].image) syncTexture(side);
        if (record.target === elements[side].root) syncClasses(side);
      }
    }
  });
  for (const side of ["hero", "enemy"]) {
    observer.observe(elements[side].image, { attributes: true, attributeFilter: ["src"] });
    observer.observe(elements[side].root, { attributes: true, attributeFilter: ["class"] });
    syncClasses(side);
  }

  function setLayout(side, { x, groundY, size }) {
    const actor = actors[side];
    actor.baseX = x;
    actor.baseY = groundY;
    actor.size = size;
    textureScale(actor.sprite, size, actor.classes.has("walk-facing-left") ? -1 : 1);
    actor.aura.position.set(0, -size * .5);
    actor.auraGlow.width = size * 1.55;
    actor.auraGlow.height = size * 1.55;
    actor.auraRingOuter.scale.set(size * .62);
    actor.auraRingInner.scale.set(size * .45);
  }

  function setVisible(visible) {
    for (const actor of Object.values(actors)) {
      actor.visible = visible;
      actor.container.visible = visible;
    }
  }

  function setCameraPresentation(next) {
    Object.assign(cameraPresentation, next);
  }

  function startMotion(side, type, options = {}) {
    const actor = actors[side];
    const currentCenter = {
      x: actor.container.x || actor.baseX,
      y: (actor.container.y || actor.baseY) - actor.size * .5,
    };
    let keyframes;
    if (type === "novaCombo") {
      const points = options.points || [];
      if (points.length < 6) return false;
      keyframes = [
        { ...currentCenter, rotation: 0, scale: 1, offset: 0 },
        { ...points[0], rotation: -.31, scale: .9, offset: .04 },
        { ...points[1], rotation: .28, scale: 1.08, offset: .181 },
        { ...points[2], rotation: -.35, scale: 1.08, offset: .339 },
        { ...points[3], rotation: .26, scale: 1.1, offset: .496 },
        { ...points[4], rotation: -.28, scale: 1.08, offset: .653 },
        { ...points[5], rotation: .21, scale: 1.1, offset: .81 },
        { ...points[5], rotation: 0, scale: 1, offset: 1 },
      ];
    } else if (type === "novaRise") {
      const ground = options.enemyGroundTarget;
      const air = options.airTarget;
      if (!ground || !air) return false;
      keyframes = [
        { ...currentCenter, rotation: .17, scale: 1.08, offset: 0 },
        { x: ground.x - actor.size * .08, y: ground.y + actor.size * .08, rotation: -.28, scale: 1.02, offset: .22 },
        { x: ground.x, y: ground.y - actor.size * .14, rotation: -.46, scale: 1.2, offset: .43 },
        { x: air.x, y: air.y + actor.size * .1, rotation: -.16, scale: 1.1, offset: .84 },
        { ...air, rotation: 0, scale: 1.04, offset: 1 },
      ];
    } else if (type === "novaDive") {
      const target = options.enemyGroundTarget;
      if (!target) return false;
      keyframes = [
        { ...currentCenter, rotation: 0, scale: 1.04, offset: 0 },
        { x: currentCenter.x + 10, y: currentCenter.y - 30, rotation: .12, scale: .96, offset: .18 },
        { x: target.x - 16, y: target.y - actor.size * .22, rotation: -.26, scale: 1.22, offset: .74 },
        { ...target, rotation: -.09, scale: 1.12, offset: 1 },
      ];
    } else {
      return false;
    }
    actor.scriptedMotion = {
      type,
      keyframes,
      startedAt: performance.now(),
      duration: options.duration || 1000,
    };
    return true;
  }

  function updateActor(actor, now, elapsed) {
    if (!actor.visible) return;
    const classes = actor.classes;
    const actionSeconds = (now - actor.actionStartedAt) / 1000;
    const direction = actor.side === "hero" ? 1 : -1;
    let offsetX = 0;
    let offsetY = -Math.sin(elapsed * Math.PI * 2 / 2.1) * actor.size * .014;
    let rotation = 0;
    let scale = 1;
    let alpha = 1;
    let tint = 0xffffff;

    if (classes.has("moving-forward") || classes.has("moving-back") || classes.has("hero-walking")) {
      offsetY -= Math.abs(Math.sin(elapsed * 12)) * actor.size * .025;
      rotation = Math.sin(elapsed * 12) * .025 * direction;
    }
    if (classes.has("casting") || classes.has("ultimate-sequence") || classes.has("special-action") || classes.has("etoile-drive-sequence")) {
      scale += .045 + Math.sin(elapsed * 10) * .025;
      offsetY -= actor.size * .025;
      tint = actor.side === "hero" ? 0xfff3b0 : 0xd8bbff;
    }
    if (["attack-light", "physical-punch-sequence", "star-ring-sequence", "meteor-claw-sequence", "crescent-horn-sequence"].some((name) => classes.has(name))) {
      const lunge = Math.sin(Math.min(1, actionSeconds / .55) * Math.PI);
      offsetX += direction * actor.size * .12 * lunge;
      rotation = direction * -.06 * lunge;
      scale += .07 * lunge;
    }
    if (classes.has("galaxy-ray-recoil") || classes.has("technique-recoil")) offsetX -= direction * actor.size * .08;
    if (classes.has("hurt") || classes.has("critical-hit")) {
      const decay = Math.max(0, 1 - actionSeconds / .78);
      offsetX += Math.sin(actionSeconds * 72) * actor.size * .055 * decay;
      rotation += Math.sin(actionSeconds * 55) * .08 * decay;
      tint = 0xffffff;
      scale += classes.has("critical-hit") ? .1 * decay : .045 * decay;
    }
    if (classes.has("dodging")) {
      const progress = Math.min(1, actionSeconds / .88);
      alpha = .25 + Math.abs(progress - .5) * 1.5;
      offsetX += direction * actor.size * .12 * Math.sin(progress * Math.PI);
    }
    if (classes.has("push-focus") || classes.has("push-threatened")) {
      scale += Math.sin(Math.min(1, actionSeconds / .5) * Math.PI) * .08;
      rotation += Math.sin(actionSeconds * 40) * .035;
    }
    if (classes.has("blown-right") || classes.has("blown-left")) {
      rotation += classes.has("blown-right") ? .18 : -.18;
      offsetY -= actor.size * .04;
    }
    if (classes.has("nova-captured")) {
      const captureProgress = Math.min(1, actionSeconds / 3.65);
      let lift = 0;
      if (captureProgress < .7) {
        offsetX += Math.sin(actionSeconds * 24) * actor.size * .035;
        rotation += Math.sin(actionSeconds * 21) * .07;
      } else if (captureProgress < .78) {
        lift = (captureProgress - .7) / .08 * .14;
      } else if (captureProgress < .87) {
        lift = .14 + (captureProgress - .78) / .09 * .42;
      } else if (captureProgress < .94) {
        lift = .56 + (captureProgress - .87) / .07 * .24;
      } else {
        lift = .8;
      }
      offsetY -= actor.size * lift;
      rotation += Math.sin(elapsed * 13) * .035;
    }
    if ((classes.has("pentagram-nova-finisher") || classes.has("pentagram-nova-diving")) && !actor.scriptedMotion) {
      offsetY -= actor.size * (classes.has("pentagram-nova-diving") ? .2 : .55);
      rotation -= direction * .12;
    }
    if (classes.has("ko-pending") || classes.has("result-loser")) {
      const progress = easeOutCubic(Math.min(1, actionSeconds / 2.8));
      rotation += direction * -1.15 * progress;
      offsetY += actor.size * .18 * progress;
      alpha = 1 - progress * .22;
    }
    if (classes.has("result-winner") || classes.has("result-winner-climax")) offsetY -= Math.abs(Math.sin(elapsed * 5)) * actor.size * .09;

    let positionX = actor.baseX + offsetX;
    let positionY = actor.baseY + offsetY;
    if (actor.scriptedMotion) {
      const progress = Math.min(1, (now - actor.scriptedMotion.startedAt) / actor.scriptedMotion.duration);
      const motion = sampleMotionKeyframes(actor.scriptedMotion.keyframes, progress);
      positionX = motion.x;
      positionY = motion.y + actor.size * .5;
      rotation = motion.rotation;
      scale *= motion.scale;
    }
    const isCameraTarget = actor.side === cameraPresentation.side;
    if (isCameraTarget) {
      positionX += (cameraPresentation.centerX - positionX) * cameraPresentation.focusAmount;
      positionY += actor.size * cameraPresentation.targetYOffset * cameraPresentation.focusAmount;
      scale *= cameraPresentation.targetScale;
      actor.container.alpha = 1;
    } else {
      scale *= cameraPresentation.otherScale;
      actor.container.alpha = cameraPresentation.otherAlpha;
    }

    actor.container.position.set(positionX, positionY);
    actor.container.rotation = rotation;
    actor.container.scale.set(scale);
    actor.sprite.alpha = alpha;
    actor.sprite.tint = tint;
    textureScale(actor.sprite, actor.size, classes.has("walk-facing-left") ? -1 : 1);

    const activeStatus = Object.entries(STATUS_COLORS).find(([className]) => classes.has(className));
    actor.aura.visible = Boolean(activeStatus);
    if (activeStatus) {
      const color = activeStatus[1];
      actor.auraGlow.tint = color;
      actor.auraGlow.alpha = .22 + Math.sin(elapsed * 6) * .06;
      actor.auraRingOuter.tint = color;
      actor.auraRingInner.tint = color;
      actor.auraRingOuter.rotation = elapsed * .42 * direction;
      actor.auraRingInner.rotation = -elapsed * .68 * direction;
      actor.auraRingOuter.scale.set(actor.size * (.6 + Math.sin(elapsed * 4) * .025));
    }

    if (actor.transitionStartedAt) {
      const progress = Math.min(1, (now - actor.transitionStartedAt) / actor.transitionDuration);
      actor.sprite.alpha *= easeOutCubic(progress);
      if (progress >= 1) actor.transitionStartedAt = 0;
    }
    for (let index = actor.ghosts.length - 1; index >= 0; index -= 1) {
      const ghost = actor.ghosts[index];
      const progress = (now - ghost.startedAt) / ghost.duration;
      if (progress < 0) {
        ghost.sprite.visible = false;
        continue;
      }
      ghost.sprite.visible = true;
      if (progress >= 1) {
        ghost.sprite.destroy();
        actor.ghosts.splice(index, 1);
        continue;
      }
      ghost.sprite.position.x = ghost.drift * progress;
      ghost.sprite.alpha = (ghost.delayed ? .46 : .82) * (1 - progress);
      if (ghost.baseScaleY) ghost.sprite.scale.y = ghost.baseScaleY * (1 + progress * .08);
    }
  }

  function update(now, elapsed) {
    updateActor(actors.hero, now, elapsed);
    updateActor(actors.enemy, now, elapsed);
  }

  function getPoint(side, xRatio = .5, yRatio = .5) {
    const actor = actors[side];
    return {
      x: actor.container.x + (xRatio - .5) * actor.size,
      y: actor.container.y - actor.size * (1 - yRatio),
    };
  }

  function getBasePoint(side, xRatio = .5, yRatio = .5) {
    const actor = actors[side];
    return {
      x: actor.baseX + (xRatio - .5) * actor.size,
      y: actor.baseY - actor.size * (1 - yRatio),
    };
  }

  return {
    setLayout,
    setVisible,
    setCameraPresentation,
    startMotion,
    update,
    getPoint,
    getBasePoint,
    destroy() { observer.disconnect(); },
  };
}
