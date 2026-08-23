import {
  advanceDialogue,
  findFacingNpc,
  getDialogueNode,
  selectDialogueChoice,
  startDialogue,
} from "../game/map-interaction.ts";

const STAT_LABELS = [
  ["life", "ライフ"],
  ["power", "ちから"],
  ["defense", "丈夫さ"],
  ["accuracy", "命中"],
  ["evasion", "回避"],
  ["intelligence", "かしこさ"],
];

export function createMapInterface({ arena, gameSession, map, playerProfile, portraitUrl }) {
  const root = document.createElement("div");
  root.className = "map-interface";
  root.innerHTML = `
    <div class="map-interaction-prompt" hidden><kbd>E</kbd><span>広場のガイドに話す</span></div>
    <div class="map-action-buttons" aria-label="マップメニュー">
      <button type="button" data-map-action="talk" disabled><span>●</span>話す</button>
      <button type="button" data-map-action="status"><span>✦</span>ステータス</button>
    </div>
    <section class="map-dialogue-panel" role="dialog" aria-modal="true" aria-labelledby="map-dialogue-speaker" hidden>
      <div class="map-dialogue-copy">
        <p id="map-dialogue-speaker" class="map-dialogue-speaker"></p>
        <p class="map-dialogue-text" aria-live="polite"></p>
        <div class="map-dialogue-choices"></div>
        <button class="map-dialogue-next" type="button">つぎへ <span>●</span></button>
      </div>
    </section>
    <section class="map-status-panel" role="dialog" aria-modal="true" aria-labelledby="map-status-title" hidden>
      <article class="map-status-card">
        <header><p>PLAYER PROFILE</p><button type="button" data-map-action="close-status" aria-label="ステータスを閉じる">×</button></header>
        <div class="map-status-main">
          <div class="map-status-portrait"><img src="${portraitUrl}" alt="${playerProfile.name}" /></div>
          <div class="map-status-profile">
            <small>${playerProfile.subtitle}</small>
            <h2 id="map-status-title">${playerProfile.name}</h2>
            <p>星の力と多彩な技を操り、大冒険へ踏み出す主人公。</p>
            <strong>${playerProfile.abilitiesLabel}</strong>
          </div>
          <dl class="map-status-stats">
            ${STAT_LABELS.map(([key, label]) => `<div><dt>${label}</dt><dd>${playerProfile.stats[key]}</dd></div>`).join("")}
          </dl>
        </div>
        <footer><span><kbd>M</kbd> / メニューボタン</span><button type="button" data-map-action="close-status">マップへ戻る</button></footer>
      </article>
    </section>`;
  arena.append(root);

  const prompt = root.querySelector(".map-interaction-prompt");
  const talkButton = root.querySelector('[data-map-action="talk"]');
  const statusButton = root.querySelector('[data-map-action="status"]');
  const statusPanel = root.querySelector(".map-status-panel");
  const dialoguePanel = root.querySelector(".map-dialogue-panel");
  const dialogueSpeaker = root.querySelector(".map-dialogue-speaker");
  const dialogueText = root.querySelector(".map-dialogue-text");
  const dialogueChoices = root.querySelector(".map-dialogue-choices");
  const dialogueNext = root.querySelector(".map-dialogue-next");
  const closeStatusButtons = [...root.querySelectorAll('[data-map-action="close-status"]')];

  let nearbyNpc = null;
  let progress = null;
  let selectedChoiceIndex = 0;

  function isMapVisible() {
    return gameSession.getState().scene === "map";
  }

  function isBlocking() {
    return !dialoguePanel.hidden || !statusPanel.hidden;
  }

  function updateNearbyNpc() {
    nearbyNpc = isMapVisible() && !isBlocking() ? findFacingNpc(gameSession.getState().player, map.markers) : null;
    const canTalk = Boolean(nearbyNpc);
    prompt.hidden = !canTalk;
    talkButton.disabled = !canTalk;
  }

  function openDialogue() {
    if (!nearbyNpc || isBlocking()) return;
    const dialogueId = nearbyNpc.properties.dialogueId;
    if (typeof dialogueId !== "string") return;
    progress = startDialogue(dialogueId, gameSession.getState().flags);
    if (!progress) return;
    selectedChoiceIndex = 0;
    dialoguePanel.hidden = false;
    prompt.hidden = true;
    renderDialogue();
  }

  function renderDialogue() {
    if (!progress) return;
    const node = getDialogueNode(progress);
    dialogueSpeaker.textContent = node.speaker;
    dialogueText.textContent = node.text;
    dialogueChoices.replaceChildren();
    const choices = node.choices ?? [];
    dialogueNext.hidden = choices.length > 0;
    choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.choiceId = choice.id;
      button.className = index === selectedChoiceIndex ? "selected" : "";
      button.innerHTML = `<span>${index + 1}</span>${choice.label}`;
      button.addEventListener("click", () => choose(choice.id));
      dialogueChoices.append(button);
    });
    dialogueNext.textContent = node.nextNodeId ? "つぎへ  ●" : "会話を終える  ●";
    (dialogueChoices.querySelector(".selected") ?? dialogueNext).focus({ preventScroll: true });
  }

  function applyTransition(transition) {
    for (const [key, value] of Object.entries(transition.flagUpdates)) gameSession.setFlag(key, value);
    progress = transition.progress;
    if (!progress) {
      closeDialogue();
      return;
    }
    selectedChoiceIndex = 0;
    renderDialogue();
  }

  function advance() {
    if (!progress) return;
    const node = getDialogueNode(progress);
    if (node.choices?.length) {
      choose(node.choices[selectedChoiceIndex].id);
      return;
    }
    applyTransition(advanceDialogue(progress));
  }

  function choose(choiceId) {
    if (progress) applyTransition(selectDialogueChoice(progress, choiceId));
  }

  function closeDialogue() {
    progress = null;
    dialoguePanel.hidden = true;
    updateNearbyNpc();
    talkButton.focus({ preventScroll: true });
  }

  function openStatus() {
    if (!isMapVisible() || isBlocking()) return;
    statusPanel.hidden = false;
    prompt.hidden = true;
    statusPanel.querySelector('[data-map-action="close-status"]').focus({ preventScroll: true });
  }

  function closeStatus() {
    statusPanel.hidden = true;
    updateNearbyNpc();
    statusButton.focus({ preventScroll: true });
  }

  function moveChoice(delta) {
    if (!progress) return;
    const choices = getDialogueNode(progress).choices ?? [];
    if (!choices.length) return;
    selectedChoiceIndex = (selectedChoiceIndex + delta + choices.length) % choices.length;
    renderDialogue();
  }

  function onKeyDown(event) {
    if (!isMapVisible()) return;
    if (isBlocking()) {
      if (["ArrowUp", "ArrowDown", "Enter", "Space", "KeyE", "Escape", "KeyM"].includes(event.code)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      if (!dialoguePanel.hidden) {
        if (event.code === "ArrowUp") moveChoice(-1);
        else if (event.code === "ArrowDown") moveChoice(1);
        else if (["Enter", "Space", "KeyE"].includes(event.code)) advance();
        else if (event.code === "Escape") closeDialogue();
      } else if (["Escape", "KeyM"].includes(event.code)) {
        closeStatus();
      }
      return;
    }
    if (["Enter", "Space", "KeyE"].includes(event.code) && nearbyNpc) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openDialogue();
    } else if (["KeyM", "Tab"].includes(event.code)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openStatus();
    }
  }

  talkButton.addEventListener("click", openDialogue);
  statusButton.addEventListener("click", openStatus);
  dialogueNext.addEventListener("click", advance);
  closeStatusButtons.forEach((button) => button.addEventListener("click", closeStatus));
  window.addEventListener("keydown", onKeyDown, true);

  return {
    isBlocking,
    updateNearbyNpc,
    getDebugState() {
      return {
        mode: dialoguePanel.hidden ? (statusPanel.hidden ? "map" : "status") : "dialogue",
        nearbyNpc: nearbyNpc?.name ?? null,
        dialogueNodeId: progress?.nodeId ?? null,
      };
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown, true);
      root.remove();
    },
  };
}
