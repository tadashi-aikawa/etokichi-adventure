import { Container, Graphics, Sprite } from "pixi.js";

const COLORS = {
  gold: 0xffd84f,
  cyan: 0x79ecff,
  violet: 0x9b5cff,
  pink: 0xff5aaa,
  white: 0xffffff,
  ember: 0xff7a32,
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const easeOut = (value) => 1 - (1 - value) ** 3;
const easeInOut = (value) => value < .5 ? 4 * value ** 3 : 1 - ((-2 * value + 2) ** 3) / 2;

function drawStar(graphics, radius, color = COLORS.white, alpha = 1) {
  const points = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const distance = index % 2 ? radius * .42 : radius;
    points.push(Math.cos(angle) * distance, Math.sin(angle) * distance);
  }
  graphics.poly(points).fill({ color, alpha });
  return graphics;
}

function drawHeart(graphics, size, color) {
  graphics
    .circle(-size * .22, -size * .12, size * .28)
    .circle(size * .22, -size * .12, size * .28)
    .poly([-size * .46, 0, 0, size * .55, size * .46, 0])
    .fill({ color });
  return graphics;
}

export function createEffectSystem({ layer, glowTexture, getActorPoint, getScreen }) {
  const active = [];

  function glow(color, size, alpha = .75) {
    const sprite = new Sprite(glowTexture);
    sprite.anchor.set(.5);
    sprite.tint = color;
    sprite.alpha = alpha;
    sprite.width = size;
    sprite.height = size;
    sprite.blendMode = "add";
    return sprite;
  }

  function add(container, duration, update) {
    const effect = { container, duration, update, startedAt: performance.now() };
    active.push(effect);
    layer.addChild(container);
    update?.(0, 0, effect);
    return true;
  }

  function point(side, xRatio = .5, yRatio = .5) {
    return getActorPoint(side, xRatio, yRatio);
  }

  function makeBurst({ side = "enemy", xRatio = .5, yRatio = .54, color = COLORS.gold, secondary = COLORS.white, duration = 760, radius = 150, count = 12, critical = false }) {
    const container = new Container();
    const core = glow(secondary, radius * .85, .92);
    const halo = glow(color, radius * 1.45, .62);
    const ring = new Graphics().circle(0, 0, radius * .28).stroke({ color: secondary, alpha: .95, width: 5 });
    const ringOuter = new Graphics().circle(0, 0, radius * .42).stroke({ color, alpha: .8, width: 4 });
    const rays = new Container();
    const particles = [];
    for (let index = 0; index < count; index += 1) {
      const angle = index * Math.PI * 2 / count + (index % 2) * .08;
      const ray = new Graphics().roundRect(0, -2, radius * (.38 + Math.random() * .28), critical ? 6 : 4, 3).fill({ color: index % 3 ? color : secondary, alpha: .9 });
      ray.rotation = angle;
      rays.addChild(ray);
      const mote = glow(index % 3 ? color : secondary, 9 + Math.random() * 9, .95);
      container.addChild(mote);
      particles.push({ sprite: mote, angle, distance: radius * (.65 + Math.random() * .75) });
    }
    container.addChildAt(halo, 0);
    container.addChildAt(core, 1);
    container.addChildAt(ring, 2);
    container.addChildAt(ringOuter, 3);
    container.addChildAt(rays, 4);
    const origin = point(side, xRatio, yRatio);
    container.position.copyFrom(origin);
    return add(container, duration, (progress) => {
      const eased = easeOut(progress);
      core.scale.set(.25 + eased * 1.5);
      core.alpha = (1 - progress) * .92;
      halo.scale.set(.42 + eased * 1.9);
      halo.alpha = (1 - progress) * .58;
      ring.scale.set(.15 + eased * 1.85);
      ringOuter.scale.set(.08 + eased * 2.35);
      ring.alpha = 1 - progress;
      ringOuter.alpha = 1 - progress;
      rays.scale.x = .12 + eased * 1.25;
      rays.alpha = 1 - progress;
      particles.forEach(({ sprite, angle, distance }, index) => {
        const travel = distance * eased;
        sprite.position.set(Math.cos(angle) * travel, Math.sin(angle) * travel);
        sprite.alpha = (1 - progress) * (.7 + (index % 3) * .12);
      });
    });
  }

  function makeCharge({ side = "hero", xRatio = .72, yRatio = .5, color = COLORS.gold, secondary = COLORS.cyan, duration = 1600, radius = 95, count = 12 }) {
    const container = new Container();
    const halo = glow(color, radius * 2.4, .48);
    const core = glow(COLORS.white, radius * .8, .92);
    const ring = new Graphics().circle(0, 0, radius * .56).stroke({ color, alpha: .86, width: 4 });
    const ringTwo = new Graphics().circle(0, 0, radius * .78).stroke({ color: secondary, alpha: .64, width: 3 });
    const particles = [];
    container.addChild(halo, ringTwo, ring, core);
    for (let index = 0; index < count; index += 1) {
      const mote = index % 4 === 0 ? drawStar(new Graphics(), 7, COLORS.white) : glow(index % 3 ? color : secondary, 8, .9);
      mote.blendMode = "add";
      container.addChild(mote);
      particles.push({ sprite: mote, angle: index * Math.PI * 2 / count, phase: index * .61, radius: radius * (.85 + Math.random() * .55) });
    }
    return add(container, duration, (progress, elapsed) => {
      const origin = point(side, xRatio, yRatio);
      container.position.copyFrom(origin);
      const pulse = 1 + Math.sin(elapsed * 9) * .08;
      halo.scale.set(pulse * (1 + progress * .38));
      halo.alpha = (.3 + Math.sin(elapsed * 7) * .08) * (1 - progress * .45);
      core.scale.set(.55 + progress * .5 + Math.sin(elapsed * 12) * .08);
      core.alpha = .65 + Math.sin(elapsed * 11) * .22;
      ring.rotation = elapsed * 1.5;
      ringTwo.rotation = -elapsed * 1.1;
      ring.scale.set(.7 + progress * .45);
      ringTwo.scale.set(.7 + progress * .65);
      particles.forEach(({ sprite, angle, phase, radius: orbitRadius }) => {
        const currentAngle = angle + elapsed * (1.2 + (phase % .7));
        const distance = orbitRadius * (1 - progress * .7);
        sprite.position.set(Math.cos(currentAngle) * distance, Math.sin(currentAngle) * distance * .65);
        sprite.rotation = -currentAngle;
        sprite.alpha = .55 + Math.sin(elapsed * 8 + phase) * .35;
      });
      container.alpha = progress > .86 ? (1 - progress) / .14 : 1;
    });
  }

  function makeBeam({ from = "hero", to = "enemy", fromRatio = [.76, .5], toRatio = [.48, .52], color = COLORS.gold, secondary = COLORS.cyan, width = 34, duration = 900, projectile = false, reverse = false }) {
    const origin = point(from, fromRatio[0], fromRatio[1]);
    const target = point(to, toRatio[0], toRatio[1]);
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const length = Math.max(80, Math.hypot(dx, dy));
    const container = new Container();
    container.position.copyFrom(origin);
    container.rotation = Math.atan2(dy, dx);
    const outer = new Graphics().roundRect(0, -width * .72, length, width * 1.44, width).fill({ color: secondary, alpha: .28 });
    const body = new Graphics().roundRect(0, -width * .42, length, width * .84, width).fill({ color, alpha: .9 });
    const core = new Graphics().roundRect(0, -width * .14, length, width * .28, width).fill({ color: COLORS.white, alpha: .98 });
    const head = glow(COLORS.white, width * 4.2, .9);
    head.position.x = length;
    const motes = [];
    container.addChild(outer, body, core, head);
    for (let index = 0; index < 10; index += 1) {
      const mote = glow(index % 2 ? color : secondary, 7 + (index % 3) * 3, .85);
      container.addChild(mote);
      motes.push({ sprite: mote, offset: index / 10, y: (Math.random() - .5) * width * 2.4 });
    }
    return add(container, duration, (progress, elapsed) => {
      const travel = easeInOut(clamp01(progress * (projectile ? 1.05 : 1.65)));
      if (projectile) {
        const visibleLength = Math.min(length * .38, 190);
        container.position.set(origin.x + dx * travel, origin.y + dy * travel);
        outer.width = visibleLength;
        body.width = visibleLength;
        core.width = visibleLength;
        head.position.x = reverse ? 0 : visibleLength;
      } else {
        const reveal = Math.min(1, progress * 3.2);
        outer.scale.x = reveal;
        body.scale.x = reveal;
        core.scale.x = reveal;
        head.position.x = length * reveal;
      }
      outer.alpha = (.22 + Math.sin(elapsed * 20) * .08) * (1 - Math.max(0, progress - .78) / .22);
      body.alpha = (.72 + Math.sin(elapsed * 24) * .18) * (1 - Math.max(0, progress - .82) / .18);
      core.alpha = .85 + Math.sin(elapsed * 32) * .15;
      head.scale.set(.75 + Math.sin(elapsed * 18) * .18);
      motes.forEach(({ sprite, offset, y }) => {
        sprite.position.set((elapsed * length * 1.8 + offset * length) % length, y + Math.sin(elapsed * 8 + offset * 9) * width * .4);
        sprite.alpha = (1 - progress) * .82;
      });
      container.alpha = progress > .88 ? (1 - progress) / .12 : 1;
    });
  }

  function makeEnergyProjectile({ from = "hero", to = "enemy", color = COLORS.gold, secondary = COLORS.white, duration = 520 }) {
    const origin = point(from, from === "hero" ? .72 : .28, .5);
    const target = point(to, .5, .52);
    const container = new Container();
    const direction = target.x >= origin.x ? 1 : -1;
    const tail = new Graphics()
      .poly([0, -13, -direction * 92, -4, -direction * 126, 0, -direction * 92, 4, 0, 13])
      .fill({ color, alpha: .55 });
    const halo = glow(color, 105, .62);
    const core = glow(secondary, 58, .96);
    const shell = new Graphics().ellipse(0, 0, 29, 17).stroke({ color: secondary, alpha: .9, width: 4 });
    container.addChild(tail, halo, core, shell);
    return add(container, duration, (progress, elapsed) => {
      const travel = easeInOut(progress);
      container.position.set(
        origin.x + (target.x - origin.x) * travel,
        origin.y + (target.y - origin.y) * travel - Math.sin(progress * Math.PI) * 12,
      );
      container.rotation = Math.atan2(target.y - origin.y, target.x - origin.x);
      container.scale.set(.65 + Math.sin(progress * Math.PI) * .55);
      halo.scale.set(.8 + Math.sin(elapsed * 25) * .14);
      core.scale.set(.78 + Math.sin(elapsed * 31) * .12);
      container.alpha = progress > .82 ? (1 - progress) / .18 : 1;
    });
  }

  function makeHeartProjectile() {
    const origin = point("hero", .76, .42);
    const target = point("enemy", .48, .48);
    const container = new Container();
    const halo = glow(COLORS.pink, 145, .52);
    const heart = drawHeart(new Graphics(), 74, COLORS.pink);
    const highlight = drawHeart(new Graphics(), 39, 0xffd9ec);
    highlight.position.set(-7, -7);
    const trail = [];
    container.addChild(halo, heart, highlight);
    for (let index = 0; index < 9; index += 1) {
      const mote = index % 3 === 0
        ? drawStar(new Graphics(), 6, COLORS.white)
        : drawHeart(new Graphics(), 18 - index % 3 * 3, index % 2 ? 0xff9aca : COLORS.pink);
      mote.blendMode = "add";
      container.addChildAt(mote, 0);
      trail.push({ sprite: mote, lag: .035 + index * .032, wave: (index % 2 ? 1 : -1) * (10 + index * 2) });
    }
    return add(container, 980, (progress, elapsed) => {
      const travel = easeInOut(Math.min(1, progress * 1.08));
      const arc = -Math.sin(travel * Math.PI) * 24;
      container.position.set(origin.x + (target.x - origin.x) * travel, origin.y + (target.y - origin.y) * travel + arc);
      const pulse = 1 + Math.sin(elapsed * 34) * .08;
      heart.scale.set(pulse);
      highlight.scale.set(pulse * .92);
      halo.scale.set(.85 + Math.sin(elapsed * 21) * .14);
      container.rotation = -.12 + travel * .3;
      trail.forEach(({ sprite, lag, wave }) => {
        const previous = clamp01(travel - lag);
        sprite.position.set(
          (origin.x + (target.x - origin.x) * previous) - container.x,
          (origin.y + (target.y - origin.y) * previous - Math.sin(previous * Math.PI) * 24) - container.y + Math.sin(elapsed * 9 + lag * 30) * wave,
        );
        sprite.rotation = -container.rotation + elapsed * 1.8;
        sprite.alpha = travel > lag ? (1 - progress) * .86 : 0;
      });
      container.alpha = progress > .82 ? (1 - progress) / .18 : 1;
    });
  }

  function makeKissCharge() {
    const container = new Container();
    const halo = glow(COLORS.pink, 135, .42);
    const heart = drawHeart(new Graphics(), 48, COLORS.pink);
    const highlight = drawHeart(new Graphics(), 24, 0xffe1ef);
    highlight.position.set(-4, -5);
    const sparkles = [];
    container.addChild(halo, heart, highlight);
    for (let index = 0; index < 8; index += 1) {
      const sparkle = index % 2
        ? drawHeart(new Graphics(), 13, 0xff9aca)
        : drawStar(new Graphics(), 6, COLORS.white);
      sparkle.blendMode = "add";
      container.addChild(sparkle);
      sparkles.push({ sprite: sparkle, angle: index * Math.PI / 4, phase: index * .72 });
    }
    return add(container, 1050, (progress, elapsed) => {
      container.position.copyFrom(point("hero", .73, .42));
      const gather = 1 - progress * .66;
      const pulse = .72 + progress * .42 + Math.sin(elapsed * 27) * .09;
      heart.scale.set(pulse);
      highlight.scale.set(pulse * .9);
      halo.scale.set(.8 + progress * .55 + Math.sin(elapsed * 18) * .12);
      sparkles.forEach(({ sprite, angle, phase }) => {
        const currentAngle = angle + elapsed * 1.8;
        const radius = (62 + Math.sin(elapsed * 6 + phase) * 10) * gather;
        sprite.position.set(Math.cos(currentAngle) * radius, Math.sin(currentAngle) * radius);
        sprite.rotation = -currentAngle;
        sprite.alpha = .45 + Math.sin(elapsed * 10 + phase) * .35;
      });
      container.alpha = progress > .86 ? (1 - progress) / .14 : 1;
    });
  }

  function makeKissBurst(miss = false) {
    const container = new Container();
    const color = miss ? 0xff9ac8 : COLORS.pink;
    const halo = glow(color, miss ? 180 : 245, miss ? .36 : .58);
    const centerHeart = drawHeart(new Graphics(), miss ? 62 : 92, color);
    const ring = new Graphics().circle(0, 0, miss ? 44 : 58).stroke({ color: COLORS.white, alpha: .72, width: 5 });
    const shards = [];
    container.addChild(halo, ring, centerHeart);
    const count = miss ? 8 : 14;
    for (let index = 0; index < count; index += 1) {
      const shard = index % 4 === 0
        ? drawStar(new Graphics(), 7, COLORS.white)
        : drawHeart(new Graphics(), 17 - index % 3 * 2, index % 2 ? color : 0xffc1df);
      shard.blendMode = "add";
      container.addChild(shard);
      shards.push({
        sprite: shard,
        angle: index * Math.PI * 2 / count + (miss ? (Math.random() - .5) * .4 : 0),
        distance: (miss ? 75 : 105) + Math.random() * (miss ? 70 : 95),
      });
    }
    container.position.copyFrom(point("enemy", .48, .48));
    return add(container, miss ? 920 : 1100, (progress, elapsed) => {
      const expansion = easeOut(progress);
      centerHeart.scale.set((miss ? .8 : .3) + Math.sin(progress * Math.PI) * (miss ? .55 : 1.2));
      centerHeart.rotation = miss ? elapsed * .9 : Math.sin(elapsed * 8) * .08;
      centerHeart.alpha = 1 - progress;
      halo.scale.set(.35 + expansion * 1.7);
      halo.alpha = (1 - progress) * (miss ? .35 : .58);
      ring.scale.set(.2 + expansion * 2.1);
      ring.alpha = 1 - progress;
      shards.forEach(({ sprite, angle, distance }) => {
        const travel = distance * expansion;
        sprite.position.set(Math.cos(angle) * travel, Math.sin(angle) * travel);
        sprite.rotation = -angle + elapsed * (miss ? 2.4 : 1.2);
        sprite.alpha = Math.sin(progress * Math.PI);
      });
    });
  }

  function makeCrescentRush() {
    const origin = point("enemy", .34, .58);
    const target = point("hero", .58, .58);
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const length = Math.max(150, Math.hypot(dx, dy));
    const container = new Container();
    container.position.copyFrom(origin);
    container.rotation = Math.atan2(dy, dx);
    const pressure = new Graphics()
      .poly([0, -22, length - 64, -56, length, 0, length - 64, 56, 0, 22])
      .fill({ color: COLORS.violet, alpha: .48 });
    const pressureCore = new Graphics()
      .poly([0, -7, length - 28, -17, length, 0, length - 28, 17, 0, 7])
      .fill({ color: 0xd8c4ff, alpha: .82 });
    const crescentGlow = glow(COLORS.violet, 190, .55);
    const crescent = new Graphics().arc(0, 0, 66, -1.25, 1.25).stroke({ color: 0xeee4ff, alpha: .96, width: 13 });
    const crescentInner = new Graphics().arc(0, 0, 51, -1.2, 1.2).stroke({ color: COLORS.violet, alpha: .85, width: 6 });
    crescentGlow.x = length;
    crescent.position.set(length, 0);
    crescentInner.position.set(length, 0);
    const speedLines = [];
    container.addChild(pressure, pressureCore, crescentGlow, crescent, crescentInner);
    for (let index = 0; index < 5; index += 1) {
      const line = new Graphics().roundRect(0, -2, length * .72, 4, 2).fill({ color: index % 2 ? COLORS.violet : 0xd8c4ff, alpha: .7 });
      line.y = (index - 2) * 18;
      container.addChild(line);
      speedLines.push(line);
    }
    return add(container, 1050, (progress, elapsed) => {
      const reveal = Math.min(1, easeOut(progress * 4.8));
      pressure.scale.x = reveal;
      pressureCore.scale.x = reveal;
      const headX = length * reveal;
      crescentGlow.x = headX;
      crescent.x = headX;
      crescentInner.x = headX;
      crescent.rotation = Math.sin(elapsed * 13) * .08;
      crescentInner.rotation = -crescent.rotation;
      speedLines.forEach((line, index) => {
        line.x = -((elapsed * 260 + index * 67) % 120);
        line.alpha = (1 - progress) * .7;
      });
      container.alpha = progress > .76 ? (1 - progress) / .24 : 1;
      container.scale.y = .85 + Math.sin(elapsed * 18) * .1;
    });
  }

  function makeGalaxyCharge() {
    const container = new Container();
    const violetHalo = glow(0x5120b7, 300, .48);
    const cyanCloud = glow(COLORS.cyan, 190, .3);
    const magentaCloud = glow(COLORS.pink, 220, .34);
    const accretionOuter = new Graphics().ellipse(0, 0, 82, 34).stroke({ color: 0xb070ff, alpha: .9, width: 7 });
    const accretionInner = new Graphics().ellipse(0, 0, 58, 22).stroke({ color: COLORS.cyan, alpha: .9, width: 5 });
    const coreGlow = glow(COLORS.white, 78, .95);
    const voidCore = new Graphics()
      .circle(0, 0, 18)
      .fill({ color: 0x070218, alpha: .98 })
      .stroke({ color: 0xff86e8, alpha: .9, width: 3 });
    const dust = [];
    const stars = [];
    container.addChild(violetHalo, magentaCloud, cyanCloud, accretionOuter, accretionInner, coreGlow, voidCore);
    for (let index = 0; index < 18; index += 1) {
      const color = [COLORS.cyan, COLORS.pink, COLORS.violet, COLORS.white][index % 4];
      const mote = glow(color, 13 + index % 4 * 4, .82);
      container.addChildAt(mote, 3);
      dust.push({ sprite: mote, angle: index * Math.PI * 2 / 18, radius: 55 + index % 5 * 17, speed: 1.7 + index % 4 * .31 });
    }
    for (let index = 0; index < 10; index += 1) {
      const star = drawStar(new Graphics(), 3 + index % 3 * 1.7, index % 3 === 0 ? 0xff9ee9 : COLORS.white, .95);
      star.blendMode = "add";
      container.addChild(star);
      stars.push({ sprite: star, angle: index * Math.PI * 2 / 10 + .24, radius: 72 + index % 4 * 18, speed: 2.2 + index % 3 * .4 });
    }
    return add(container, 1950, (progress, elapsed) => {
      container.position.copyFrom(point("hero", .72, .53));
      const form = Math.min(1, easeOut(progress * 2.2));
      const collapse = progress > .79 ? (1 - progress) / .21 : 1;
      violetHalo.scale.set(.62 + form * .52 + Math.sin(elapsed * 5) * .08);
      violetHalo.alpha = collapse * (.34 + Math.sin(elapsed * 4.2) * .1);
      cyanCloud.position.set(Math.cos(elapsed * 2.1) * 24, Math.sin(elapsed * 2.7) * 17);
      magentaCloud.position.set(Math.cos(elapsed * 1.7 + Math.PI) * 28, Math.sin(elapsed * 2.3 + 1.2) * 20);
      cyanCloud.scale.set(.72 + Math.sin(elapsed * 6) * .15);
      magentaCloud.scale.set(.76 + Math.cos(elapsed * 5.1) * .16);
      cyanCloud.alpha = collapse * (.2 + Math.sin(elapsed * 5.7) * .08);
      magentaCloud.alpha = collapse * (.24 + Math.cos(elapsed * 4.8) * .09);
      accretionOuter.rotation = elapsed * 2.8;
      accretionInner.rotation = -elapsed * 4.1;
      accretionOuter.scale.set(.35 + form * .75, .55 + form * .45);
      accretionInner.scale.set(.3 + form * .7, .48 + form * .52);
      coreGlow.scale.set(.42 + form * .7 + Math.sin(elapsed * 16) * .1);
      coreGlow.alpha = collapse * (.64 + Math.sin(elapsed * 13) * .2);
      voidCore.scale.set(.58 + form * .46 + Math.sin(elapsed * 9) * .06);
      dust.forEach(({ sprite, angle, radius, speed }, index) => {
        const inward = radius * (1 - progress * .68);
        const orbit = angle + elapsed * speed;
        sprite.position.set(Math.cos(orbit) * inward, Math.sin(orbit) * inward * .6);
        sprite.scale.set(.45 + form * .65);
        sprite.alpha = collapse * (.5 + Math.sin(elapsed * 8 + index) * .28);
      });
      stars.forEach(({ sprite, angle, radius, speed }, index) => {
        const orbit = angle - elapsed * speed;
        sprite.position.set(Math.cos(orbit) * radius * (1 - progress * .52), Math.sin(orbit) * radius * .54 * (1 - progress * .52));
        sprite.rotation = -orbit + elapsed * 2;
        sprite.alpha = collapse * (.62 + Math.sin(elapsed * 10 + index * 1.7) * .34);
      });
      container.alpha = collapse;
    });
  }

  function makeGalaxyFlash() {
    const origin = point("hero", .735, .535);
    const target = point("enemy", .52, .52);
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const length = Math.max(260, Math.hypot(dx, dy));
    const container = new Container();
    container.position.copyFrom(origin);
    container.rotation = Math.atan2(dy, dx);

    const cosmicBody = new Graphics()
      .poly([0, -54, length * .9, -74, length + 28, 0, length * .9, 74, 0, 54])
      .fill({ color: 0x16052f, alpha: .98 });
    const outer = new Graphics()
      .poly([0, -47, length * .92, -63, length + 22, 0, length * .92, 63, 0, 47])
      .fill({ color: 0x7c32e5, alpha: .62 });
    const body = new Graphics()
      .poly([0, -34, length * .95, -48, length + 15, 0, length * .95, 48, 0, 34])
      .fill({ color: 0x1ea9e8, alpha: .62 });
    const inner = new Graphics()
      .poly([0, -10, length * .98, -17, length + 8, 0, length * .98, 17, 0, 10])
      .fill({ color: COLORS.white, alpha: .92 });
    outer.blendMode = "add";
    body.blendMode = "add";
    inner.blendMode = "add";

    const sourceHalo = glow(0x7f35e8, 225, .76);
    const sourceCloud = glow(COLORS.pink, 168, .48);
    const sourceCore = glow(COLORS.white, 105, .96);
    const sourceVoid = new Graphics().circle(0, 0, 23).fill({ color: 0x09021b, alpha: .98 }).stroke({ color: COLORS.cyan, alpha: .9, width: 4 });
    const sourceRing = new Graphics().ellipse(0, 0, 72, 31).stroke({ color: COLORS.pink, alpha: .9, width: 6 });
    const sourceRingTwo = new Graphics().ellipse(0, 0, 96, 43).stroke({ color: COLORS.cyan, alpha: .76, width: 4 });
    const headHalo = glow(0x8653ff, 255, .72);
    const headCloud = glow(COLORS.pink, 190, .48);
    const headCore = glow(COLORS.white, 115, .92);
    const headWave = new Graphics().ellipse(0, 0, 73, 104).stroke({ color: COLORS.cyan, alpha: .86, width: 7 });
    const strands = [
      { graphic: new Graphics(), color: COLORS.pink, width: 9, phase: .3, amplitude: 27 },
      { graphic: new Graphics(), color: COLORS.cyan, width: 7, phase: 2.2, amplitude: 19 },
      { graphic: new Graphics(), color: 0xbd83ff, width: 5, phase: 4.1, amplitude: 35 },
    ];
    strands.forEach(({ graphic }) => { graphic.blendMode = "add"; });
    const nebulae = [];
    for (let index = 0; index < 9; index += 1) {
      const cloud = glow([0x6b32d6, COLORS.pink, COLORS.cyan][index % 3], 82 + index % 3 * 24, .32);
      cloud.blendMode = "add";
      container.addChild(cloud);
      nebulae.push({ sprite: cloud, offset: (index + .5) / 9, y: (index % 2 ? -1 : 1) * (12 + index % 3 * 13) });
    }
    const streaks = [];
    const starfield = [];
    container.addChildAt(cosmicBody, 0);
    container.addChild(outer, body, ...strands.map(({ graphic }) => graphic), inner, sourceHalo, sourceCloud, sourceRingTwo, sourceRing, sourceCore, sourceVoid, headHalo, headCloud, headCore, headWave);
    for (let index = 0; index < 18; index += 1) {
      const color = [COLORS.cyan, COLORS.pink, 0xb88cff, COLORS.white][index % 4];
      const streak = new Graphics().roundRect(-24, -2, 42 + index % 5 * 12, 3 + index % 2 * 2, 2).fill({ color, alpha: .86 });
      container.addChild(streak);
      streaks.push({ sprite: streak, offset: index / 18, y: (index - 8.5) * 7 });
    }
    for (let index = 0; index < 28; index += 1) {
      const star = index % 4 === 0
        ? drawStar(new Graphics(), 3 + index % 3, index % 8 === 0 ? 0xff9ee9 : COLORS.white, .95)
        : glow([COLORS.cyan, COLORS.pink, 0xb88cff][index % 3], 5 + index % 5, .86);
      star.blendMode = "add";
      container.addChild(star);
      starfield.push({ sprite: star, offset: (index + .35) / 28, y: (index % 9 - 4) * 10, speed: .55 + index % 5 * .13 });
    }
    return add(container, 1250, (progress, elapsed) => {
      const reveal = Math.min(1, easeOut(progress * 6.2));
      const fade = progress > .78 ? (1 - progress) / .22 : 1;
      cosmicBody.scale.set(reveal, .9 + Math.sin(elapsed * 17) * .08);
      outer.scale.set(reveal, .9 + Math.sin(elapsed * 25) * .12);
      body.scale.set(reveal, .9 + Math.sin(elapsed * 31) * .08);
      inner.scale.set(reveal, .92 + Math.sin(elapsed * 38) * .07);
      cosmicBody.alpha = fade * (.86 + Math.sin(elapsed * 13) * .1);
      outer.alpha = (.25 + Math.sin(elapsed * 18) * .08) * fade;
      body.alpha = (.54 + Math.sin(elapsed * 24) * .18) * fade;
      inner.alpha = (.68 + Math.sin(elapsed * 34) * .2) * fade;
      sourceHalo.scale.set(.82 + Math.sin(elapsed * 19) * .16);
      sourceCloud.position.set(Math.cos(elapsed * 5) * 16, Math.sin(elapsed * 6) * 14);
      sourceCloud.scale.set(.72 + Math.sin(elapsed * 11) * .2);
      sourceCore.scale.set(.82 + Math.sin(elapsed * 27) * .13);
      sourceRing.rotation = elapsed * 3.8;
      sourceRingTwo.rotation = -elapsed * 2.7;
      sourceRing.scale.set(.72 + reveal * .28);
      sourceRingTwo.scale.set(.68 + reveal * .32);
      const headX = length * reveal;
      headHalo.x = headX;
      headCloud.x = headX + Math.sin(elapsed * 16) * 11;
      headCloud.y = Math.cos(elapsed * 13) * 13;
      headCore.x = headX;
      headWave.x = headX;
      headHalo.scale.set(.75 + Math.sin(elapsed * 17) * .18);
      headCore.scale.set(.82 + Math.sin(elapsed * 29) * .13);
      headWave.scale.set(.62 + reveal * .55);
      headWave.alpha = fade * (.55 + Math.sin(elapsed * 20) * .25);
      strands.forEach(({ graphic, color, width, phase, amplitude }, strandIndex) => {
        graphic.clear().moveTo(0, Math.sin(elapsed * 15 + phase) * amplitude * .4);
        for (let segment = 1; segment <= 12; segment += 1) {
          const x = length * reveal * segment / 12;
          const envelope = Math.sin(segment / 12 * Math.PI);
          const y = Math.sin(elapsed * (13 + strandIndex * 3) + segment * 1.35 + phase) * amplitude * envelope;
          graphic.lineTo(x, y);
        }
        graphic.stroke({ color, alpha: fade * (.56 + Math.sin(elapsed * 8 + phase) * .18), width });
      });
      nebulae.forEach(({ sprite, offset, y }, index) => {
        sprite.position.set(length * offset, y + Math.sin(elapsed * (5 + index % 3) + index) * 17);
        sprite.scale.set(.68 + Math.sin(elapsed * 8 + index) * .22, .72 + Math.cos(elapsed * 6 + index) * .2);
        sprite.alpha = offset <= reveal ? fade * (.2 + Math.sin(elapsed * 7 + index) * .1) : 0;
      });
      streaks.forEach(({ sprite, offset, y }) => {
        sprite.position.set(((elapsed * length * 2.2 + offset * length) % length) * reveal, y + Math.sin(elapsed * 11 + offset * 18) * 12);
        sprite.alpha = reveal * fade * .82;
      });
      starfield.forEach(({ sprite, offset, y, speed }, index) => {
        const x = ((offset + elapsed * speed) % 1) * length;
        sprite.position.set(x, y + Math.sin(elapsed * 9 + index * .9) * 7);
        sprite.rotation = elapsed * (1.8 + index % 4 * .4);
        sprite.alpha = x <= length * reveal ? fade * (.55 + Math.sin(elapsed * 12 + index) * .38) : 0;
      });
      container.alpha = fade;
    });
  }

  function makeRingProjectile({ from = "hero", to = "enemy", color = COLORS.gold, duration = 1050 }) {
    const origin = point(from, .53, .56);
    const target = point(to, .43, .54);
    const container = new Container();
    const glowSprite = glow(color, 250, .45);
    const ring = new Graphics().ellipse(0, 0, 112, 42).stroke({ color, alpha: .98, width: 12 });
    const highlight = new Graphics().ellipse(0, -3, 104, 34).stroke({ color: COLORS.white, alpha: .72, width: 4 });
    const stars = [];
    container.addChild(glowSprite, ring, highlight);
    for (let index = 0; index < 7; index += 1) {
      const star = drawStar(new Graphics(), 7, index % 2 ? color : COLORS.white);
      star.blendMode = "add";
      container.addChild(star);
      stars.push(star);
    }
    return add(container, duration, (progress, elapsed) => {
      const travel = easeInOut(Math.min(1, progress * 1.08));
      container.position.set(origin.x + (target.x - origin.x) * travel, origin.y + (target.y - origin.y) * travel - Math.sin(progress * Math.PI) * 30);
      container.rotation = elapsed * 5.2;
      container.scale.set(.55 + Math.sin(progress * Math.PI) * .6);
      container.alpha = progress > .82 ? (1 - progress) / .18 : 1;
      stars.forEach((star, index) => {
        const angle = elapsed * 3 + index * Math.PI * 2 / stars.length;
        star.position.set(Math.cos(angle) * 128, Math.sin(angle) * 48);
        star.rotation = -container.rotation;
      });
    });
  }

  function makeDust({ side = "hero", color = COLORS.gold }) {
    const container = new Container();
    const particles = [];
    for (let index = 0; index < 10; index += 1) {
      const mote = glow(color, 8 + Math.random() * 11, .7);
      container.addChild(mote);
      particles.push({ sprite: mote, x: (Math.random() - .5) * 150, y: -22 - Math.random() * 55, delay: index * .035 });
    }
    const origin = point(side, .5, .88);
    container.position.copyFrom(origin);
    return add(container, 850, (progress) => {
      particles.forEach(({ sprite, x, y, delay }) => {
        const local = clamp01((progress - delay) / (1 - delay));
        sprite.position.set(x * easeOut(local), y * Math.sin(local * Math.PI));
        sprite.alpha = (1 - local) * .72;
        sprite.scale.set(.65 + local * 1.25);
      });
    });
  }

  function makeSlashes({ side = "hero", color = COLORS.violet, duration = 820 }) {
    const origin = point(side, .52, .52);
    const container = new Container();
    container.position.copyFrom(origin);
    const slashes = [];
    for (let index = 0; index < 3; index += 1) {
      const slash = new Graphics().roundRect(-120, -8, 240, 16, 8).fill({ color: index === 1 ? COLORS.white : color, alpha: .92 });
      slash.y = (index - 1) * 34;
      slash.rotation = -.18;
      container.addChild(slash);
      slashes.push(slash);
    }
    return add(container, duration, (progress) => {
      slashes.forEach((slash, index) => {
        const local = clamp01((progress - index * .07) / .72);
        slash.scale.x = Math.sin(local * Math.PI);
        slash.x = 80 - easeOut(local) * 120;
        slash.alpha = Math.sin(local * Math.PI);
      });
    });
  }

  function makePunchWind() {
    const origin = point("hero", .72, .52);
    const container = new Container();
    container.position.copyFrom(origin);
    const rings = [];
    const sparks = [];
    for (let index = 0; index < 3; index += 1) {
      const ring = new Graphics().ellipse(0, 0, 28 + index * 13, 42 + index * 16).stroke({
        color: index === 1 ? COLORS.white : COLORS.gold,
        alpha: .8 - index * .16,
        width: 5 - index,
      });
      ring.rotation = -.28;
      container.addChild(ring);
      rings.push(ring);
    }
    for (let index = 0; index < 8; index += 1) {
      const spark = glow(index % 3 ? COLORS.gold : COLORS.white, 8 + index % 3 * 3, .82);
      container.addChild(spark);
      sparks.push({ sprite: spark, angle: -.75 + index * .22, distance: 45 + index * 8 });
    }
    return add(container, 720, (progress, elapsed) => {
      const burst = easeOut(progress);
      rings.forEach((ring, index) => {
        ring.scale.set(.3 + burst * (1.2 + index * .2));
        ring.x = burst * (24 + index * 14);
        ring.alpha = (1 - progress) * (.82 - index * .15);
      });
      sparks.forEach(({ sprite, angle, distance }) => {
        sprite.position.set(Math.cos(angle) * distance * burst, Math.sin(angle) * distance * burst);
        sprite.alpha = Math.sin(progress * Math.PI) * .85;
      });
      container.rotation = Math.sin(elapsed * 18) * .03;
    });
  }

  function makeGalaxyRayShot() {
    const origin = point("hero", .88, .48);
    const target = point("enemy", .48, .5);
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const container = new Container();
    const tailOuter = new Graphics().poly([0, -24, -265, -5, -330, 0, -265, 5, 0, 24]).fill({ color: COLORS.cyan, alpha: .42 });
    const tailInner = new Graphics().poly([0, -12, -220, -3, -285, 0, -220, 3, 0, 12]).fill({ color: COLORS.gold, alpha: .9 });
    const halo = glow(COLORS.cyan, 145, .7);
    const coreGlow = glow(COLORS.white, 92, .96);
    const diamond = new Graphics().poly([0, -42, 17, -17, 43, 0, 17, 17, 0, 42, -17, 17, -43, 0, -17, -17]).fill({ color: COLORS.white, alpha: .98 });
    const diamondGold = new Graphics().poly([0, -30, 12, -12, 31, 0, 12, 12, 0, 30, -12, 12, -31, 0, -12, -12]).stroke({ color: COLORS.gold, alpha: .95, width: 5 });
    const impactWave = new Graphics().circle(0, 0, 48).stroke({ color: COLORS.white, alpha: .9, width: 7 });
    const streaks = [];
    container.addChild(tailOuter, tailInner, halo, coreGlow, diamond, diamondGold, impactWave);
    for (let index = 0; index < 12; index += 1) {
      const streak = new Graphics().roundRect(-40, -2, 40 + index % 4 * 14, 4, 2).fill({ color: index % 3 ? COLORS.gold : COLORS.cyan, alpha: .82 });
      container.addChild(streak);
      streaks.push({ sprite: streak, x: -80 - index * 20, y: (index % 2 ? 1 : -1) * (10 + index % 4 * 8) });
    }
    return add(container, 900, (progress, elapsed) => {
      const travel = easeInOut(progress);
      container.position.set(origin.x + dx * travel, origin.y + dy * travel - Math.sin(progress * Math.PI) * 10);
      container.rotation = Math.atan2(dy, dx);
      const pulse = 1 + Math.sin(elapsed * 34) * .1;
      diamond.rotation = elapsed * 8;
      diamondGold.rotation = -elapsed * 6;
      diamond.scale.set(pulse);
      diamondGold.scale.set(.9 + Math.sin(elapsed * 28) * .08);
      halo.scale.set(.85 + Math.sin(elapsed * 23) * .16);
      tailOuter.scale.y = .82 + Math.sin(elapsed * 27) * .16;
      tailInner.scale.y = .86 + Math.sin(elapsed * 33) * .12;
      streaks.forEach(({ sprite, x, y }, index) => {
        sprite.position.set(x + ((elapsed * 360 + index * 37) % 120), y + Math.sin(elapsed * 9 + index) * 6);
        sprite.alpha = (1 - progress) * .8;
      });
      const impact = clamp01((progress - .76) / .24);
      impactWave.scale.set(.2 + easeOut(impact) * 2.7);
      impactWave.alpha = Math.sin(impact * Math.PI);
      container.scale.set(.55 + Math.min(1, progress * 8) * .55 + impact * .28);
      container.alpha = progress > .9 ? (1 - progress) / .1 : 1;
    });
  }

  function makeDarkOrbShot(side, index) {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const origin = point(side, .38, .48 + (index - 1) * .08);
    const target = point(targetSide, .5, .5);
    const container = new Container();
    const trail = [];
    const halo = glow(COLORS.violet, 112, .65);
    const shell = new Graphics().circle(0, 0, 27).fill({ color: 0x170623 }).stroke({ color: 0xc794ff, alpha: .95, width: 4 });
    const middle = new Graphics().circle(-4, -4, 17).fill({ color: 0x62208f, alpha: .92 });
    const core = glow(0xe8c8ff, 35, .95);
    core.position.set(-8, -8);
    container.addChild(halo, shell, middle, core);
    for (let trailIndex = 0; trailIndex < 5; trailIndex += 1) {
      const mote = glow(COLORS.violet, 35 - trailIndex * 4, .52);
      container.addChildAt(mote, 0);
      trail.push({ sprite: mote, lag: .035 + trailIndex * .035 });
    }
    return add(container, 950, (progress, elapsed) => {
      const travel = easeInOut(progress);
      container.position.set(
        origin.x + (target.x - origin.x) * travel,
        origin.y + (target.y - origin.y) * travel + Math.sin(progress * Math.PI * 2 + index) * 16,
      );
      container.rotation = -elapsed * 4.2;
      container.scale.set(.68 + Math.sin(progress * Math.PI) * .65);
      halo.scale.set(.82 + Math.sin(elapsed * 21) * .16);
      trail.forEach(({ sprite, lag }) => {
        const previous = clamp01(travel - lag);
        sprite.position.set(
          origin.x + (target.x - origin.x) * previous - container.x,
          origin.y + (target.y - origin.y) * previous + Math.sin(previous * Math.PI * 2 + index) * 16 - container.y,
        );
        sprite.alpha = travel > lag ? (1 - progress) * .5 : 0;
      });
      container.alpha = progress > .78 ? (1 - progress) / .22 : 1;
    });
  }

  function makeOrbit({ side = "enemy", color = COLORS.violet, duration = 2050, volley = false }) {
    if (volley) {
      for (let index = 0; index < 3; index += 1) {
        setTimeout(() => makeDarkOrbShot(side, index), index * 115);
      }
      return true;
    }
    const container = new Container();
    const halo = glow(color, 260, .38);
    const ringA = new Graphics().ellipse(0, 0, 138, 68).stroke({ color, alpha: .85, width: 5 });
    const ringB = new Graphics().ellipse(0, 0, 112, 52).stroke({ color: COLORS.cyan, alpha: .55, width: 3 });
    const orbs = [];
    container.addChild(halo, ringA, ringB);
    for (let index = 0; index < 3; index += 1) {
      const orb = glow(index === 1 ? COLORS.cyan : color, 48, .9);
      container.addChild(orb);
      orbs.push(orb);
    }
    return add(container, duration, (progress, elapsed) => {
      container.position.copyFrom(point(side, .5, .52));
      ringA.rotation = elapsed * 1.8;
      ringB.rotation = -elapsed * 2.4;
      halo.scale.set(.8 + Math.sin(elapsed * 7) * .08);
      orbs.forEach((orb, index) => {
        const angle = elapsed * 3.2 + index * Math.PI * 2 / 3;
        orb.position.set(Math.cos(angle) * 118, Math.sin(angle) * 58);
      });
      container.alpha = progress > .84 ? (1 - progress) / .16 : 1;
    });
  }

  function makeVortex({ side = "hero", duration = 3100 }) {
    const target = point(side, .5, .42);
    const container = new Container();
    container.position.set(target.x, Math.max(70, target.y - 210));
    const dark = glow(0x12051f, 410, .9);
    dark.blendMode = "normal";
    const ringA = new Graphics().ellipse(0, 0, 185, 72).stroke({ color: COLORS.violet, alpha: .82, width: 8 });
    const ringB = new Graphics().ellipse(0, 0, 142, 52).stroke({ color: 0xd5a6ff, alpha: .64, width: 5 });
    const motes = [];
    container.addChild(dark, ringA, ringB);
    for (let index = 0; index < 12; index += 1) {
      const mote = glow(index % 3 ? COLORS.violet : COLORS.white, 9, .8);
      container.addChild(mote);
      motes.push(mote);
    }
    return add(container, duration, (progress, elapsed) => {
      const scale = Math.min(1, progress * 4);
      container.scale.set(scale);
      ringA.rotation = elapsed * 1.8;
      ringB.rotation = -elapsed * 2.7;
      motes.forEach((mote, index) => {
        const angle = elapsed * (1.5 + index % 3 * .25) + index * Math.PI * 2 / motes.length;
        const radius = 75 + (index % 4) * 28;
        mote.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * .42);
      });
      container.alpha = progress > .88 ? (1 - progress) / .12 : 1;
    });
  }

  function makeMeteor({ side = "hero", duration = 1950 }) {
    const target = point(side, .5, .64);
    const container = new Container();
    const tail = new Graphics().poly([-42, -220, 42, -220, 64, -22, -64, -22]).fill({ color: COLORS.violet, alpha: .62 });
    const tailCore = new Graphics().poly([-16, -250, 16, -250, 28, -25, -28, -25]).fill({ color: COLORS.white, alpha: .75 });
    const rock = new Graphics().poly([-70, -10, -48, -73, 12, -92, 72, -48, 64, 24, 8, 62, -58, 42]).fill({ color: 0x321143 }).stroke({ color: 0xbd7aff, alpha: .9, width: 5 });
    const glowSprite = glow(COLORS.violet, 220, .58);
    container.addChild(glowSprite, tail, tailCore, rock);
    return add(container, duration, (progress, elapsed) => {
      const fall = easeInOut(progress);
      container.position.set(target.x, -160 + (target.y + 180) * fall);
      rock.rotation = elapsed * 3.5;
      tail.scale.x = 1 + Math.sin(elapsed * 22) * .15;
      container.alpha = progress > .9 ? (1 - progress) / .1 : 1;
    });
  }

  function makeNovaPath(points) {
    if (!Array.isArray(points) || points.length < 6) return false;
    const container = new Container();
    const lines = points.slice(0, -1).map((start, index) => {
      const end = points[index + 1];
      const outer = new Graphics().moveTo(start.x, start.y).lineTo(end.x, end.y).stroke({ color: COLORS.gold, alpha: .42, width: 13 });
      const inner = new Graphics().moveTo(start.x, start.y).lineTo(end.x, end.y).stroke({ color: COLORS.white, alpha: .96, width: 5 });
      outer.blendMode = "add";
      inner.blendMode = "add";
      container.addChild(outer, inner);
      return { outer, inner };
    });
    const nodes = points.slice(0, -1).map((targetPoint) => {
      const node = glow(COLORS.gold, 58, .72);
      node.position.set(targetPoint.x, targetPoint.y);
      container.addChild(node);
      return node;
    });
    return add(container, 4000, (progress, elapsed) => {
      const fade = progress > .82 ? (1 - progress) / .18 : 1;
      lines.forEach(({ outer, inner }, index) => {
        const reveal = clamp01(progress * 8 - index * .55);
        outer.alpha = reveal * fade * (.34 + Math.sin(elapsed * 8 + index) * .08);
        inner.alpha = reveal * fade * (.82 + Math.sin(elapsed * 13 + index) * .16);
      });
      nodes.forEach((node, index) => {
        node.scale.set(.6 + Math.sin(elapsed * 9 + index) * .18);
        node.alpha = clamp01(progress * 8 - index * .55) * fade * .72;
      });
    });
  }

  function makeNovaUppercut({ enemyGroundTarget, airTarget }) {
    if (!enemyGroundTarget || !airTarget) return false;
    const container = new Container();
    container.position.copyFrom(enemyGroundTarget);
    const halo = glow(COLORS.gold, 260, .64);
    const core = glow(COLORS.white, 130, .96);
    const shockA = new Graphics().ellipse(0, 0, 72, 30).stroke({ color: COLORS.white, alpha: .92, width: 7 });
    const shockB = new Graphics().ellipse(0, 0, 102, 42).stroke({ color: COLORS.cyan, alpha: .72, width: 5 });
    const shards = [];
    container.addChild(halo, core, shockB, shockA);
    const lift = airTarget.y - enemyGroundTarget.y;
    for (let index = 0; index < 20; index += 1) {
      const shard = index % 4 === 0 ? drawStar(new Graphics(), 8, COLORS.white) : glow(index % 2 ? COLORS.gold : COLORS.cyan, 10 + index % 3 * 4, .9);
      container.addChild(shard);
      shards.push({ sprite: shard, angle: index * Math.PI * 2 / 20, distance: 30 + index % 5 * 13, lift: .65 + Math.random() * .55 });
    }
    return add(container, 820, (progress, elapsed) => {
      const burst = easeOut(progress);
      halo.scale.set(.35 + burst * 1.8);
      halo.alpha = (1 - progress) * .62;
      core.scale.set(.25 + Math.sin(progress * Math.PI) * 1.7);
      core.alpha = 1 - progress;
      shockA.scale.set(.2 + burst * 2.8, .2 + burst * 1.2);
      shockB.scale.set(.1 + burst * 3.5, .1 + burst * 1.4);
      shockA.alpha = 1 - progress;
      shockB.alpha = 1 - progress;
      shards.forEach(({ sprite, angle, distance, lift: shardLift }, index) => {
        const spiral = angle + elapsed * (2.4 + index % 3 * .25);
        sprite.position.set(Math.cos(spiral) * distance * burst, lift * burst * shardLift + Math.sin(spiral) * 18);
        sprite.scale.set(.5 + Math.sin(progress * Math.PI) * 1.1);
        sprite.alpha = Math.sin(progress * Math.PI);
      });
    });
  }

  function makeNovaDive(targetPoint) {
    const origin = point("hero", .5, .42);
    const target = targetPoint || point("enemy", .5, .62);
    const container = new Container();
    const comet = glow(COLORS.gold, 170, .78);
    const core = drawStar(new Graphics(), 52, COLORS.white);
    const streaks = [];
    container.addChild(comet, core);
    for (let index = 0; index < 13; index += 1) {
      const streak = new Graphics().roundRect(-4, -55 - index % 4 * 18, 8, 55 + index % 4 * 18, 4).fill({ color: index % 3 ? COLORS.gold : COLORS.cyan, alpha: .78 });
      streak.x = (index - 6) * 12;
      container.addChildAt(streak, 0);
      streaks.push(streak);
    }
    return add(container, 720, (progress, elapsed) => {
      const travel = easeInOut(progress);
      container.position.set(origin.x + (target.x - origin.x) * travel, origin.y + (target.y - origin.y) * travel);
      container.rotation = Math.atan2(target.y - origin.y, target.x - origin.x) - Math.PI / 2;
      comet.scale.set(.8 + Math.sin(elapsed * 25) * .16 + progress * .35);
      core.rotation = elapsed * 5.2;
      core.scale.set(.7 + Math.sin(elapsed * 30) * .12);
      streaks.forEach((streak, index) => {
        streak.y = -((elapsed * 220 + index * 31) % 95);
        streak.alpha = (1 - progress) * .78;
      });
      container.alpha = progress > .86 ? (1 - progress) / .14 : 1;
    });
  }

  function makeNovaStrike(index = 0) {
    const container = new Container();
    container.position.copyFrom(point("enemy", .5, .5));
    container.rotation = [-1.26, 2.51, 0, -2.51, 1.26][index] || 0;
    const lineOuter = new Graphics().roundRect(-180, -14, 360, 28, 14).fill({ color: COLORS.gold, alpha: .52 });
    const lineCore = new Graphics().roundRect(-150, -5, 300, 10, 5).fill({ color: COLORS.white, alpha: .96 });
    const burst = glow(COLORS.gold, 170, .72);
    const ring = new Graphics().ellipse(0, 0, 78, 34).stroke({ color: COLORS.white, alpha: .88, width: 6 });
    container.addChild(lineOuter, lineCore, burst, ring);
    return add(container, 620, (progress) => {
      const pulse = Math.sin(progress * Math.PI);
      lineOuter.scale.x = pulse;
      lineCore.scale.x = pulse;
      lineOuter.alpha = (1 - progress) * .55;
      lineCore.alpha = (1 - progress) * .95;
      burst.scale.set(.3 + easeOut(progress) * 1.7);
      burst.alpha = (1 - progress) * .7;
      ring.scale.set(.15 + easeOut(progress) * 2.2);
      ring.alpha = 1 - progress;
    });
  }

  function makeNovaImpact(critical = false) {
    const container = new Container();
    container.position.copyFrom(point("enemy", .5, .68));
    const primary = critical ? 0xff4f82 : COLORS.gold;
    const secondary = critical ? COLORS.violet : COLORS.cyan;
    const halo = glow(primary, critical ? 560 : 460, .76);
    const core = glow(COLORS.white, critical ? 260 : 220, .98);
    const star = drawStar(new Graphics(), critical ? 215 : 175, primary, .92);
    const rings = [
      new Graphics().ellipse(0, 0, 95, 42).stroke({ color: COLORS.white, alpha: .95, width: 9 }),
      new Graphics().ellipse(0, 0, 145, 61).stroke({ color: primary, alpha: .82, width: 7 }),
      new Graphics().circle(0, 0, 112).stroke({ color: secondary, alpha: .72, width: 6 }),
    ];
    const rays = new Container();
    const shards = [];
    for (let index = 0; index < 22; index += 1) {
      const angle = index * Math.PI * 2 / 22;
      const ray = new Graphics().roundRect(0, -3, 125 + index % 5 * 24, 6, 3).fill({ color: index % 4 ? primary : COLORS.white, alpha: .9 });
      ray.rotation = angle;
      rays.addChild(ray);
      const shard = index % 5 === 0 ? drawStar(new Graphics(), 9, COLORS.white) : glow(index % 2 ? primary : secondary, 11 + index % 4 * 3, .92);
      container.addChild(shard);
      shards.push({ sprite: shard, angle, distance: 160 + Math.random() * (critical ? 230 : 170) });
    }
    container.addChildAt(halo, 0);
    container.addChildAt(rays, 1);
    container.addChildAt(star, 2);
    container.addChildAt(core, 3);
    container.addChild(...rings);
    return add(container, critical ? 1750 : 1450, (progress, elapsed) => {
      const burst = easeOut(progress);
      const fade = progress > .68 ? (1 - progress) / .32 : 1;
      halo.scale.set(.25 + burst * 1.9 + Math.sin(elapsed * 15) * .08);
      halo.alpha = fade * .7;
      core.scale.set(.18 + Math.sin(progress * Math.PI) * 2.1);
      core.alpha = fade;
      star.scale.set(.15 + Math.sin(Math.min(1, progress * 1.25) * Math.PI) * 1.45);
      star.rotation = elapsed * 1.5;
      star.alpha = fade;
      rays.scale.set(.1 + burst * 1.8);
      rays.rotation = -elapsed * .75;
      rays.alpha = fade;
      rings.forEach((ring, index) => {
        ring.scale.set(.08 + burst * (2.1 + index * .55));
        ring.alpha = (1 - progress) * (.95 - index * .14);
        ring.rotation = elapsed * (index % 2 ? -.8 : .7);
      });
      shards.forEach(({ sprite, angle, distance }) => {
        const travel = distance * burst;
        sprite.position.set(Math.cos(angle) * travel, Math.sin(angle) * travel * .78);
        sprite.alpha = Math.sin(progress * Math.PI);
      });
    });
  }

  function makeScreenFlash(color = COLORS.white, duration = 560) {
    const { width, height } = getScreen();
    const container = new Container();
    const flash = new Graphics().rect(0, 0, width, height).fill({ color, alpha: 1 });
    flash.blendMode = "add";
    container.addChild(flash);
    return add(container, duration, (progress) => {
      container.alpha = (1 - easeOut(progress)) * .72;
    });
  }

  function makeVictory(side) {
    const container = new Container();
    const halo = glow(side === "hero" ? COLORS.gold : COLORS.violet, 320, .42);
    const rays = new Container();
    const particles = [];
    container.addChild(halo, rays);
    for (let index = 0; index < 28; index += 1) {
      const ray = new Graphics().roundRect(42, -2, 210 + index % 5 * 34, 4, 2).fill({
        color: index % 4 === 0 ? COLORS.white : side === "hero" ? COLORS.gold : COLORS.violet,
        alpha: .72,
      });
      ray.rotation = index * Math.PI * 2 / 28;
      rays.addChild(ray);
    }
    for (let index = 0; index < 26; index += 1) {
      const color = index % 3 === 0 ? COLORS.white : side === "hero" ? COLORS.gold : COLORS.violet;
      const particle = index % 3 === 0
        ? drawStar(new Graphics(), 8 + index % 5, color)
        : glow(color, 9 + index % 6, .9);
      particle.blendMode = "add";
      container.addChild(particle);
      particles.push({
        sprite: particle,
        angle: index * Math.PI * 2 / 26,
        distance: 140 + Math.random() * 270,
        delay: (index % 7) * .018,
      });
    }
    return add(container, 4400, (progress, elapsed) => {
      container.position.copyFrom(point(side, .5, .46));
      const burst = clamp01((progress - .32) / .56);
      halo.scale.set(.7 + burst * 1.9 + Math.sin(elapsed * 4) * .06);
      halo.alpha = burst > .8 ? (1 - burst) * 1.5 : .34;
      rays.scale.set(.22 + easeOut(burst) * 1.25);
      rays.rotation = elapsed * .12;
      rays.alpha = Math.sin(burst * Math.PI) * .72;
      particles.forEach(({ sprite, angle, distance, delay }) => {
        const local = clamp01((burst - delay) / (1 - delay));
        const travel = easeOut(local) * distance;
        sprite.position.set(Math.cos(angle) * travel, Math.sin(angle) * travel * .72);
        sprite.rotation = -angle + elapsed * 1.3;
        sprite.scale.set(.35 + Math.sin(local * Math.PI) * 1.2);
        sprite.alpha = Math.sin(local * Math.PI);
      });
    });
  }

  function makeSutekichiStarTouch() {
    const container = new Container();
    const paw = new Graphics()
      .circle(0, 7, 24).fill({ color: COLORS.gold, alpha: .86 })
      .circle(-25, -18, 10).circle(-8, -28, 11).circle(11, -28, 11).circle(28, -15, 10).fill({ color: COLORS.cyan, alpha: .92 });
    const crest = drawStar(new Graphics(), 17, COLORS.white);
    const ring = new Graphics().circle(0, 0, 42).stroke({ color: COLORS.gold, alpha: .9, width: 4 });
    const motes = Array.from({ length: 12 }, (_, index) => {
      const mote = drawStar(new Graphics(), 4 + index % 3, index % 2 ? COLORS.gold : COLORS.cyan);
      container.addChild(mote);
      return { mote, angle: index * Math.PI / 6 };
    });
    container.addChildAt(glow(COLORS.gold, 155, .55), 0);
    container.addChild(paw, crest, ring);
    return add(container, 950, (progress, elapsed) => {
      container.position.copyFrom(point("hero", .53, .48));
      const pulse = Math.sin(progress * Math.PI);
      container.scale.set(.35 + easeOut(progress) * .95);
      container.rotation = -.24 + progress * .48;
      container.alpha = 1 - Math.max(0, progress - .72) / .28;
      ring.scale.set(.4 + progress * 1.9);
      ring.alpha = 1 - progress;
      motes.forEach(({ mote, angle }, index) => {
        const distance = 38 + easeOut(progress) * (70 + index % 4 * 11);
        mote.position.set(Math.cos(angle) * distance, Math.sin(angle) * distance);
        mote.rotation = elapsed * 2 + angle;
        mote.alpha = pulse;
      });
    });
  }

  function makeSutekichiHaloSkip() {
    const container = new Container();
    const rings = [0, 1, 2].map((index) => new Graphics().ellipse(0, 0, 56 + index * 20, 18 + index * 7).stroke({ color: index === 1 ? COLORS.cyan : COLORS.gold, alpha: .88 - index * .16, width: 5 - index }));
    const star = drawStar(new Graphics(), 21, COLORS.white);
    const streaks = Array.from({ length: 7 }, (_, index) => new Graphics().roundRect(-120 - index * 20, -2, 80 + index * 13, 4, 2).fill({ color: index % 2 ? COLORS.gold : COLORS.cyan, alpha: .72 }));
    container.addChild(glow(COLORS.cyan, 165, .38), ...streaks, ...rings, star);
    const origin = point("enemy", .46, .42);
    const target = point("hero", .54, .5);
    return add(container, 1450, (progress, elapsed) => {
      const travel = easeInOut(clamp01(progress / .78));
      container.position.set(origin.x + (target.x - origin.x) * travel, origin.y + (target.y - origin.y) * travel - Math.sin(travel * Math.PI) * 120);
      container.rotation = elapsed * 3.1;
      container.scale.set(.65 + Math.sin(progress * Math.PI) * .55);
      container.alpha = 1 - Math.max(0, progress - .8) / .2;
      rings.forEach((ring, index) => ring.rotation = elapsed * (index % 2 ? -2 : 2.6));
    });
  }

  function makeSutekichiStellaSearch() {
    const container = new Container();
    const outer = new Graphics().circle(0, 0, 94).stroke({ color: COLORS.cyan, alpha: .85, width: 3 });
    const inner = new Graphics().circle(0, 0, 48).stroke({ color: COLORS.gold, alpha: .9, width: 4 });
    const cross = new Graphics().moveTo(-122, 0).lineTo(122, 0).moveTo(0, -122).lineTo(0, 122).stroke({ color: COLORS.white, alpha: .52, width: 2 });
    const scanner = new Graphics().moveTo(0, 0).lineTo(108, 0).stroke({ color: COLORS.cyan, alpha: .88, width: 5 });
    const markers = Array.from({ length: 8 }, (_, index) => {
      const marker = drawStar(new Graphics(), 6, index % 2 ? COLORS.gold : COLORS.white);
      marker.position.set(Math.cos(index * Math.PI / 4) * 92, Math.sin(index * Math.PI / 4) * 92);
      return marker;
    });
    container.addChild(glow(COLORS.cyan, 250, .25), cross, outer, inner, scanner, ...markers);
    return add(container, 1900, (progress, elapsed) => {
      container.position.copyFrom(point("hero", .5, .46));
      container.scale.set(.72 + easeOut(progress) * .36);
      container.alpha = Math.sin(progress * Math.PI) * 1.25;
      outer.rotation = elapsed * .7;
      inner.rotation = -elapsed * 1.2;
      scanner.rotation = elapsed * 4.8;
      markers.forEach((marker, index) => marker.scale.set(.7 + Math.sin(elapsed * 5 + index) * .3));
    });
  }

  function makeSutekichiCometCharge() {
    const container = new Container();
    const crest = drawStar(new Graphics(), 42, COLORS.white);
    const rings = [58, 88, 122].map((radius, index) => new Graphics().circle(0, 0, radius).stroke({ color: index % 2 ? COLORS.cyan : COLORS.gold, alpha: .76, width: 3 }));
    const stars = Array.from({ length: 16 }, (_, index) => drawStar(new Graphics(), 4 + index % 4, index % 3 ? COLORS.gold : COLORS.cyan));
    container.addChild(glow(COLORS.gold, 300, .38), ...rings, crest, ...stars);
    return add(container, 1750, (progress, elapsed) => {
      container.position.copyFrom(point("enemy", .5, .38));
      container.scale.set(.35 + easeOut(progress) * .85);
      crest.rotation = elapsed * 1.4;
      rings.forEach((ring, index) => { ring.rotation = elapsed * (index % 2 ? -1 : 1.3); ring.scale.set(1 - progress * .18 * index); });
      stars.forEach((star, index) => {
        const angle = index * Math.PI * 2 / stars.length + elapsed * (index % 2 ? -.5 : .7);
        const radius = 150 - easeOut(progress) * 105 + index % 3 * 12;
        star.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius);
        star.alpha = .45 + Math.sin(elapsed * 6 + index) * .35;
      });
    });
  }

  function makeSutekichiComet() {
    const container = new Container();
    const tail = new Graphics().poly([-300, -30, -15, -50, 0, 0, -15, 50, -300, 30, -225, 0]).fill({ color: COLORS.cyan, alpha: .38 });
    const tailCore = new Graphics().poly([-240, -10, -8, -22, 0, 0, -8, 22, -240, 10]).fill({ color: COLORS.gold, alpha: .82 });
    const head = drawStar(new Graphics(), 50, COLORS.white);
    container.addChild(glow(COLORS.gold, 210, .72), tail, tailCore, head);
    const screen = getScreen();
    const target = point("hero", .5, .5);
    const start = { x: screen.width * .94, y: screen.height * .03 };
    return add(container, 1700, (progress) => {
      const travel = easeInOut(progress);
      container.position.set(start.x + (target.x - start.x) * travel, start.y + (target.y - start.y) * travel);
      container.rotation = Math.atan2(target.y - start.y, target.x - start.x);
      container.scale.set(.65 + progress * .65);
      container.alpha = 1 - Math.max(0, progress - .9) / .1;
    });
  }

  function makeSutekichiCometImpact() {
    const container = new Container();
    const crest = drawStar(new Graphics(), 105, COLORS.gold, .86);
    const rays = Array.from({ length: 18 }, (_, index) => {
      const ray = new Graphics().roundRect(25, -3, 110 + index % 4 * 24, 6, 3).fill({ color: index % 3 ? COLORS.cyan : COLORS.white, alpha: .82 });
      ray.rotation = index * Math.PI * 2 / 18;
      return ray;
    });
    const ring = new Graphics().circle(0, 0, 72).stroke({ color: COLORS.white, alpha: .94, width: 7 });
    container.addChild(glow(COLORS.gold, 390, .68), crest, ring, ...rays);
    return add(container, 1250, (progress) => {
      container.position.copyFrom(point("hero", .5, .58));
      const burst = easeOut(progress);
      crest.scale.set(.25 + burst * 1.55);
      crest.rotation = progress * 1.1;
      ring.scale.set(.2 + burst * 2.6);
      rays.forEach((ray) => ray.scale.x = .2 + burst * 1.35);
      container.alpha = 1 - progress;
    });
  }

  function makeSutekichiNapDream() {
    const container = new Container();
    const moon = new Graphics().circle(0, 0, 34).fill({ color: COLORS.gold, alpha: .92 }).circle(14, -10, 32).cut();
    const bubbles = Array.from({ length: 9 }, (_, index) => new Graphics().circle(0, 0, 7 + index % 4 * 3).stroke({ color: index % 2 ? COLORS.cyan : COLORS.white, alpha: .7, width: 2 }));
    const stars = Array.from({ length: 6 }, (_, index) => drawStar(new Graphics(), 5 + index % 3, COLORS.gold));
    container.addChild(glow(COLORS.cyan, 220, .22), moon, ...bubbles, ...stars);
    return add(container, 3600, (progress, elapsed) => {
      container.position.copyFrom(point("enemy", .53, .35));
      container.alpha = Math.min(1, progress * 5) * (1 - Math.max(0, progress - .88) / .12);
      moon.position.set(38, -65 - Math.sin(elapsed * 2) * 8);
      moon.rotation = Math.sin(elapsed * 1.4) * .15;
      bubbles.forEach((bubble, index) => {
        const local = (elapsed * .22 + index / bubbles.length) % 1;
        bubble.position.set(20 + Math.sin(index * 2.2) * 60, 65 - local * 230);
        bubble.alpha = Math.sin(local * Math.PI) * .7;
        bubble.scale.set(.5 + local);
      });
      stars.forEach((star, index) => {
        const angle = elapsed * .48 + index * Math.PI / 3;
        star.position.set(Math.cos(angle) * 95, Math.sin(angle) * 48 - 28);
        star.rotation = -angle;
      });
    });
  }

  function makeSutekichiNapResult(success) {
    if (!success) return makeBurst({ side: "enemy", yRatio: .48, color: COLORS.cyan, secondary: 0x55739d, duration: 900, radius: 80, count: 5 });
    const container = new Container();
    const rings = [72, 112].map((radius) => new Graphics().circle(0, 0, radius).stroke({ color: COLORS.cyan, alpha: .8, width: 5 }));
    const stars = Array.from({ length: 22 }, (_, index) => drawStar(new Graphics(), 6 + index % 4, index % 3 ? COLORS.gold : COLORS.white));
    container.addChild(glow(COLORS.gold, 420, .55), ...rings, ...stars);
    return add(container, 1500, (progress) => {
      container.position.copyFrom(point("enemy", .5, .5));
      const rise = easeOut(progress);
      rings.forEach((ring, index) => ring.scale.set(.3 + rise * (2 + index * .55)));
      stars.forEach((star, index) => {
        const angle = index * Math.PI * 2 / stars.length;
        const distance = 35 + rise * (125 + index % 5 * 16);
        star.position.set(Math.cos(angle) * distance, Math.sin(angle) * distance - rise * 90);
        star.alpha = Math.sin(progress * Math.PI);
        star.rotation = progress * 4 + angle;
      });
      container.alpha = 1 - Math.max(0, progress - .78) / .22;
    });
  }

  const handlers = {
    criticalScreenBurst: (options) => makeBurst({ side: options.side, yRatio: .48, color: COLORS.ember, secondary: COLORS.white, duration: 900, radius: 210, count: 18, critical: true }),
    impact: (options) => makeBurst({ side: options.heroAttacks ? "enemy" : "hero", yRatio: .55, color: options.heroAttacks ? COLORS.gold : COLORS.violet, secondary: COLORS.white, duration: 480, radius: 120, count: 10 }),
    etoileDrive: (options) => makeCharge({ side: "hero", xRatio: .5, yRatio: .5, color: COLORS.gold, secondary: COLORS.cyan, duration: options.duration + 180, radius: 125, count: 16 }),
    projectile: (options) => makeEnergyProjectile({ from: options.enemy ? "enemy" : "hero", to: options.enemy ? "hero" : "enemy", color: options.enemy ? COLORS.violet : COLORS.gold, secondary: options.enemy ? COLORS.cyan : COLORS.white }),
    dust: (options) => makeDust({ side: options.side, color: options.color === "violet" ? COLORS.violet : COLORS.gold }),
    punchTrail: () => makePunchWind(),
    starRing: () => makeRingProjectile({}),
    meteorClaw: () => makeSlashes({ side: "hero", color: COLORS.violet }),
    crescentRush: () => makeCrescentRush(),
    physicalContact: (options) => makeBurst({ side: options.heroAttacks ? "enemy" : "hero", color: options.heroAttacks ? COLORS.gold : COLORS.violet, secondary: COLORS.white, duration: 760, radius: 142, count: 12 }),
    novaCharge: () => makeCharge({ side: "hero", xRatio: .5, yRatio: .54, color: COLORS.gold, secondary: COLORS.cyan, duration: 1750, radius: 125, count: 16 }),
    novaRush: () => makeBeam({ from: "hero", to: "enemy", fromRatio: [.64, .52], toRatio: [.46, .52], color: COLORS.gold, secondary: COLORS.cyan, width: 56, duration: 900 }),
    novaCapture: () => makeOrbit({ side: "enemy", color: COLORS.gold, duration: 3650 }),
    novaPath: (options) => makeNovaPath(options.points),
    novaStrike: (options) => makeNovaStrike(options.index),
    novaUppercut: (options) => makeNovaUppercut(options),
    novaDive: (options) => makeNovaDive(options.targetPoint),
    novaImpact: (options) => {
      makeNovaImpact(options.critical);
      makeScreenFlash(options.critical ? 0xffd8eb : 0xfff4bd, options.critical ? 760 : 560);
      return true;
    },
    galaxyRayCharge: () => makeCharge({ side: "hero", xRatio: .79, yRatio: .5, color: COLORS.gold, secondary: COLORS.cyan, duration: 1250, radius: 62, count: 9 }),
    galaxyRay: () => makeGalaxyRayShot(),
    kissCharge: () => makeKissCharge(),
    throwingKiss: () => makeHeartProjectile(),
    kissBurst: () => makeKissBurst(),
    kissMiss: () => makeKissBurst(true),
    darkOrbitField: () => makeOrbit({ side: "enemy", color: COLORS.violet, duration: 2050 }),
    darkOrbitVolley: () => makeOrbit({ side: "enemy", color: COLORS.violet, duration: 1300, volley: true }),
    blackMeteorSky: () => makeVortex({ side: "hero" }),
    blackMeteor: () => makeMeteor({ side: "hero" }),
    blackMeteorImpact: () => makeBurst({ side: "hero", yRatio: .68, color: COLORS.violet, secondary: COLORS.white, duration: 1200, radius: 230, count: 18 }),
    sutekichiStarTouch: () => makeSutekichiStarTouch(),
    sutekichiHaloSkip: () => makeSutekichiHaloSkip(),
    sutekichiStellaSearch: () => makeSutekichiStellaSearch(),
    sutekichiCometCharge: () => makeSutekichiCometCharge(),
    sutekichiComet: () => makeSutekichiComet(),
    sutekichiCometImpact: () => makeSutekichiCometImpact(),
    sutekichiNapDream: () => makeSutekichiNapDream(),
    sutekichiNapResult: (options) => makeSutekichiNapResult(options.success),
    galaxyCharge: () => makeGalaxyCharge(),
    victoryCelebration: (options) => makeVictory(options.side),
    galaxyFlash: () => {
      makeGalaxyFlash();
      makeScreenFlash(COLORS.white, 620);
      return true;
    },
  };

  function spawn(type, options = {}) {
    const handler = handlers[type];
    if (!handler) return false;
    handler(options);
    return true;
  }

  function update(now) {
    for (let index = active.length - 1; index >= 0; index -= 1) {
      const effect = active[index];
      const elapsedMS = now - effect.startedAt;
      const progress = clamp01(elapsedMS / effect.duration);
      effect.update?.(progress, elapsedMS / 1000, effect);
      if (progress < 1) continue;
      effect.container.destroy({ children: true });
      active.splice(index, 1);
    }
  }

  function clear() {
    for (const effect of active) effect.container.destroy({ children: true });
    active.length = 0;
  }

  return { spawn, update, clear };
}
