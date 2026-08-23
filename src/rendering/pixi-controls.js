import { Container, Graphics, Polygon, Rectangle, Text } from "pixi.js";

export const MOBILE_LANDSCAPE_QUERY = "(orientation: landscape) and (max-height: 500px)";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export const getMobileControlRailWidth = (width) => clamp(width * .145, 100, 140);

function createControlButton({ label, kind = "direction", accent = 0x5f4a80, onPress, onRelease }) {
  const root = new Container();
  const background = new Graphics();
  const caption = new Text({
    text: label,
    style: {
      fill: kind === "attack" ? 0x321900 : 0xf6f0ff,
      fontFamily: kind === "action" ? "Orbitron, sans-serif" : "sans-serif",
      fontSize: kind === "attack" ? 21 : kind === "direction" ? 16 : 10,
      fontWeight: "900",
    },
  });
  caption.anchor.set(.5);
  root.addChild(background, caption);
  root.eventMode = "static";
  root.interactiveChildren = false;
  root.cursor = "pointer";

  const activePointers = new Set();
  let enabled = false;
  let pressed = false;
  let width = 44;
  let height = 44;

  function updateCaptionSize() {
    caption.style.fontSize = kind === "attack"
      ? caption.text.length > 1 ? clamp(width * .19, 11, 14) : clamp(width * .3, 18, 23)
      : kind === "direction" ? clamp(width * .34, 14, 18) : clamp(width * .17, 8, 10);
  }

  function draw() {
    background.clear();
    const fill = kind === "attack"
      ? pressed ? 0xffd34d : 0xffe878
      : pressed ? 0x6f5794 : accent;
    const stroke = kind === "attack" ? 0xfff3ad : 0xffffff;
    if (kind === "direction") {
      background
        .roundRect(-width / 2, -height / 2, width, height, 8)
        .fill({ color: fill, alpha: enabled ? .96 : .5 })
        .stroke({ color: stroke, alpha: enabled ? .28 : .12, width: 1.5 });
    } else {
      background
        .circle(0, 0, width / 2)
        .fill({ color: fill, alpha: enabled ? .98 : .5 })
        .stroke({ color: stroke, alpha: enabled ? .78 : .18, width: kind === "attack" ? 2 : 1.5 });
    }
    root.alpha = enabled ? 1 : .45;
  }

  function setPressed(nextPressed) {
    if (pressed === nextPressed) return;
    pressed = nextPressed;
    root.scale.set(nextPressed ? .94 : 1);
    draw();
  }

  function releasePointer(pointerId) {
    if (!activePointers.delete(pointerId)) return;
    if (activePointers.size > 0) return;
    setPressed(false);
    onRelease?.();
  }

  root.on("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!enabled) return;
    const firstPointer = activePointers.size === 0;
    activePointers.add(event.pointerId);
    if (!firstPointer) return;
    setPressed(true);
    onPress?.();
  });
  for (const eventName of ["pointerup", "pointerupoutside", "pointercancel"]) {
    root.on(eventName, (event) => {
      event.preventDefault();
      releasePointer(event.pointerId);
    });
  }

  return {
    root,
    layout(x, y, nextWidth, nextHeight = nextWidth, nextHitArea = null) {
      width = nextWidth;
      height = nextHeight;
      root.position.set(x, y);
      root.hitArea = nextHitArea ?? new Rectangle(-width / 2, -height / 2, width, height);
      updateCaptionSize();
      draw();
    },
    setLabel(nextLabel) {
      caption.text = nextLabel;
      updateCaptionSize();
    },
    setEnabled(nextEnabled) {
      if (enabled === nextEnabled) return;
      enabled = nextEnabled;
      if (!enabled && activePointers.size > 0) {
        activePointers.clear();
        setPressed(false);
        onRelease?.();
      }
      draw();
    },
    release() {
      if (activePointers.size === 0) return;
      activePointers.clear();
      setPressed(false);
      onRelease?.();
    },
  };
}

