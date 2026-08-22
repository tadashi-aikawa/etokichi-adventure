import { Container, Graphics, Rectangle, Text } from "pixi.js";

const MOBILE_LANDSCAPE_QUERY = "(orientation: landscape) and (max-height: 500px)";

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

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
  root.cursor = "pointer";

  const activePointers = new Set();
  let enabled = false;
  let pressed = false;
  let width = 44;
  let height = 44;

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
    layout(x, y, nextWidth, nextHeight = nextWidth) {
      width = nextWidth;
      height = nextHeight;
      root.position.set(x, y);
      root.hitArea = new Rectangle(-width / 2, -height / 2, width, height);
      caption.style.fontSize = kind === "attack"
        ? clamp(width * .3, 18, 23)
        : kind === "direction" ? clamp(width * .34, 14, 18) : clamp(width * .19, 8, 11);
      draw();
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

  const handlers = {
    moveLeft: null,
    moveRight: null,
    cycleUp: null,
    cycleDown: null,
    attack: null,
    push: null,
  };
  const buttons = {
    left: createControlButton({
      label: "◀",
      onPress: () => handlers.moveLeft?.(true),
      onRelease: () => handlers.moveLeft?.(false),
    }),
    right: createControlButton({
      label: "▶",
      onPress: () => handlers.moveRight?.(true),
      onRelease: () => handlers.moveRight?.(false),
    }),
    up: createControlButton({ label: "▲", onPress: () => handlers.cycleUp?.() }),
    down: createControlButton({ label: "▼", onPress: () => handlers.cycleDown?.() }),
    attack: createControlButton({ label: "技", kind: "attack", onPress: () => handlers.attack?.() }),
    push: createControlButton({ label: "PUSH", kind: "action", accent: 0x332348, onPress: () => handlers.push?.() }),
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
    const railWidth = clamp(width * .135, 92, 132);
    const directionSize = clamp(height * .105, 36, 44);
    const dpadStep = directionSize * .78;
    const bottomPadding = clamp(height * .045, 14, 22);
    const dpadX = railWidth / 2;
    const dpadY = height - bottomPadding - directionSize * 1.5;
    const actionX = width - railWidth / 2;
    const attackSize = clamp(height * .175, 60, 72);
    const pushSize = clamp(height * .12, 42, 50);

    rails
      .clear()
      .rect(0, 0, railWidth, height)
      .fill({ color: 0x171027, alpha: .94 })
      .rect(width - railWidth, 0, railWidth, height)
      .fill({ color: 0x171027, alpha: .94 })
      .rect(railWidth - 1, 0, 1, height)
      .fill({ color: 0xffffff, alpha: .09 })
      .rect(width - railWidth, 0, 1, height)
      .fill({ color: 0xffffff, alpha: .09 });

    buttons.left.layout(dpadX - dpadStep, dpadY, directionSize);
    buttons.right.layout(dpadX + dpadStep, dpadY, directionSize);
    buttons.up.layout(dpadX, dpadY - dpadStep, directionSize);
    buttons.down.layout(dpadX, dpadY + dpadStep, directionSize);
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
    setHandlers(nextHandlers) {
      Object.assign(handlers, nextHandlers);
    },
    setState({ visible = requestedVisible, enabled: nextEnabled = enabled }) {
      requestedVisible = visible;
      enabled = nextEnabled;
      syncVisibility();
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
