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

  function makeTatsuoRoar(side) {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const origin = point(side, .62, .3);
    const target = point(targetSide, .5, .42);
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const length = Math.max(160, Math.hypot(dx, dy));
    const container = new Container();
    container.position.copyFrom(origin);
    container.rotation = Math.atan2(dy, dx);
    const pressureRings = [0, 1, 2].map((index) => {
      const ring = new Graphics().ellipse(0, 0, 24, 52).stroke({ color: index === 1 ? 0xffad58 : COLORS.white, alpha: .84, width: 5 - index });
      container.addChild(ring);
      return ring;
    });
    const speedLines = Array.from({ length: 24 }, (_, index) => {
      const y = (index / 23 - .5) * 250 + (Math.random() - .5) * 28;
      const start = 28 + Math.random() * length * .36;
      const lineLength = 90 + Math.random() * 190;
      const line = new Graphics()
        .moveTo(start, y)
        .lineTo(Math.min(length, start + lineLength), y * .35)
        .stroke({ color: index % 4 ? 0xffc477 : COLORS.white, alpha: .88, width: index % 5 === 0 ? 5 : 2.5 });
      container.addChild(line);
      return { line, phase: Math.random(), y };
    });
    return add(container, 1180, (progress, elapsed) => {
      const surge = Math.min(1, progress * 3.4);
      pressureRings.forEach((ring, index) => {
        const ringProgress = clamp01(progress * 1.55 - index * .12);
        ring.position.x = length * ringProgress;
        ring.scale.set(.45 + ringProgress * 2.7, .38 + ringProgress * 1.35);
        ring.alpha = (1 - ringProgress) * .88;
      });
      speedLines.forEach(({ line, phase, y }, index) => {
        line.x = ((elapsed * length * (1.2 + phase) + phase * length) % length) * .32;
        line.y = Math.sin(elapsed * 9 + index) * 5 - y * (1 - surge) * .08;
        line.scale.x = .35 + surge * 1.18;
        line.alpha = (1 - Math.max(0, progress - .72) / .28) * (.45 + phase * .5);
      });
      container.alpha = progress > .9 ? (1 - progress) / .1 : 1;
    });
  }

  function makeTatsuoPressDive(side) {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const target = point(targetSide, .5, .4);
    const container = new Container();
    container.position.copyFrom(target);
    const lines = Array.from({ length: 22 }, (_, index) => {
      const x = (index / 21 - .5) * 330 + (Math.random() - .5) * 26;
      const line = new Graphics()
        .moveTo(x, -270 - Math.random() * 90)
        .lineTo(x * .28, -50 - Math.random() * 60)
        .stroke({ color: index % 4 ? 0xffbd67 : COLORS.white, alpha: .9, width: index % 5 === 0 ? 6 : 3 });
      container.addChild(line);
      return { line, phase: Math.random() };
    });
    return add(container, 980, (progress, elapsed) => {
      const dive = easeInOut(progress);
      lines.forEach(({ line, phase }, index) => {
        line.y = (elapsed * 420 * (1 + phase)) % 150;
        line.scale.y = .5 + dive * 1.5;
        line.alpha = (1 - progress) * (.55 + (index % 3) * .18);
      });
      container.scale.set(.75 + dive * .45);
    });
  }

  function makeTatsuoPressImpact(side) {
    const targetSide = side === "hero" ? "enemy" : "hero";
    makeBurst({ side: targetSide, yRatio: .68, color: 0x7b4a2c, secondary: 0xffd58a, duration: 1450, radius: 285, count: 26, critical: true });
    makeBurst({ side: targetSide, yRatio: .72, color: 0xff7a32, secondary: COLORS.white, duration: 900, radius: 190, count: 18, critical: true });
    makeScreenFlash(0xffc56e, 620);
    return true;
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

  function makeHeartProjectile(side = "hero") {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const origin = point(side, .76, .42);
    const target = point(targetSide, .48, .48);
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

  function makeKissCharge(side = "hero") {
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
      container.position.copyFrom(point(side, .73, .42));
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

  function makeKissBurst(side = "hero", miss = false) {
    const targetSide = side === "hero" ? "enemy" : "hero";
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
    container.position.copyFrom(point(targetSide, .48, .48));
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

  function makeCrescentRush(side = "enemy") {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const origin = point(side, .34, .58);
    const target = point(targetSide, .58, .58);
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

  function makeGalaxyCharge(side = "hero") {
    const container = new Container();
    const violetHalo = glow(0x5120b7, 340, .52);
    const shadowAura = new Graphics().ellipse(0, 0, 100, 72).fill({ color: 0x080112, alpha: .66 });
    const cyanCloud = glow(COLORS.cyan, 210, .34);
    const magentaCloud = glow(COLORS.pink, 240, .38);
    const accretionOuter = new Graphics().ellipse(0, 0, 82, 34).stroke({ color: 0xb070ff, alpha: .9, width: 7 });
    const accretionInner = new Graphics().ellipse(0, 0, 58, 22).stroke({ color: COLORS.cyan, alpha: .9, width: 5 });
    const coreGlow = glow(COLORS.white, 78, .95);
    const voidCore = new Graphics()
      .circle(0, 0, 18)
      .fill({ color: 0x070218, alpha: .98 })
      .stroke({ color: 0xff86e8, alpha: .9, width: 3 });
    const pulseRings = Array.from({ length: 3 }, (_, index) => {
      const ring = new Graphics().circle(0, 0, 48 + index * 9).stroke({ color: index % 2 ? COLORS.cyan : 0xb070ff, alpha: .7, width: 3 });
      container.addChild(ring);
      return ring;
    });
    const spiralArcs = Array.from({ length: 4 }, (_, index) => {
      const radius = 66 + index * 13;
      const arc = new Graphics().arc(0, 0, radius, -.65, .7).stroke({ color: index % 2 ? COLORS.pink : COLORS.cyan, alpha: .82, width: 4 - index * .45 });
      arc.blendMode = "add";
      container.addChild(arc);
      return arc;
    });
    const wisps = [];
    const dust = [];
    const stars = [];
    container.addChildAt(violetHalo, 0);
    container.addChildAt(shadowAura, 1);
    container.addChild(magentaCloud, cyanCloud);
    for (let index = 0; index < 7; index += 1) {
      const wisp = new Graphics().ellipse(0, 0, 34 + index % 3 * 10, 10 + index % 2 * 5).fill({ color: index % 2 ? 0x17052d : 0x05000c, alpha: .48 });
      container.addChildAt(wisp, 2 + index);
      wisps.push({ sprite: wisp, angle: index * Math.PI * 2 / 7, radius: 66 + index % 3 * 18, speed: 2.4 + index % 4 * .42 });
    }
    container.addChild(accretionOuter, accretionInner, coreGlow, voidCore);
    for (let index = 0; index < 28; index += 1) {
      const color = [COLORS.cyan, COLORS.pink, COLORS.violet, COLORS.white][index % 4];
      const mote = glow(color, 10 + index % 5 * 4, .86);
      container.addChild(mote);
      dust.push({ sprite: mote, angle: index * Math.PI * 2 / 28, radius: 58 + index % 7 * 16, speed: 2 + index % 5 * .38 });
    }
    for (let index = 0; index < 16; index += 1) {
      const star = drawStar(new Graphics(), 3 + index % 3 * 1.7, index % 3 === 0 ? 0xff9ee9 : COLORS.white, .95);
      star.blendMode = "add";
      container.addChild(star);
      stars.push({ sprite: star, angle: index * Math.PI * 2 / 16 + .24, radius: 78 + index % 5 * 19, speed: 2.6 + index % 4 * .46 });
    }
    return add(container, 2200, (progress, elapsed) => {
      const handXRatio = side === "hero" ? .535 : .465;
      container.position.copyFrom(point(side, handXRatio, .55));
      const form = Math.min(1, easeOut(progress * 2.2));
      const collapse = progress > .79 ? (1 - progress) / .21 : 1;
      const surge = 1 + Math.sin(elapsed * 17) * .06 + Math.sin(elapsed * 7.3) * .04;
      container.rotation = Math.sin(elapsed * 8) * .015;
      violetHalo.scale.set((.58 + form * .62 + Math.sin(elapsed * 6) * .12) * surge);
      violetHalo.alpha = collapse * (.38 + Math.sin(elapsed * 7.2) * .13);
      shadowAura.scale.set(.62 + form * .62 + Math.sin(elapsed * 11) * .09, .72 + form * .42 + Math.cos(elapsed * 9) * .08);
      shadowAura.rotation = elapsed * .7;
      shadowAura.alpha = collapse * (.48 + Math.sin(elapsed * 12) * .12);
      cyanCloud.position.set(Math.cos(elapsed * 3.1) * 32, Math.sin(elapsed * 3.8) * 23);
      magentaCloud.position.set(Math.cos(elapsed * 2.7 + Math.PI) * 36, Math.sin(elapsed * 3.3 + 1.2) * 27);
      cyanCloud.scale.set(.68 + Math.sin(elapsed * 8) * .21);
      magentaCloud.scale.set(.72 + Math.cos(elapsed * 7.1) * .22);
      cyanCloud.alpha = collapse * (.24 + Math.sin(elapsed * 8.7) * .11);
      magentaCloud.alpha = collapse * (.28 + Math.cos(elapsed * 7.8) * .12);
      pulseRings.forEach((ring, index) => {
        const cycle = (elapsed * (1.65 + index * .16) + index / pulseRings.length) % 1;
        ring.scale.set(.35 + cycle * 1.8);
        ring.alpha = collapse * (1 - cycle) * (.72 - index * .1);
      });
      spiralArcs.forEach((arc, index) => {
        arc.rotation = elapsed * (index % 2 ? -3.8 : 3.2) + index * Math.PI / 2;
        arc.scale.set(.55 + form * .58 + Math.sin(elapsed * 10 + index) * .08);
        arc.alpha = collapse * (.48 + Math.sin(elapsed * 12 + index * 1.4) * .3);
      });
      wisps.forEach(({ sprite, angle, radius, speed }, index) => {
        const orbit = angle + elapsed * speed;
        const inward = radius * (1 - progress * .58);
        sprite.position.set(Math.cos(orbit) * inward, Math.sin(orbit) * inward * .55);
        sprite.rotation = orbit + Math.PI / 2;
        sprite.scale.set(.7 + Math.sin(elapsed * 8 + index) * .18);
        sprite.alpha = collapse * (.32 + Math.sin(elapsed * 9 + index * 1.7) * .16);
      });
      accretionOuter.rotation = elapsed * 4.2;
      accretionInner.rotation = -elapsed * 6.1;
      accretionOuter.scale.set(.3 + form * .88, .5 + form * .56);
      accretionInner.scale.set(.26 + form * .82, .43 + form * .64);
      coreGlow.position.set(Math.sin(elapsed * 19) * 3.5, Math.cos(elapsed * 17) * 2.5);
      coreGlow.scale.set(.38 + form * .82 + Math.sin(elapsed * 21) * .15);
      coreGlow.alpha = collapse * (.68 + Math.sin(elapsed * 17) * .25);
      voidCore.scale.set(.52 + form * .58 + Math.sin(elapsed * 13) * .09);
      dust.forEach(({ sprite, angle, radius, speed }, index) => {
        const inward = radius * (1 - progress * .76);
        const orbit = angle + elapsed * speed * (1 + progress * .9);
        sprite.position.set(Math.cos(orbit) * inward, Math.sin(orbit) * inward * .6);
        sprite.scale.set(.4 + form * .78 + Math.sin(elapsed * 14 + index) * .09);
        sprite.alpha = collapse * (.52 + Math.sin(elapsed * 12 + index) * .34);
      });
      stars.forEach(({ sprite, angle, radius, speed }, index) => {
        const orbit = angle - elapsed * speed * (1 + progress * .65);
        sprite.position.set(Math.cos(orbit) * radius * (1 - progress * .62), Math.sin(orbit) * radius * .54 * (1 - progress * .62));
        sprite.rotation = -orbit + elapsed * 3.4;
        sprite.scale.set(.78 + Math.sin(elapsed * 15 + index) * .22);
        sprite.alpha = collapse * (.64 + Math.sin(elapsed * 14 + index * 1.7) * .35);
      });
      container.alpha = collapse;
    });
  }

  function makeGalaxyFlash(side = "hero") {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const origin = point(side, .735, .535);
    const target = point(targetSide, .52, .52);
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

  function makePunchWind(side = "hero") {
    const origin = point(side, .72, .52);
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

  function makeGalaxyRayShot(side = "hero") {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const origin = point(side, .88, .48);
    const target = point(targetSide, .48, .5);
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

  function makeNovaDive(side = "hero", targetPoint) {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const origin = point(side, .5, .42);
    const target = targetPoint || point(targetSide, .5, .62);
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

  function makeNovaStrike(side = "hero", index = 0) {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const container = new Container();
    container.position.copyFrom(point(targetSide, .5, .5));
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

  function makeNovaImpact(side = "hero", critical = false) {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const container = new Container();
    container.position.copyFrom(point(targetSide, .5, .68));
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

  function makeSutekichiStarTouch(side = "enemy") {
    const targetSide = side === "hero" ? "enemy" : "hero";
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
      container.position.copyFrom(point(targetSide, .53, .48));
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

  function makeSutekichiHaloSkip(side = "enemy") {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const container = new Container();
    const rings = [0, 1, 2].map((index) => new Graphics().ellipse(0, 0, 56 + index * 20, 18 + index * 7).stroke({ color: index === 1 ? COLORS.cyan : COLORS.gold, alpha: .88 - index * .16, width: 5 - index }));
    const star = drawStar(new Graphics(), 21, COLORS.white);
    const streaks = Array.from({ length: 7 }, (_, index) => new Graphics().roundRect(-120 - index * 20, -2, 80 + index * 13, 4, 2).fill({ color: index % 2 ? COLORS.gold : COLORS.cyan, alpha: .72 }));
    container.addChild(glow(COLORS.cyan, 165, .38), ...streaks, ...rings, star);
    const origin = point(side, .46, .42);
    const target = point(targetSide, .54, .5);
    return add(container, 1450, (progress, elapsed) => {
      const travel = easeInOut(clamp01(progress / .78));
      container.position.set(origin.x + (target.x - origin.x) * travel, origin.y + (target.y - origin.y) * travel - Math.sin(travel * Math.PI) * 120);
      container.rotation = elapsed * 3.1;
      container.scale.set(.65 + Math.sin(progress * Math.PI) * .55);
      container.alpha = 1 - Math.max(0, progress - .8) / .2;
      rings.forEach((ring, index) => ring.rotation = elapsed * (index % 2 ? -2 : 2.6));
    });
  }

  function makeSutekichiStellaSearch(side = "enemy") {
    const targetSide = side === "hero" ? "enemy" : "hero";
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
      container.position.copyFrom(point(targetSide, .5, .46));
      container.scale.set(.72 + easeOut(progress) * .36);
      container.alpha = Math.sin(progress * Math.PI) * 1.25;
      outer.rotation = elapsed * .7;
      inner.rotation = -elapsed * 1.2;
      scanner.rotation = elapsed * 4.8;
      markers.forEach((marker, index) => marker.scale.set(.7 + Math.sin(elapsed * 5 + index) * .3));
    });
  }

  function makeSutekichiCometCharge(side = "enemy") {
    const container = new Container();
    const crest = drawStar(new Graphics(), 42, COLORS.white);
    const rings = [58, 88, 122].map((radius, index) => new Graphics().circle(0, 0, radius).stroke({ color: index % 2 ? COLORS.cyan : COLORS.gold, alpha: .76, width: 3 }));
    const stars = Array.from({ length: 16 }, (_, index) => drawStar(new Graphics(), 4 + index % 4, index % 3 ? COLORS.gold : COLORS.cyan));
    container.addChild(glow(COLORS.gold, 300, .38), ...rings, crest, ...stars);
    return add(container, 1750, (progress, elapsed) => {
      container.position.copyFrom(point(side, .5, .38));
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

  function makeSutekichiComet(side = "enemy", index = 0, duration = 575) {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const container = new Container();
    const tail = new Graphics().poly([-300, -30, -15, -50, 0, 0, -15, 50, -300, 30, -225, 0]).fill({ color: COLORS.cyan, alpha: .38 });
    const tailCore = new Graphics().poly([-240, -10, -8, -22, 0, 0, -8, 22, -240, 10]).fill({ color: COLORS.gold, alpha: .82 });
    const head = drawStar(new Graphics(), 50, COLORS.white);
    container.addChild(glow(COLORS.gold, 210, .72), tail, tailCore, head);
    const screen = getScreen();
    const targetRatios = [[.34, .38], [.64, .44], [.43, .51], [.61, .58], [.37, .65], [.52, .72]];
    const [xRatio, yRatio] = targetRatios[index] ?? targetRatios[1];
    const target = point(targetSide, xRatio, yRatio);
    const start = {
      x: screen.width * (side === "hero" ? .04 + index * .022 : .96 - index * .022),
      y: screen.height * ([.08, .015, .06, .025, .095, .045][index] ?? .03),
    };
    const scale = [.76, .84, .92, 1, 1.08, 1.16][index] ?? 1;
    return add(container, duration, (progress) => {
      const travel = easeInOut(progress);
      container.position.set(start.x + (target.x - start.x) * travel, start.y + (target.y - start.y) * travel);
      container.rotation = Math.atan2(target.y - start.y, target.x - start.x);
      container.scale.set((.55 + progress * .65) * scale);
      container.alpha = 1 - Math.max(0, progress - .9) / .1;
    });
  }

  function makeSutekichiCometImpact(side = "enemy", index = 0) {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const container = new Container();
    const impactScale = .68 + index * .16;
    const outerGlow = glow(COLORS.ember, 420, .62);
    const innerGlow = glow(COLORS.gold, 280, .8);
    const core = new Graphics()
      .circle(0, 0, 74).fill({ color: COLORS.ember, alpha: .8 })
      .circle(0, 0, 51).fill({ color: COLORS.gold, alpha: .94 })
      .circle(0, 0, 24).fill({ color: COLORS.white, alpha: 1 });
    core.blendMode = "add";
    const fireballs = Array.from({ length: 9 }, (_, fireballIndex) => {
      const fireball = new Graphics().circle(0, 0, 28 + fireballIndex % 3 * 9).fill({
        color: fireballIndex % 3 === 0 ? COLORS.ember : fireballIndex % 2 ? COLORS.gold : COLORS.white,
        alpha: .8,
      });
      fireball.blendMode = "add";
      return fireball;
    });
    const rays = Array.from({ length: 20 }, (_, rayIndex) => {
      const ray = new Graphics().roundRect(28, -3, 105 + rayIndex % 5 * 23, 6, 3).fill({
        color: rayIndex % 4 === 0 ? COLORS.white : rayIndex % 2 ? COLORS.ember : COLORS.gold,
        alpha: .88,
      });
      ray.rotation = rayIndex * Math.PI * 2 / 20;
      return ray;
    });
    const shockwave = new Graphics().circle(0, 0, 64).stroke({ color: COLORS.white, alpha: .96, width: 8 });
    const fireRing = new Graphics().circle(0, 0, 82).stroke({ color: COLORS.ember, alpha: .88, width: 12 });
    const fragments = Array.from({ length: 16 }, (_, fragmentIndex) => {
      const fragment = new Graphics()
        .rect(-5, -5, 10 + fragmentIndex % 3 * 3, 10 + fragmentIndex % 3 * 3)
        .fill({ color: fragmentIndex % 3 ? COLORS.gold : COLORS.white, alpha: .92 });
      fragment.rotation = fragmentIndex * Math.PI / 8;
      return fragment;
    });
    container.addChild(outerGlow, innerGlow, ...fireballs, core, shockwave, fireRing, ...rays, ...fragments);
    const targetRatios = [[.34, .38], [.64, .44], [.43, .51], [.61, .58], [.37, .65], [.52, .72]];
    const [xRatio, yRatio] = targetRatios[index] ?? targetRatios[1];
    return add(container, 1050, (progress, elapsed) => {
      container.position.copyFrom(point(targetSide, xRatio, yRatio));
      const burst = easeOut(progress);
      const fade = 1 - progress;
      container.scale.set(impactScale);
      outerGlow.scale.set(.28 + burst * 1.8);
      outerGlow.alpha = fade * .62;
      innerGlow.scale.set(.18 + burst * 1.45);
      innerGlow.alpha = fade * .8;
      core.scale.set(.18 + Math.sin(Math.min(1, progress * 1.6) * Math.PI) * 1.35);
      core.alpha = fade;
      shockwave.scale.set(.12 + burst * 2.5);
      shockwave.alpha = fade;
      fireRing.scale.set(.08 + burst * 3.1);
      fireRing.alpha = fade * .82;
      rays.forEach((ray, rayIndex) => {
        ray.scale.x = .12 + burst * (1.25 + rayIndex % 3 * .12);
        ray.alpha = fade;
      });
      fireballs.forEach((fireball, fireballIndex) => {
        const angle = fireballIndex * Math.PI * 2 / fireballs.length + index * .31;
        const distance = burst * (34 + fireballIndex % 4 * 13);
        fireball.position.set(Math.cos(angle) * distance, Math.sin(angle) * distance);
        fireball.scale.set(.25 + Math.sin(Math.min(1, progress * 1.4) * Math.PI) * (1.1 + fireballIndex % 3 * .12));
        fireball.alpha = fade * .85;
      });
      fragments.forEach((fragment, fragmentIndex) => {
        const angle = fragmentIndex * Math.PI * 2 / fragments.length + index * .17;
        const distance = burst * (105 + fragmentIndex % 5 * 18);
        fragment.position.set(Math.cos(angle) * distance, Math.sin(angle) * distance * .82);
        fragment.rotation = angle + elapsed * (fragmentIndex % 2 ? -4 : 4.5);
        fragment.alpha = fade;
      });
    });
  }

  function makeSutekichiNapDream(side = "enemy") {
    const container = new Container();
    const moon = new Graphics().circle(0, 0, 34).fill({ color: COLORS.gold, alpha: .92 }).circle(14, -10, 32).cut();
    const bubbles = Array.from({ length: 9 }, (_, index) => new Graphics().circle(0, 0, 7 + index % 4 * 3).stroke({ color: index % 2 ? COLORS.cyan : COLORS.white, alpha: .7, width: 2 }));
    const stars = Array.from({ length: 6 }, (_, index) => drawStar(new Graphics(), 5 + index % 3, COLORS.gold));
    container.addChild(glow(COLORS.cyan, 220, .22), moon, ...bubbles, ...stars);
    return add(container, 3600, (progress, elapsed) => {
      container.position.copyFrom(point(side, .53, .35));
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

  function makeSutekichiNapResult(success, side = "enemy") {
    if (!success) return makeBurst({ side, yRatio: .48, color: COLORS.cyan, secondary: 0x55739d, duration: 900, radius: 80, count: 5 });
    const container = new Container();
    const rings = [72, 112].map((radius) => new Graphics().circle(0, 0, radius).stroke({ color: COLORS.cyan, alpha: .8, width: 5 }));
    const stars = Array.from({ length: 22 }, (_, index) => drawStar(new Graphics(), 6 + index % 4, index % 3 ? COLORS.gold : COLORS.white));
    container.addChild(glow(COLORS.gold, 420, .55), ...rings, ...stars);
    return add(container, 1500, (progress) => {
      container.position.copyFrom(point(side, .5, .5));
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

  function drawBusinessCard(graphics, width = 54, height = 30) {
    graphics
      .roundRect(-width / 2, -height / 2, width, height, 4)
      .fill({ color: COLORS.white, alpha: .97 })
      .roundRect(-width * .34, -height * .18, width * .26, height * .12, 2)
      .fill({ color: COLORS.gold, alpha: .9 })
      .roundRect(-width * .34, height * .06, width * .5, height * .07, 2)
      .fill({ color: 0x384665, alpha: .72 });
    return graphics;
  }

  function drawDocument(graphics, width = 52, height = 70) {
    graphics
      .roundRect(-width / 2, -height / 2, width, height, 4)
      .fill({ color: 0xfffdf0, alpha: .96 })
      .roundRect(-width * .3, -height * .2, width * .6, 4, 2)
      .fill({ color: 0x52627a, alpha: .7 })
      .roundRect(-width * .3, -height * .06, width * .46, 4, 2)
      .fill({ color: 0x52627a, alpha: .55 })
      .circle(width * .2, height * .22, width * .14)
      .stroke({ color: 0xd83e38, alpha: .86, width: 3 });
    return graphics;
  }

  function makeBusinessCardStrike(side = "hero") {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const origin = point(side, side === "hero" ? .72 : .28, .46);
    const target = point(targetSide, .5, .5);
    const container = new Container();
    const cards = Array.from({ length: 5 }, (_, index) => {
      const card = drawBusinessCard(new Graphics(), 60, 34);
      const trail = glow(index % 2 ? COLORS.cyan : COLORS.gold, 74, .3);
      const unit = new Container();
      unit.addChild(trail, card);
      container.addChild(unit);
      return { unit, lag: index * .075, wave: (index - 2) * 18, spin: index % 2 ? 1 : -1 };
    });
    return add(container, 1080, (progress, elapsed) => {
      cards.forEach(({ unit, lag, wave, spin }) => {
        const travel = easeInOut(clamp01((progress - lag) / (1 - lag)));
        unit.position.set(
          origin.x + (target.x - origin.x) * travel,
          origin.y + (target.y - origin.y) * travel + Math.sin(travel * Math.PI) * wave,
        );
        unit.rotation = spin * (elapsed * 8 + travel * 2.2);
        unit.alpha = progress < lag ? 0 : 1 - Math.max(0, progress - .82) / .18;
        unit.scale.set(.66 + travel * .48);
      });
    });
  }

  function makeClosingTimeDash(side = "hero") {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const origin = point(side, .5, .5);
    const target = point(targetSide, .5, .5);
    const { width } = getScreen();
    const container = new Container();
    const direction = target.x >= origin.x ? 1 : -1;
    const destinationX = target.x - direction * width * .14;
    const outerAura = new Graphics()
      .poly([0, -138, 24, -102, 54, -126, 57, -80, 94, -92, 78, -44, 117, -34, 88, 0, 118, 36, 78, 43, 92, 91, 55, 80, 51, 128, 23, 101, 0, 141, -23, 101, -51, 128, -55, 80, -92, 91, -78, 43, -118, 36, -88, 0, -117, -34, -78, -44, -94, -92, -57, -80, -54, -126, -24, -102])
      .fill({ color: COLORS.gold, alpha: .2 })
      .stroke({ color: COLORS.white, alpha: .78, width: 4 });
    outerAura.blendMode = "add";
    const innerAura = new Graphics()
      .poly([0, -112, 19, -76, 39, -98, 43, -58, 68, -72, 59, -31, 88, -19, 67, 4, 83, 32, 55, 35, 64, 69, 36, 62, 31, 101, 12, 75, 0, 111, -12, 75, -31, 101, -36, 62, -64, 69, -55, 35, -83, 32, -67, 4, -88, -19, -59, -31, -68, -72, -43, -58, -39, -98, -19, -76])
      .fill({ color: 0xfff5a6, alpha: .28 })
      .stroke({ color: COLORS.gold, alpha: .9, width: 3 });
    innerAura.blendMode = "add";
    const lightning = [
      new Graphics().moveTo(-48, -103).lineTo(-71, -55).lineTo(-49, -62).lineTo(-67, -16).stroke({ color: COLORS.white, alpha: .95, width: 4 }),
      new Graphics().moveTo(53, -86).lineTo(71, -46).lineTo(52, -51).lineTo(70, -8).stroke({ color: COLORS.cyan, alpha: .9, width: 4 }),
      new Graphics().moveTo(-43, 55).lineTo(-65, 82).lineTo(-44, 78).lineTo(-57, 111).stroke({ color: COLORS.white, alpha: .86, width: 3 }),
    ];
    lightning.forEach((bolt) => { bolt.blendMode = "add"; });
    const lines = Array.from({ length: 18 }, (_, index) => {
      const length = 80 + index % 5 * 34;
      const line = new Graphics().roundRect(-length, -2, length, 3 + index % 3, 3).fill({ color: index % 4 ? COLORS.gold : COLORS.white, alpha: .78 });
      line.position.y = (index - 8.5) * 14;
      container.addChild(line);
      return { line, speed: 280 + index * 21, phase: index * 17 };
    });
    const particles = Array.from({ length: 20 }, (_, index) => {
      const particle = glow(index % 4 ? COLORS.gold : COLORS.white, 8 + index % 3 * 4, .92);
      container.addChild(particle);
      return { particle, angle: index * Math.PI * 2 / 20, radius: 76 + index % 5 * 12, phase: index * .43 };
    });
    const impactRing = new Graphics().ellipse(0, 0, 48, 105).stroke({ color: COLORS.white, alpha: .95, width: 7 });
    const impactRingOuter = new Graphics().ellipse(0, 0, 65, 132).stroke({ color: COLORS.gold, alpha: .82, width: 5 });
    container.addChildAt(glow(COLORS.gold, 260, .5), 0);
    container.addChild(outerAura, innerAura, ...lightning, impactRingOuter, impactRing);
    return add(container, 420, (progress, elapsed) => {
      const travel = easeInOut(clamp01((progress - .16) / .84));
      const charge = easeOut(clamp01(progress / .2));
      container.position.set(origin.x + (destinationX - origin.x) * travel, origin.y + (target.y - origin.y) * travel);
      container.scale.x = direction;
      const pulse = .88 + Math.sin(elapsed * 28) * .08 + charge * .1;
      outerAura.scale.set(pulse);
      outerAura.alpha = (.46 + Math.sin(elapsed * 23) * .18) * Math.sin(Math.min(1, progress * 1.7) * Math.PI * .5);
      innerAura.scale.set(.83 + Math.sin(elapsed * 35) * .07);
      innerAura.alpha = .62 + Math.sin(elapsed * 31) * .2;
      lightning.forEach((bolt, index) => {
        bolt.alpha = Math.sin(elapsed * (24 + index * 5) + index * 1.7) > .2 ? .95 : .08;
      });
      lines.forEach(({ line, speed, phase }, index) => {
        line.position.x = -((elapsed * speed + phase) % 185) - 40;
        line.alpha = (.3 + index % 4 * .13) * charge * (1 - Math.max(0, progress - .93) / .07);
      });
      particles.forEach(({ particle, angle, radius, phase }) => {
        const currentAngle = angle + elapsed * (4.2 + phase % 2);
        particle.position.set(Math.cos(currentAngle) * radius, Math.sin(currentAngle) * radius * .88);
        particle.alpha = .5 + Math.sin(elapsed * 18 + phase) * .42;
      });
      const impact = clamp01((progress - .62) / .38);
      impactRing.scale.set(.4 + impact * 2.2, .4 + impact * 1.1);
      impactRingOuter.scale.set(.25 + impact * 2.8, .25 + impact * 1.25);
      impactRing.alpha = impact > 0 ? 1 - impact : 0;
      impactRingOuter.alpha = impact > 0 ? (1 - impact) * .82 : 0;
      container.alpha = 1 - Math.max(0, progress - .96) / .04;
    });
  }

  function makeAngelWink(side = "hero") {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const origin = point(side, side === "hero" ? .66 : .34, .3);
    const target = point(targetSide, .5, .42);
    const container = new Container();
    const heart = drawHeart(new Graphics(), 55, COLORS.pink);
    const leftWing = new Graphics().poly([-25, -2, -80, -38, -64, 4, -88, 27, -26, 18]).fill({ color: COLORS.white, alpha: .92 });
    const rightWing = new Graphics().poly([25, -2, 80, -38, 64, 4, 88, 27, 26, 18]).fill({ color: COLORS.white, alpha: .92 });
    const halo = glow(COLORS.pink, 175, .48);
    const motes = Array.from({ length: 9 }, (_, index) => {
      const mote = index % 3 ? drawHeart(new Graphics(), 12, 0xff9dca) : drawStar(new Graphics(), 7, COLORS.gold);
      container.addChild(mote);
      return { mote, lag: .055 + index * .038, wave: (index % 2 ? 1 : -1) * (15 + index * 2) };
    });
    container.addChildAt(halo, 0);
    container.addChild(leftWing, rightWing, heart);
    return add(container, 1520, (progress, elapsed) => {
      const travel = easeInOut(clamp01(progress * 1.08));
      const x = origin.x + (target.x - origin.x) * travel;
      const y = origin.y + (target.y - origin.y) * travel - Math.sin(travel * Math.PI) * 45;
      container.position.set(x, y);
      const flap = .7 + Math.sin(elapsed * 15) * .3;
      leftWing.scale.y = flap;
      rightWing.scale.y = flap;
      heart.scale.set(1 + Math.sin(elapsed * 20) * .08);
      motes.forEach(({ mote, lag, wave }) => {
        const previous = clamp01(travel - lag);
        mote.position.set(
          origin.x + (target.x - origin.x) * previous - x,
          origin.y + (target.y - origin.y) * previous - Math.sin(previous * Math.PI) * 45 - y + Math.sin(elapsed * 8 + lag * 20) * wave,
        );
        mote.alpha = travel > lag ? (1 - progress) * .8 : 0;
      });
      container.alpha = 1 - Math.max(0, progress - .84) / .16;
    });
  }

  function makeApprovalMeteorCharge(side = "hero") {
    const container = new Container();
    const documents = Array.from({ length: 8 }, () => {
      const documentSheet = drawDocument(new Graphics(), 32, 44);
      container.addChild(documentSheet);
      return documentSheet;
    });
    const seal = new Graphics().circle(0, 0, 42).stroke({ color: 0xd83e38, alpha: .92, width: 6 });
    container.addChildAt(glow(COLORS.gold, 280, .42), 0);
    container.addChild(seal);
    return add(container, 2100, (progress, elapsed) => {
      container.position.copyFrom(point(side, .5, .36));
      documents.forEach((documentSheet, index) => {
        const angle = index * Math.PI * 2 / documents.length + elapsed * (index % 2 ? -1.05 : 1.25);
        const radius = 115 - progress * 62 + index % 2 * 16;
        documentSheet.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * .58);
        documentSheet.rotation = angle + Math.PI / 2;
      });
      seal.rotation = elapsed * -.8;
      seal.scale.set(.65 + progress * .75 + Math.sin(elapsed * 8) * .08);
      container.alpha = 1 - Math.max(0, progress - .9) / .1;
    });
  }

  function makeApprovalMeteor(side = "hero") {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const screen = getScreen();
    const target = point(targetSide, .5, .58);
    const container = new Container();
    const documents = Array.from({ length: 13 }, (_, index) => {
      const documentSheet = drawDocument(new Graphics(), 42 + index % 3 * 5, 58 + index % 3 * 7);
      container.addChild(documentSheet);
      return { documentSheet, x: (index - 6) * 29, lag: index % 5 * .035, spin: index % 2 ? 1 : -1 };
    });
    const seal = new Graphics().circle(0, 0, 74).stroke({ color: 0xd83e38, alpha: .96, width: 11 });
    const cross = new Graphics().moveTo(-42, 0).lineTo(42, 0).moveTo(0, -42).lineTo(0, 42).stroke({ color: 0xd83e38, alpha: .82, width: 8 });
    container.addChild(glow(COLORS.gold, 420, .58), seal, cross);
    return add(container, 1880, (progress, elapsed) => {
      container.position.set(target.x, target.y);
      documents.forEach(({ documentSheet, x, lag, spin }) => {
        const fall = easeInOut(clamp01((progress - lag) / (.82 - lag)));
        documentSheet.position.set(x + Math.sin(elapsed * 5 + x) * 14, -screen.height * .72 * (1 - fall));
        documentSheet.rotation = spin * elapsed * 4.2;
        documentSheet.alpha = progress < lag ? 0 : 1 - Math.max(0, progress - .84) / .16;
      });
      const impactProgress = clamp01((progress - .58) / .42);
      seal.scale.set(.15 + easeOut(impactProgress) * 1.65);
      cross.scale.copyFrom(seal.scale);
      seal.alpha = Math.sin(impactProgress * Math.PI);
      cross.alpha = seal.alpha;
      container.alpha = 1 - Math.max(0, progress - .92) / .08;
    });
  }

  function makeCharmStatus(side = "enemy", broken = false) {
    const container = new Container();
    const count = broken ? 10 : 13;
    const hearts = Array.from({ length: count }, (_, index) => {
      const heart = drawHeart(new Graphics(), broken ? 18 : 14 + index % 3 * 3, index % 2 ? COLORS.pink : 0xffb8dc);
      container.addChild(heart);
      return heart;
    });
    const ring = new Graphics().circle(0, 0, 44).stroke({ color: broken ? COLORS.white : COLORS.pink, alpha: .9, width: 5 });
    container.addChild(ring);
    return add(container, broken ? 680 : 1200, (progress) => {
      container.position.copyFrom(point(side, .5, .2));
      const burst = easeOut(progress);
      hearts.forEach((heart, index) => {
        const angle = index * Math.PI * 2 / hearts.length;
        const distance = (broken ? 32 : 18) + burst * (broken ? 145 : 92 + index % 3 * 10);
        heart.position.set(Math.cos(angle) * distance, Math.sin(angle) * distance * .58 - burst * 35);
        heart.rotation = angle + (broken ? progress * 4 : 0);
        heart.alpha = (1 - progress) * .92;
      });
      ring.scale.set(.2 + burst * (broken ? 2.8 : 1.9));
      ring.alpha = 1 - progress;
    });
  }

  function asterFacingRatio(side, heroRatio) {
    return side === "hero" ? heroRatio : 1 - heroRatio;
  }

  function makeAsterTailSweep(side) {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const center = point(side, .5, .62);
    const direction = side === "hero" ? 1 : -1;
    const container = new Container();
    container.position.copyFrom(center);
    const arcs = [0, 1, 2].map((index) => {
      const radius = 118 + index * 25;
      const arc = new Graphics()
        .arc(0, 0, radius, -.82 * Math.PI, .42 * Math.PI)
        .stroke({ color: index === 1 ? 0xe4c66d : index === 2 ? 0xffffff : 0x7045c7, alpha: .9 - index * .17, width: 18 - index * 4 });
      arc.scale.x = direction;
      container.addChild(arc);
      return arc;
    });
    const afterimages = Array.from({ length: 14 }, (_, index) => {
      const mote = glow(index % 3 === 0 ? 0xffffff : index % 2 ? 0xe4c66d : 0x7045c7, 16 + index % 4 * 5, .9);
      container.addChild(mote);
      return mote;
    });
    makeBurst({ side: targetSide, yRatio: .62, color: 0x34205f, secondary: 0xe4c66d, duration: 900, radius: 175, count: 17 });
    return add(container, 940, (progress, elapsed) => {
      const sweep = easeOut(clamp01(progress * 1.35));
      container.rotation = direction * (-.46 + sweep * 1.24);
      arcs.forEach((arc, index) => {
        arc.alpha = (1 - progress) * (.92 - index * .15);
        arc.scale.y = .42 + sweep * (.62 + index * .07);
      });
      afterimages.forEach((mote, index) => {
        const angle = -.72 * Math.PI + sweep * 1.5 * Math.PI - index * .075;
        const radius = 138 + index % 4 * 15;
        mote.position.set(Math.cos(angle) * radius * direction, Math.sin(angle) * radius * .58);
        mote.scale.set(.7 + Math.sin(elapsed * 18 + index) * .18);
        mote.alpha = Math.max(0, 1 - progress * 1.12) * (.48 + index % 3 * .16);
      });
    });
  }

  function makeAsterMigration(side) {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const origin = point(targetSide, .5, .48);
    const destination = point(side, asterFacingRatio(side, .57), .4);
    const dx = destination.x - origin.x;
    const dy = destination.y - origin.y;
    const container = new Container();
    const vortex = [0, 1, 2].map((index) => {
      const ring = new Graphics().ellipse(0, 0, 56 + index * 22, 30 + index * 12)
        .stroke({ color: index % 2 ? 0x63e0dc : 0xc766e8, alpha: .84, width: 7 - index });
      container.addChild(ring);
      return ring;
    });
    const motes = Array.from({ length: 42 }, (_, index) => {
      const life = index % 2 === 0;
      const mote = glow(life ? 0xff66bd : 0x63e0dc, 10 + index % 5 * 4, .92);
      container.addChild(mote);
      return { mote, offset: index / 42, phase: index * 1.73, life };
    });
    container.position.copyFrom(origin);
    makeBeam({ from: targetSide, to: side, fromRatio: [.5, .43], toRatio: [asterFacingRatio(side, .57), .38], color: 0xff4fae, secondary: 0xc766e8, width: 28, duration: 1480 });
    makeBeam({ from: targetSide, to: side, fromRatio: [.5, .56], toRatio: [asterFacingRatio(side, .57), .43], color: 0x63e0dc, secondary: 0xbdfcff, width: 22, duration: 1540 });
    makeScreenFlash(0x8b42bd, 460);
    return add(container, 1600, (progress, elapsed) => {
      const suction = easeInOut(clamp01(progress * 1.08));
      vortex.forEach((ring, index) => {
        ring.rotation = elapsed * (index % 2 ? -4.2 : 3.4);
        ring.scale.set(.72 + Math.sin(elapsed * 10 + index) * .12);
        ring.alpha = (1 - progress) * (.9 - index * .16);
      });
      motes.forEach(({ mote, offset, phase, life }) => {
        const travel = (suction * 1.55 + offset) % 1;
        const spiral = (1 - travel) * (72 + offset * 38);
        mote.position.set(
          dx * travel + Math.cos(elapsed * 11 + phase) * spiral * .34,
          dy * travel + Math.sin(elapsed * 11 + phase) * spiral,
        );
        mote.scale.set(.45 + travel * 1.25, .45 + travel * .55);
        mote.alpha = (1 - progress) * (life ? .92 : .78);
      });
      container.alpha = progress > .9 ? (1 - progress) / .1 : 1;
    });
  }

  function makeAsterEvilEyeCharge(side) {
    const eye = point(side, asterFacingRatio(side, .6), .27);
    const container = new Container();
    container.position.copyFrom(eye);
    const aura = glow(0xc642ff, 230, .82);
    const core = glow(0xffffff, 76, 1);
    const rings = [0, 1, 2].map((index) => {
      const ring = new Graphics().circle(0, 0, 31 + index * 17)
        .stroke({ color: index === 1 ? 0xff8ced : 0xc642ff, alpha: .9, width: 5 - index });
      container.addChild(ring);
      return ring;
    });
    const rays = new Graphics();
    for (let index = 0; index < 12; index += 1) {
      const angle = index * Math.PI * 2 / 12;
      rays.moveTo(Math.cos(angle) * 42, Math.sin(angle) * 42)
        .lineTo(Math.cos(angle) * (94 + index % 3 * 18), Math.sin(angle) * (94 + index % 3 * 18));
    }
    rays.stroke({ color: 0xffd8ff, alpha: .88, width: 4 });
    container.addChildAt(aura, 0);
    container.addChild(rays, core);
    return add(container, 600, (progress, elapsed) => {
      const flare = easeOut(clamp01(progress * 2.5));
      aura.scale.set(.35 + flare * 1.15 + Math.sin(elapsed * 20) * .1);
      core.scale.set(.35 + flare * .75 + Math.sin(elapsed * 28) * .14);
      rays.rotation = elapsed * 1.8;
      rays.scale.set(.35 + flare * .85);
      rays.alpha = (1 - Math.max(0, progress - .72) / .28) * .86;
      rings.forEach((ring, index) => {
        ring.rotation = elapsed * (index % 2 ? -2.4 : 2.1);
        ring.scale.set(.35 + flare * (1 + index * .2));
        ring.alpha = (1 - progress) * (.92 - index * .18);
      });
    });
  }

  function makeAsterDeathEnergy(side) {
    const targetSide = side === "hero" ? "enemy" : "hero";
    const screen = getScreen();
    const fromRatio = [asterFacingRatio(side, .3), .23];
    const origin = point(side, fromRatio[0], fromRatio[1]);
    const target = point(targetSide, .5, .46);
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const length = Math.max(180, Math.hypot(dx, dy));
    const fogHeight = Math.max(300, screen.height * .58);
    const fog = new Container();
    fog.position.copyFrom(origin);
    fog.rotation = Math.atan2(dy, dx);
    const clouds = Array.from({ length: 38 }, (_, index) => {
      const dark = index % 4 !== 0;
      const cloud = new Container();
      const radius = 68 + index % 6 * 19;
      const halo = glow(index % 3 ? 0x8c35b0 : 0xe2a5ff, radius * 2.8, dark ? .42 : .62);
      halo.scale.set(1.5 + index % 3 * .28, .72 + index % 4 * .13);
      const body = new Graphics().ellipse(0, 0, radius * (1.15 + index % 4 * .14), radius * (.54 + index % 5 * .07))
        .fill({ color: dark ? (index % 2 ? 0x21042f : 0x4b0d61) : 0x8a36a8, alpha: dark ? .34 : .24 });
      cloud.addChild(halo, body);
      fog.addChild(cloud);
      return {
        cloud,
        lag: (index % 12) * .025,
        depth: .32 + index % 7 * .09,
        wave: (index % 2 ? 1 : -1) * fogHeight * (.12 + index % 5 * .035),
      };
    });
    makeScreenFlash(0x9e55c7, 620);
    return add(fog, 1900, (progress, elapsed) => {
      clouds.forEach(({ cloud, lag, depth, wave }, index) => {
        const travel = easeInOut(clamp01((progress - lag) / Math.max(.2, .72 - lag)));
        const turbulence = Math.sin(elapsed * (2.2 + depth) + index * 1.43);
        cloud.position.set(
          travel * length - (1 - travel) * 70 + Math.sin(elapsed * 1.3 + index) * 35,
          turbulence * wave + Math.cos(elapsed * 1.7 + index * .71) * fogHeight * .08,
        );
        cloud.rotation = turbulence * .28;
        cloud.alpha = (1 - Math.max(0, progress - .82) / .18) * (index % 4 === 0 ? .5 : .58 + depth * .12);
      });
    });
  }

  const handlers = {
    criticalScreenBurst: (options) => makeBurst({ side: options.side, yRatio: .48, color: COLORS.ember, secondary: COLORS.white, duration: 900, radius: 210, count: 18, critical: true }),
    impact: (options) => makeBurst({ side: options.side === "hero" ? "enemy" : "hero", yRatio: .55, color: options.characterId === "kuroboshi" || (!options.characterId && options.side === "enemy") ? COLORS.violet : COLORS.gold, secondary: COLORS.white, duration: 480, radius: 120, count: 10 }),
    etoileDrive: (options) => makeCharge({ side: options.side, xRatio: .5, yRatio: .5, color: COLORS.gold, secondary: COLORS.cyan, duration: options.duration + 180, radius: 125, count: 16 }),
    projectile: (options) => makeEnergyProjectile({ from: options.side, to: options.side === "hero" ? "enemy" : "hero", color: options.side === "enemy" ? COLORS.violet : COLORS.gold, secondary: options.side === "enemy" ? COLORS.cyan : COLORS.white }),
    dust: (options) => makeDust({ side: options.side, color: options.color === "violet" ? COLORS.violet : COLORS.gold }),
    punchTrail: (options) => makePunchWind(options.side),
    starRing: (options) => makeRingProjectile({ from: options.side, to: options.side === "hero" ? "enemy" : "hero" }),
    meteorClaw: (options) => makeSlashes({ side: options.side === "hero" ? "enemy" : "hero", color: COLORS.violet }),
    crescentRush: (options) => makeCrescentRush(options.side),
    physicalContact: (options) => makeBurst({ side: options.side === "hero" ? "enemy" : "hero", color: options.characterId === "kuroboshi" ? COLORS.violet : COLORS.gold, secondary: COLORS.white, duration: 760, radius: 142, count: 12 }),
    novaCharge: (options) => makeCharge({ side: options.side, xRatio: .5, yRatio: .54, color: COLORS.gold, secondary: COLORS.cyan, duration: 1750, radius: 125, count: 16 }),
    novaRush: (options) => makeBeam({ from: options.side, to: options.side === "hero" ? "enemy" : "hero", fromRatio: [.64, .52], toRatio: [.46, .52], color: COLORS.gold, secondary: COLORS.cyan, width: 56, duration: 900 }),
    novaCapture: (options) => makeOrbit({ side: options.side === "hero" ? "enemy" : "hero", color: COLORS.gold, duration: 3650 }),
    novaPath: (options) => makeNovaPath(options.points),
    novaStrike: (options) => makeNovaStrike(options.side, options.index),
    novaUppercut: (options) => makeNovaUppercut(options),
    novaDive: (options) => makeNovaDive(options.side, options.targetPoint),
    novaImpact: (options) => {
      makeNovaImpact(options.side, options.critical);
      makeScreenFlash(options.critical ? 0xffd8eb : 0xfff4bd, options.critical ? 760 : 560);
      return true;
    },
    galaxyRayCharge: (options) => makeCharge({ side: options.side, xRatio: .79, yRatio: .5, color: COLORS.gold, secondary: COLORS.cyan, duration: 1250, radius: 62, count: 9 }),
    galaxyRay: (options) => makeGalaxyRayShot(options.side),
    kissCharge: (options) => makeKissCharge(options.side),
    throwingKiss: (options) => makeHeartProjectile(options.side),
    kissBurst: (options) => makeKissBurst(options.side),
    kissMiss: (options) => makeKissBurst(options.side, true),
    darkOrbitField: (options) => makeOrbit({ side: options.side, color: COLORS.violet, duration: 2050 }),
    darkOrbitVolley: (options) => makeOrbit({ side: options.side, color: COLORS.violet, duration: 1300, volley: true }),
    blackMeteorSky: (options) => makeVortex({ side: options.side === "hero" ? "enemy" : "hero" }),
    blackMeteor: (options) => makeMeteor({ side: options.side === "hero" ? "enemy" : "hero" }),
    blackMeteorImpact: (options) => makeBurst({ side: options.side === "hero" ? "enemy" : "hero", yRatio: .68, color: COLORS.violet, secondary: COLORS.white, duration: 1200, radius: 230, count: 18 }),
    sutekichiStarTouch: (options) => makeSutekichiStarTouch(options.side),
    sutekichiHaloSkip: (options) => makeSutekichiHaloSkip(options.side),
    sutekichiStellaSearch: (options) => makeSutekichiStellaSearch(options.side),
    sutekichiCometCharge: (options) => makeSutekichiCometCharge(options.side),
    sutekichiComet: (options) => makeSutekichiComet(options.side, options.index, options.duration),
    sutekichiCometImpact: (options) => {
      if (options.isFinal) makeScreenFlash(0xfff4c6, 700);
      return makeSutekichiCometImpact(options.side, options.index);
    },
    sutekichiNapDream: (options) => makeSutekichiNapDream(options.side),
    sutekichiNapResult: (options) => makeSutekichiNapResult(options.success, options.side),
    businessCardStrike: (options) => makeBusinessCardStrike(options.side),
    closingTimeDash: (options) => makeClosingTimeDash(options.side),
    angelWink: (options) => makeAngelWink(options.side),
    approvalMeteorCharge: (options) => makeApprovalMeteorCharge(options.side),
    approvalMeteor: (options) => makeApprovalMeteor(options.side),
    tatsuoSlap: (options) => makePunchWind(options.side),
    tatsuoRestraintRush: (options) => makeBurst({ side: options.side, yRatio: .78, color: 0x9a6c42, secondary: 0xffcf7b, duration: 620, radius: 105, count: 9 }),
    tatsuoRestraint: (options) => makeBurst({ side: options.side === "hero" ? "enemy" : "hero", yRatio: .68, color: 0x9a6c42, secondary: COLORS.white, duration: 980, radius: 175, count: 14 }),
    tatsuoRoar: (options) => makeTatsuoRoar(options.side),
    tatsuoPressRise: (options) => makeBurst({ side: options.side, yRatio: .82, color: 0x9a6c42, secondary: 0xffcf7b, duration: 760, radius: 130, count: 12 }),
    tatsuoPressDive: (options) => makeTatsuoPressDive(options.side),
    tatsuoPressImpact: (options) => makeTatsuoPressImpact(options.side),
    asterTailSweep: (options) => makeAsterTailSweep(options.side),
    asterMigrationCharge: (options) => makeCharge({ side: options.side, xRatio: asterFacingRatio(options.side, .57), yRatio: .4, color: 0x7045c7, secondary: 0x63e0dc, duration: 1250, radius: 120, count: 22 }),
    asterMigration: (options) => makeAsterMigration(options.side),
    asterEvilEyeCharge: (options) => makeAsterEvilEyeCharge(options.side),
    asterEvilEye: (options) => {
      makeBeam({ from: options.side, to: options.side === "hero" ? "enemy" : "hero", fromRatio: [asterFacingRatio(options.side, .6), .27], toRatio: [.5, .45], color: 0x9b2bff, secondary: 0xff7ce8, width: 18, duration: 580 });
      makeScreenFlash(0xd9b4ff, 360);
      return true;
    },
    asterDeathEnergyCharge: (options) => makeCharge({ side: options.side, xRatio: asterFacingRatio(options.side, .3), yRatio: .23, color: 0x4c176f, secondary: 0xc979ff, duration: 520, radius: 150, count: 24 }),
    asterDeathEnergy: (options) => makeAsterDeathEnergy(options.side),
    petrificationStatus: (options) => makeBurst({ side: options.side, yRatio: .52, color: 0x7d8793, secondary: 0xd8dde2, duration: 920, radius: 165, count: 18 }),
    petrificationBreak: (options) => makeBurst({ side: options.side, yRatio: .58, color: 0x89939d, secondary: COLORS.white, duration: 720, radius: 120, count: 14 }),
    charmStatus: (options) => makeCharmStatus(options.side),
    charmBreak: (options) => makeCharmStatus(options.side, true),
    galaxyCharge: (options) => makeGalaxyCharge(options.side),
    victoryCelebration: (options) => makeVictory(options.side),
    galaxyFlash: (options) => {
      makeGalaxyFlash(options.side);
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