export function createMobileControlSystem() {
  const root = new Container();
  const rails = new Graphics();
  const controls = new Container();
  root.addChild(rails, controls);
  root.eventMode = "static";
  root.visible = false;

  const handlerSets = {
    battle: {
      moveLeft: null,
      moveRight: null,
      cycleUp: null,
      cycleDown: null,
      attack: null,
      push: null,
    },
    map: {
      moveLeft: null,
      moveRight: null,
      moveUp: null,
      moveDown: null,
      action: null,
      menu: null,
    },
  };
  let mode = "battle";
  let lastInput = null;
  const invoke = (name, callback, ...args) => {
    lastInput = name;
    callback?.(...args);
  };
  const buttons = {
    left: createControlButton({
      label: "◀",
      onPress: () => invoke("left", handlerSets[mode].moveLeft, true),
      onRelease: () => invoke("left-release", handlerSets[mode].moveLeft, false),
    }),
    right: createControlButton({
      label: "▶",
      onPress: () => invoke("right", handlerSets[mode].moveRight, true),
      onRelease: () => invoke("right-release", handlerSets[mode].moveRight, false),
    }),
    up: createControlButton({
      label: "▲",
      onPress: () => mode === "map"
        ? invoke("up", handlerSets.map.moveUp, true)
        : invoke("cycle-up", handlerSets.battle.cycleUp),
      onRelease: () => { if (mode === "map") invoke("up-release", handlerSets.map.moveUp, false); },
    }),
    down: createControlButton({
      label: "▼",
      onPress: () => mode === "map"
        ? invoke("down", handlerSets.map.moveDown, true)
        : invoke("cycle-down", handlerSets.battle.cycleDown),
      onRelease: () => { if (mode === "map") invoke("down-release", handlerSets.map.moveDown, false); },
    }),
    attack: createControlButton({
      label: "技",
      kind: "attack",
      onPress: () => {
        if (mode === "battle") invoke("attack", handlerSets.battle.attack);
      },
      onRelease: () => {
        if (mode === "map") setTimeout(() => invoke("action", handlerSets.map.action), 0);
      },
    }),
    push: createControlButton({
      label: "PUSH",
      kind: "action",
      accent: 0x332348,
      onPress: () => {
        if (mode === "battle") invoke("push", handlerSets.battle.push);
      },
      onRelease: () => {
        if (mode === "map") setTimeout(() => invoke("menu", handlerSets.map.menu), 0);
      },
    }),
  };
  controls.addChild(...Object.values(buttons).map((button) => button.root));

  const mediaQuery = window.matchMedia(MOBILE_LANDSCAPE_QUERY);
  let requestedVisible = false;
  let enabled = false;
  let width = 1;
  let height = 1;

  function syncVisibility() {
    root.visible = requestedVisible && mediaQuery.matches;
    for (const button of Object.values(buttons)) button.setEnabled(root.visible && enabled);
    if (!root.visible) releaseAll();
  }

  function releaseAll() {
    for (const button of Object.values(buttons)) button.release();
  }

  function layout(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    root.hitArea = new Rectangle(0, 0, width, height);
    const railWidth = getMobileControlRailWidth(width);
    const directionSize = clamp(height * .105, 36, 44);
    const dpadStep = directionSize * .96;
    const bottomPadding = clamp(height * .045, 14, 22);
    const dpadX = railWidth / 2;
    const dpadY = height - bottomPadding - directionSize * 1.5;
    const dpadRadius = dpadStep + directionSize / 2;
    const dpadDeadZone = directionSize * .2;
    const actionX = width - railWidth / 2;
    const attackSize = clamp(height * .175, 60, 72);
    const pushSize = clamp(height * .12, 42, 50);

    const directionalHitArea = (buttonX, buttonY, points) => new Polygon(points.flatMap(([x, y]) => [
      dpadX + x - buttonX,
      dpadY + y - buttonY,
    ]));
    const leftX = dpadX - dpadStep;
    const rightX = dpadX + dpadStep;
    const upY = dpadY - dpadStep;
    const downY = dpadY + dpadStep;
    const leftHitArea = directionalHitArea(leftX, dpadY, [
      [-dpadDeadZone, -dpadDeadZone],
      [-dpadRadius, -dpadRadius],
      [-dpadRadius, dpadRadius],
      [-dpadDeadZone, dpadDeadZone],
    ]);
    const rightHitArea = directionalHitArea(rightX, dpadY, [
      [dpadDeadZone, -dpadDeadZone],
      [dpadRadius, -dpadRadius],
      [dpadRadius, dpadRadius],
      [dpadDeadZone, dpadDeadZone],
    ]);
    const upHitArea = directionalHitArea(dpadX, upY, [
      [-dpadRadius, -dpadRadius],
      [dpadRadius, -dpadRadius],
      [dpadDeadZone, -dpadDeadZone],
      [-dpadDeadZone, -dpadDeadZone],
    ]);
    const downHitArea = directionalHitArea(dpadX, downY, [
      [-dpadDeadZone, dpadDeadZone],
      [dpadDeadZone, dpadDeadZone],
      [dpadRadius, dpadRadius],
      [-dpadRadius, dpadRadius],
    ]);

    rails
      .clear()
      .rect(0, 0, railWidth, height)
      .fill({ color: 0x171027, alpha: .94 })
      .rect(width - railWidth, 0, railWidth, height)
      .fill({ color: 0x171027, alpha: .94 })
      .rect(railWidth - 1, 0, 1, height)
      .fill({ color: 0xffffff, alpha: .09 })
      .rect(width - railWidth, 0, 1, height)
      .fill({ color: 0xffffff, alpha: .09 })
      .roundRect(
        dpadX - directionSize * .48,
        dpadY - directionSize * .48,
        directionSize * .96,
        directionSize * .96,
        8,
      )
      .fill({ color: 0x4d3c69, alpha: .96 });

    buttons.left.layout(leftX, dpadY, directionSize, directionSize, leftHitArea);
    buttons.right.layout(rightX, dpadY, directionSize, directionSize, rightHitArea);
    buttons.up.layout(dpadX, upY, directionSize, directionSize, upHitArea);
    buttons.down.layout(dpadX, downY, directionSize, directionSize, downHitArea);
    buttons.attack.layout(actionX, height - bottomPadding - pushSize - attackSize * .76, attackSize);
    buttons.push.layout(actionX, height - bottomPadding - pushSize / 2, pushSize);
    syncVisibility();
  }

  const onMediaChange = () => {
    layout(width, height);
    syncVisibility();
  };
  const onBlur = () => releaseAll();
  const onVisibilityChange = () => { if (document.hidden) releaseAll(); };
  mediaQuery.addEventListener("change", onMediaChange);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return {
    root,
    layout,
    setHandlers(nextHandlers, targetMode = "battle") {
      Object.assign(handlerSets[targetMode], nextHandlers);
    },
    setMode(nextMode) {
      if (mode === nextMode) return;
      releaseAll();
      mode = nextMode;
      buttons.attack.setLabel(mode === "map" ? "決定" : "技");
      buttons.push.setLabel(mode === "map" ? "メニュー" : "PUSH");
      syncVisibility();
    },
    setState({ visible = requestedVisible, enabled: nextEnabled = enabled }) {
      requestedVisible = visible;
      enabled = nextEnabled;
      syncVisibility();
    },
    getDebugState() {
      return {
        visible: root.visible,
        requestedVisible,
        enabled,
        mode,
        mobileLandscape: mediaQuery.matches,
        lastInput,
        activeHandlers: Object.fromEntries(
          Object.entries(handlerSets[mode]).map(([name, handler]) => [name, typeof handler === "function"]),
        ),
      };
    },
    getPlayfield() {
      if (!mediaQuery.matches) return { x: 0, y: 0, width, height };
      const railWidth = getMobileControlRailWidth(width);
      return { x: railWidth, y: 0, width: Math.max(1, width - railWidth * 2), height };
    },
    destroy() {
      releaseAll();
      mediaQuery.removeEventListener("change", onMediaChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      root.destroy({ children: true });
    },
  };
}
