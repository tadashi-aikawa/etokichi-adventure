import { Assets, ColorMatrixFilter, Container, Graphics, NoiseFilter, Sprite } from "pixi.js";
import { resolveActorUrl } from "../actor-assets.ts";
import { getFighterDepth } from "../game/animation-plan.ts";

const STATUS_COLORS = {
  "status-power": 0xff9d31,
  "status-ease": 0x78e9ff,
  "status-real": 0xc08cff,
  "status-jealousy": 0x5def68,
  "status-serenity": 0xbaf8ff,
  "status-awakening": 0xffe66f,
  "status-etoile": 0xfff2a0,
  "status-inspiration": 0xffe675,
  "status-genki": 0xffe675,
  "status-charm": 0xff74b9,
  "status-zone": 0x68efff,
  "status-pursuit": 0xffa94d,
  "status-pleasure": 0xff8fb7,
  "status-restraint": 0x91a4b7,
  "status-petrified": 0x9099a3,
};

const ACTION_CLASSES = [
  "mirror-character",
  "moving-forward", "moving-back", "fighter-walking", "walk-reversed",
  "attack-light", "casting", "ultimate-sequence", "galaxy-ray-sequence", "throw-kiss-sequence",
  "physical-punch-sequence", "star-ring-sequence", "pentagram-nova-sequence", "etoile-drive-sequence",
  "dark-orbit-sequence", "black-meteor-sequence", "meteor-claw-sequence", "crescent-horn-sequence",
  "sutekichi-star-touch-sequence", "sutekichi-halo-skip-sequence", "sutekichi-stella-search-sequence",
  "sutekichi-comet-sequence", "sutekichi-nap-sequence",
  "business-card-strike-sequence", "closing-time-dash-sequence", "angel-wink-sequence",
  "approval-meteor-sequence",
  "tatsuo-slap-sequence", "tatsuo-restraint-sequence", "tatsuo-roar-sequence", "tatsuo-press-sequence",
  "aster-death-energy-sequence", "aster-evil-eye-sequence", "aster-migration-sequence", "aster-tail-sweep-sequence",
  "galaxy-ray-recoil", "technique-recoil", "pentagram-nova-combo", "pentagram-nova-finisher",
  "pentagram-nova-diving", "pentagram-nova-miss", "etoile-drive-peak",
  "special-action", "hurt", "critical-hit", "tatsuo-pinned", "dodging", "push-focus", "push-threatened", "push-travel",
  "blown-right", "blown-left", "nova-captured", "ko", "ko-pending", "result-loser", "result-winner",
  "result-winner-climax",
  "status-inspiration", "status-genki", "status-charm", "status-zone", "status-pursuit", "status-pleasure", "status-restraint", "status-petrified", "special-action-inspiration",
  "special-action-zone",
  "flash-knockback",
];

function textureScale(sprite, size, facing = 1) {
  const textureWidth = Math.max(1, sprite.texture.width);
  const textureHeight = Math.max(1, sprite.texture.height);
  const scale = size / Math.max(textureWidth, textureHeight);
  sprite.scale.set(scale * facing, scale);
}

function actorFacing(actor) {
  const profileFacing = actor.classes.has("mirror-character") ? -1 : 1;
  const assetFacing = actor.classes.has("asset-facing-reversed") ? -1 : 1;
  const walkFacing = actor.classes.has("walk-reversed") ? -1 : 1;
  return profileFacing * assetFacing * walkFacing;
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function createHeart(size, color) {
  return new Graphics()
    .circle(-size * .22, -size * .12, size * .28)
    .circle(size * .22, -size * .12, size * .28)
    .poly([-size * .46, 0, 0, size * .55, size * .46, 0])
    .fill({ color, alpha: .96 });
}

function sampleMotionKeyframes(keyframes, progress) {
  if (progress <= keyframes[0].offset) return keyframes[0];
  for (let index = 1; index < keyframes.length; index += 1) {
    const next = keyframes[index];
    const previous = keyframes[index - 1];
    if (progress > next.offset) continue;
    const local = (progress - previous.offset) / Math.max(.0001, next.offset - previous.offset);
    const verticalLocal = next.verticalEasing === "gravity" ? local ** 2 : local;
    return {
      x: previous.x + (next.x - previous.x) * local,
      y: previous.y + (next.y - previous.y) * verticalLocal,
      rotation: previous.rotation + (next.rotation - previous.rotation) * local,
      scale: previous.scale + (next.scale - previous.scale) * local,
    };
  }
  return keyframes.at(-1);
}

export async function createFighterSystem({ layer, glowTexture, heroElement, enemyElement }) {
  layer.sortableChildren = true;
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
    const genkiStars = Array.from({ length: 6 }, (_, index) => {
      const color = index % 2 === 0 ? 0x78e9ff : 0xffe36d;
      const star = new Graphics()
        .poly([0, -1, .28, -.28, 1, 0, .28, .28, 0, 1, -.28, .28, -1, 0, -.28, -.28])
        .fill({ color, alpha: .95 });
      star.visible = false;
      return star;
    });
    const charmHearts = Array.from({ length: 7 }, (_, index) => {
      const heart = createHeart(1, index % 2 ? 0xff8ac5 : 0xffd2e9);
      heart.visible = false;
      return heart;
    });
    aura.addChild(auraGlow, auraRingOuter, auraRingInner, ...genkiStars, ...charmHearts);

    const trails = new Container();
    const sprite = new Sprite(texture);
    sprite.anchor.set(.5, 1);
    const petrifyColorFilter = new ColorMatrixFilter();
    petrifyColorFilter.blackAndWhite(true);
    const petrifyNoiseFilter = new NoiseFilter({ noise: .12, seed: side === "hero" ? .31 : .67 });
    const petrifyCracks = new Graphics();
    [
      [-.32, -.82, -.12, -.61, -.2, -.43],
      [.2, -.9, .06, -.72, .18, -.55, .11, -.37],
      [-.42, -.54, -.28, -.43, -.36, -.25],
      [.35, -.64, .25, -.48, .4, -.32],
    ].forEach((points) => {
      petrifyCracks.moveTo(points[0], points[1]);
      for (let index = 2; index < points.length; index += 2) petrifyCracks.lineTo(points[index], points[index + 1]);
    });
    petrifyCracks.stroke({ color: 0x303841, alpha: .82, width: .018 });
    petrifyCracks.visible = false;
    container.addChild(aura, trails, sprite, petrifyCracks);
    layer.addChild(container);

    return {
      side,
      container,
      aura,
      auraGlow,
      auraRingOuter,
      auraRingInner,
      genkiStars,
      charmHearts,
      trails,
      sprite,
      petrifyColorFilter,
      petrifyNoiseFilter,
      petrifyCracks,
      source: elements[side].image.getAttribute("src") || elements[side].image.currentSrc,
      classes: new Set(elements[side].root.classList),
      actionStartedAt: performance.now(),
      knockoutStartedAt: 0,
      pinnedStartedAt: 0,
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
      closingMotion: null,
      presentationScale: 1,
      presentationYOffset: 0,
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
    const shouldSwapImmediately = elements[side].root.classList.contains("fighter-walking");
    const token = ++actor.textureToken;
    try {
      const texture = await Assets.load(resolveActorUrl(source));
      if (token !== actor.textureToken) return;
      if (shouldSwapImmediately) {
        actor.sprite.texture = texture;
        actor.sprite.alpha = 1;
        actor.transitionStartedAt = 0;
        textureScale(actor.sprite, actor.size, actorFacing(actor));
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
      textureScale(actor.sprite, actor.size, actorFacing(actor));
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
    const wasKnockedOut = actor.classes.has("ko-pending");
    const isKnockedOut = nextClasses.has("ko-pending");
    if (!wasKnockedOut && isKnockedOut) actor.knockoutStartedAt = performance.now();
    if (!isKnockedOut && !nextClasses.has("result-loser")) actor.knockoutStartedAt = 0;
    if (!actor.classes.has("tatsuo-pinned") && nextClasses.has("tatsuo-pinned")) {
      actor.pinnedStartedAt = performance.now();
    }
    if (!nextClasses.has("tatsuo-pinned")) actor.pinnedStartedAt = 0;
    const signature = ACTION_CLASSES.filter((name) => nextClasses.has(name)).join("|");
    if (signature !== actor.classSignature) {
      if (nextClasses.has("dodging") && !actor.classes.has("dodging")) createDodgeTrails(actor);
      actor.classSignature = signature;
      actor.actionStartedAt = performance.now();
    }
    if (actor.classes.has("pentagram-nova-sequence") && !nextClasses.has("pentagram-nova-sequence")) {
      actor.scriptedMotion = null;
    }
    if (actor.classes.has("closing-time-dash-sequence") && !nextClasses.has("closing-time-dash-sequence")) {
      actor.scriptedMotion = null;
    }
    if (actor.classes.has("tatsuo-restraint-sequence") && !nextClasses.has("tatsuo-restraint-sequence")) {
      actor.scriptedMotion = null;
    }
    if (actor.classes.has("tatsuo-press-sequence") && !nextClasses.has("tatsuo-press-sequence")) {
      actor.scriptedMotion = null;
    }
    actor.classes = nextClasses;
    actor.container.zIndex = getFighterDepth(side, nextClasses);
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
    if (actor.classes.has("closing-distance") && actor.scriptedMotion?.type === "closingTimeDash") {
      const destination = actor.scriptedMotion.keyframes.at(-1);
      destination.x = x;
      destination.y = groundY - size * .5;
      actor.baseX = x;
      actor.closingMotion = null;
    } else if (actor.classes.has("closing-distance")) {
      if (!actor.closingMotion && Math.abs(x - actor.baseX) > .5) {
        actor.closingMotion = { fromX: actor.baseX, targetX: x, startedAt: performance.now(), duration: 480 };
      } else if (actor.closingMotion) {
        actor.closingMotion.targetX = x;
      }
    } else {
      actor.baseX = x;
      actor.closingMotion = null;
    }
    actor.baseY = groundY;
    actor.size = size;
    textureScale(actor.sprite, size, actorFacing(actor));
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
    } else if (type === "closingTimeDash") {
      const opponent = actors[side === "hero" ? "enemy" : "hero"];
      const direction = opponent.baseX >= actor.baseX ? 1 : -1;
      const contactGap = Math.max(actor.size, opponent.size) * .52;
      const contact = {
        x: opponent.baseX - direction * contactGap,
        y: actor.baseY - actor.size * .5,
      };
      keyframes = [
        { ...currentCenter, rotation: 0, scale: 1, offset: 0 },
        { x: currentCenter.x - direction * actor.size * .07, y: currentCenter.y + actor.size * .035, rotation: direction * .1, scale: .94, offset: .16 },
        { x: currentCenter.x, y: currentCenter.y - actor.size * .025, rotation: direction * -.08, scale: 1.04, offset: .27 },
        { x: contact.x - direction * actor.size * .12, y: contact.y - actor.size * .025, rotation: direction * -.15, scale: 1.12, offset: .78 },
        { ...contact, rotation: direction * -.08, scale: 1.16, offset: 1 },
      ];
    } else if (type === "tatsuoRestraint") {
      const opponent = actors[side === "hero" ? "enemy" : "hero"];
      const direction = opponent.baseX >= actor.baseX ? 1 : -1;
      const contactGap = Math.max(actor.size, opponent.size) * .42;
      const contact = {
        x: opponent.baseX - direction * contactGap,
        y: actor.baseY - actor.size * .5,
      };
      keyframes = [
        { ...currentCenter, rotation: 0, scale: 1, offset: 0 },
        { x: currentCenter.x - direction * actor.size * .03, y: currentCenter.y + actor.size * .035, rotation: direction * .07, scale: .97, offset: .08 },
        { x: currentCenter.x + direction * actor.size * .14, y: currentCenter.y - actor.size * .035, rotation: direction * -.07, scale: 1.05, offset: .2 },
        { x: contact.x - direction * actor.size * .12, y: contact.y - actor.size * .035, rotation: direction * -.13, scale: 1.11, offset: .68 },
        { ...contact, rotation: direction * -.04, scale: 1.13, offset: 1 },
      ];
    } else if (type === "tatsuoPress") {
      const opponent = actors[side === "hero" ? "enemy" : "hero"];
      const direction = opponent.baseX >= actor.baseX ? 1 : -1;
      const aboveHead = {
        x: opponent.baseX - direction * actor.size * .04,
        y: Math.max(actor.size * .4, opponent.baseY - opponent.size * 2.05),
      };
      const impact = {
        x: opponent.baseX - direction * actor.size * .03,
        y: opponent.baseY - opponent.size * .5,
      };
      keyframes = [
        { ...currentCenter, rotation: 0, scale: 1, offset: 0 },
        { x: currentCenter.x - direction * actor.size * .08, y: currentCenter.y + actor.size * .05, rotation: direction * .08, scale: .94, offset: .1 },
        { x: currentCenter.x + direction * actor.size * .18, y: currentCenter.y - actor.size * .52, rotation: direction * -.12, scale: 1.02, offset: .34 },
        { ...aboveHead, rotation: direction * -.2, scale: 1.08, offset: .56 },
        { ...aboveHead, rotation: direction * -.2, scale: 1.1, offset: .64 },
        { ...impact, rotation: 0, scale: 1.28, verticalEasing: "gravity", offset: 1 },
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
    let offsetY = classes.has("status-petrified") ? 0 : -Math.sin(elapsed * Math.PI * 2 / 2.1) * actor.size * .014;
    let rotation = 0;
    let scale = 1;
    let horizontalScale = 1;
    let alpha = 1;
    let tint = 0xffffff;

    if (actor.closingMotion) {
      const progress = Math.min(1, (now - actor.closingMotion.startedAt) / actor.closingMotion.duration);
      actor.baseX = actor.closingMotion.fromX
        + (actor.closingMotion.targetX - actor.closingMotion.fromX) * easeOutCubic(progress);
    }

    if (classes.has("moving-forward") || classes.has("moving-back") || classes.has("fighter-walking")) {
      offsetY -= Math.abs(Math.sin(elapsed * 12)) * actor.size * .025;
      rotation = Math.sin(elapsed * 12) * .025 * direction;
    }
    if (classes.has("casting") || classes.has("ultimate-sequence") || classes.has("special-action") || classes.has("etoile-drive-sequence")) {
      scale += .045 + Math.sin(elapsed * 10) * .025;
      offsetY -= actor.size * .025;
      tint = actor.side === "hero" ? 0xfff3b0 : 0xd8bbff;
    }
    if (classes.has("special-action-zone")) {
      const surge = Math.sin(Math.min(1, actionSeconds / 1.4) * Math.PI);
      offsetY -= actor.size * .08 * surge;
      scale += .12 * surge;
      tint = 0xc9fbff;
    }
    if (["attack-light", "physical-punch-sequence", "star-ring-sequence", "meteor-claw-sequence", "crescent-horn-sequence"].some((name) => classes.has(name))) {
      const lunge = Math.sin(Math.min(1, actionSeconds / .55) * Math.PI);
      offsetX += direction * actor.size * .12 * lunge;
      rotation = direction * -.06 * lunge;
      scale += .07 * lunge;
    }
    if (classes.has("sutekichi-star-touch-sequence")) {
      const hop = Math.sin(Math.min(1, actionSeconds / 1.1) * Math.PI * 2);
      offsetX += direction * actor.size * (.08 + Math.max(0, hop) * .11);
      offsetY -= Math.abs(hop) * actor.size * .12;
      rotation = direction * Math.sin(actionSeconds * 8) * .08;
      scale += Math.max(0, hop) * .08;
    }
    if (classes.has("sutekichi-halo-skip-sequence")) {
      const skipProgress = Math.min(1, actionSeconds / 1.8);
      offsetX += direction * actor.size * .2 * Math.sin(skipProgress * Math.PI);
      offsetY -= actor.size * .28 * Math.sin(skipProgress * Math.PI);
      rotation = direction * -.24 * Math.sin(skipProgress * Math.PI * 2);
      scale += .09 * Math.sin(skipProgress * Math.PI);
    }
    if (classes.has("sutekichi-stella-search-sequence")) {
      offsetY -= actor.size * (.035 + Math.sin(elapsed * 5) * .02);
      rotation = direction * (Math.sin(elapsed * 3.2) * .025 - .035);
      scale += .035 + Math.sin(elapsed * 7) * .018;
      tint = 0xdffcff;
    }
    if (classes.has("sutekichi-comet-sequence")) {
      const charge = Math.min(1, actionSeconds / 1.5);
      offsetY -= actor.size * (.04 + charge * .12);
      rotation = direction * Math.sin(elapsed * 4.5) * .045;
      scale += charge * .12 + Math.sin(elapsed * 8) * .025;
      tint = 0xfff0a4;
    }
    if (classes.has("sutekichi-nap-sequence")) {
      const settle = easeOutCubic(Math.min(1, actionSeconds / .8));
      offsetY += actor.size * .12 * settle;
      rotation = direction * (.07 + Math.sin(elapsed * 1.9) * .025);
      scale *= 1 - settle * .08 + Math.sin(elapsed * 2.1) * .01;
      tint = 0xe8f6ff;
    }
    if (classes.has("business-card-strike-sequence")) {
      const slash = Math.sin(Math.min(1, actionSeconds / .72) * Math.PI);
      offsetX += direction * actor.size * .16 * slash;
      rotation -= direction * .12 * slash;
      scale += .08 * slash;
    }
    if (classes.has("closing-time-dash-sequence") && !actor.scriptedMotion) {
      const dash = Math.sin(Math.min(1, actionSeconds / .55) * Math.PI);
      offsetX += direction * actor.size * .3 * dash;
      offsetY -= actor.size * .035 * dash;
      rotation -= direction * .16 * dash;
      scale += .11 * dash;
    }
    if (classes.has("angel-wink-sequence")) {
      const winkProgress = Math.max(0, Math.min(1, (actionSeconds - .12) / .36));
      const wink = Math.sin(winkProgress * Math.PI);
      offsetY -= actor.size * .01 * wink;
      rotation = direction * .012 * wink;
      scale += .015 * wink;
      tint = 0xffe7f4;
    }
    if (classes.has("approval-meteor-sequence")) {
      const charge = Math.min(1, actionSeconds / 1.55);
      offsetY -= actor.size * (.04 + charge * .11);
      rotation = direction * Math.sin(elapsed * 4.2) * .025;
      scale += charge * .13 + Math.sin(elapsed * 8) * .018;
      tint = 0xffeb9b;
    }
    if (classes.has("tatsuo-slap-sequence")) {
      const progress = Math.min(1, actionSeconds / .42);
      const snap = Math.sin(progress * Math.PI);
      offsetX += direction * actor.size * .28 * snap;
      rotation -= direction * .2 * snap;
      scale += .12 * snap;
    }
    if (classes.has("tatsuo-restraint-sequence") && !actor.scriptedMotion) {
      const drop = Math.sin(Math.min(1, actionSeconds / 1.15) * Math.PI);
      offsetX += direction * actor.size * .15 * drop;
      offsetY += actor.size * .08 * drop;
      scale += .08 * drop;
    }
    if (classes.has("tatsuo-roar-sequence")) {
      const roar = Math.sin(Math.min(1, actionSeconds / 1.45) * Math.PI);
      offsetX -= direction * actor.size * .04 * roar;
      scale += .13 * roar;
      tint = 0xffd39d;
    }
    if (classes.has("tatsuo-press-sequence") && !actor.scriptedMotion) {
      const leap = Math.sin(Math.min(1, actionSeconds / 2.25) * Math.PI);
      offsetX += direction * actor.size * .28 * leap;
      offsetY -= actor.size * .34 * leap;
      rotation -= direction * .22 * leap;
      scale += .12 * leap;
    }
    if (classes.has("aster-tail-sweep-sequence")) {
      const spinProgress = Math.min(1, actionSeconds / 1.05);
      const spinAngle = spinProgress * Math.PI * 2;
      horizontalScale *= Math.cos(spinAngle);
      offsetX += direction * actor.size * .1 * Math.sin(spinAngle);
      offsetY -= actor.size * .045 * Math.sin(spinProgress * Math.PI);
      rotation += direction * .08 * Math.sin(spinAngle);
      scale += .1 * Math.sin(spinProgress * Math.PI);
    }
    if (classes.has("status-charm")) {
      rotation += Math.sin(elapsed * 3.4) * .045;
      offsetX += Math.sin(elapsed * 2.7) * actor.size * .012;
      tint = 0xffe7f4;
    }
    if (classes.has("galaxy-ray-recoil") || classes.has("technique-recoil")) offsetX -= direction * actor.size * .08;
    if (classes.has("hurt") || classes.has("critical-hit")) {
      const decay = Math.max(0, 1 - actionSeconds / .78);
      offsetX += Math.sin(actionSeconds * 72) * actor.size * .055 * decay;
      rotation += Math.sin(actionSeconds * 55) * .08 * decay;
      tint = 0xffffff;
      scale += classes.has("critical-hit") ? .1 * decay : .045 * decay;
    }
    if (classes.has("tatsuo-pinned")) {
      const pinnedSeconds = (now - actor.pinnedStartedAt) / 1000;
      const pin = easeOutCubic(Math.min(1, pinnedSeconds / .18));
      offsetX += direction * actor.size * .8 * pin;
      offsetY -= actor.size * .35 * pin;
      rotation += Math.PI * .5 * pin;
      horizontalScale *= 1 - .28 * pin;
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
    if (classes.has("ko-pending")) {
      const knockoutSeconds = (now - actor.knockoutStartedAt) / 1000;
      const progress = easeOutCubic(Math.min(1, knockoutSeconds / .65));
      rotation += direction * -1.15 * progress;
      offsetY += actor.size * .18 * progress;
      alpha = 1 - progress * .22;
    } else if (classes.has("result-loser")) {
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
    const configuredCompensation = Number.parseFloat(
      elements[actor.side].root.style.getPropertyValue("--presentation-scale-compensation"),
    ) || 1;
    const configuredYOffset = Number.parseFloat(
      elements[actor.side].root.style.getPropertyValue("--presentation-y-offset-ratio"),
    ) || 0;
    const compensatePresentation =
      (isCameraTarget && classes.has("special-action")) ||
      classes.has("flash-knockback") ||
      classes.has("blown-right") ||
      classes.has("blown-left");
    const presentationScaleTarget = compensatePresentation ? configuredCompensation : 1;
    const presentationYOffsetTarget = compensatePresentation ? configuredYOffset : 0;
    actor.presentationScale += (presentationScaleTarget - actor.presentationScale) * .22;
    actor.presentationYOffset += (presentationYOffsetTarget - actor.presentationYOffset) * .22;
    scale *= actor.presentationScale;
    positionY += actor.size * actor.presentationYOffset;

    actor.container.position.set(positionX, positionY);
    actor.container.rotation = rotation;
    actor.container.scale.set(scale * horizontalScale, scale);
    actor.sprite.alpha = alpha;
    const petrified = classes.has("status-petrified");
    actor.sprite.tint = petrified ? 0xa7afb7 : tint;
    actor.sprite.filters = petrified ? [actor.petrifyColorFilter, actor.petrifyNoiseFilter] : null;
    actor.petrifyNoiseFilter.seed = (Math.floor(elapsed * 3) % 100) / 100;
    actor.petrifyCracks.visible = petrified;
    actor.petrifyCracks.scale.set(actor.size);
    actor.petrifyCracks.alpha = petrified ? .62 + Math.sin(elapsed * 5) * .06 : 0;
    textureScale(actor.sprite, actor.size, actorFacing(actor));

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
    const genkiActive = classes.has("status-genki");
    actor.genkiStars.forEach((star, index) => {
      star.visible = genkiActive;
      if (!genkiActive) return;
      const angle = elapsed * (index % 2 === 0 ? 1.7 : -1.25) + index * Math.PI * 2 / actor.genkiStars.length;
      const radius = actor.size * (.5 + index % 3 * .045);
      star.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * .72);
      star.rotation = -angle + elapsed * 1.8;
      const starSize = actor.size * (.055 + index % 2 * .012) * (.9 + Math.sin(elapsed * 5 + index) * .14);
      star.scale.set(starSize);
      star.alpha = .72 + Math.sin(elapsed * 6 + index) * .2;
    });
    const charmActive = classes.has("status-charm");
    actor.charmHearts.forEach((heart, index) => {
      heart.visible = charmActive;
      if (!charmActive) return;
      const angle = elapsed * 1.8 + index * Math.PI * 2 / actor.charmHearts.length;
      const radius = actor.size * (.38 + index % 2 * .06);
      heart.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * .28 - actor.size * .33);
      heart.rotation = -angle * .25;
      const heartSize = actor.size * (.04 + index % 3 * .008) * (.9 + Math.sin(elapsed * 6 + index) * .18);
      heart.scale.set(heartSize);
      heart.alpha = .66 + Math.sin(elapsed * 7 + index) * .24;
    });

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

  function getScreenPoint(side, xRatio = .5, yRatio = .5) {
    const actor = actors[side];
    return actor.container.toGlobal({
      x: (xRatio - .5) * actor.size,
      y: -actor.size * (1 - yRatio),
    });
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
    getScreenPoint,
    getBasePoint,
    destroy() { observer.disconnect(); },
  };
}
