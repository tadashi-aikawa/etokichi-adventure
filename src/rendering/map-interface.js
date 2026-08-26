import { getTechniqueRank } from "../game/technique-rank.ts";
import { shouldMirrorDialoguePortrait } from "../game/dialogue-portrait.ts";

const STAT_LABELS = [
  ["life", "ライフ"],
  ["power", "ちから"],
  ["defense", "丈夫さ"],
  ["accuracy", "命中"],
  ["evasion", "回避"],
  ["intelligence", "かしこさ"],
];

const PARAMETER_MAX = 1000;
const RANGE_LABELS = ["近距離", "中距離", "遠距離", "超遠距離"];
const TECHNIQUE_RANGE_ORDER = [3, 2, 1, 0];
const TECHNIQUE_SLOT_COUNT = 4;

function renderStatRows(profile) {
  return STAT_LABELS.map(([key, label]) => {
    const value = profile.stats[key];
    const level = Math.max(0, Math.min(value / PARAMETER_MAX, 1)) * 100;
    return `<div style="--stat-level:${level}%"><dt>${label}</dt><dd data-map-stat="${key}">${value}</dd></div>`;
  }).join("");
}

function renderTechniqueRanks(technique) {
  const ranks = [
    ["ダメージ", getTechniqueRank("damage", technique.power)],
    ["命中", getTechniqueRank("accuracy", technique.accuracy)],
    ["Gダウン", getTechniqueRank("gutsDown", technique.gutsDamage)],
  ];
  return ranks
    .map(([label, rank]) => `<div><dt>${label}</dt><dd data-rank="${rank}">${rank}</dd></div>`)
    .join("");
}

function renderTechniqueCard(technique) {
  return `<article class="map-technique-card ${technique.attackStat}">
    <span class="map-technique-icon" aria-hidden="true"><svg viewBox="0 0 48 48">${technique.iconSvg}</svg></span>
    <strong title="${technique.name}">${technique.cardName ?? technique.name}</strong>
    <b class="map-technique-cost"><small>GUTS</small>${technique.cost}</b>
    <p>${technique.description}</p>
    <dl>${renderTechniqueRanks(technique)}</dl>
  </article>`;
}

function renderTechniqueMatrix(profile) {
  const techniquesByRange = new Map(
    TECHNIQUE_RANGE_ORDER.map((range) => [
      range,
      profile.techniques.filter((technique) => technique.range === range),
    ]),
  );

  return Array.from({ length: TECHNIQUE_SLOT_COUNT }, (_, slotIndex) => {
    const cells = TECHNIQUE_RANGE_ORDER.map((range) => {
      const technique = techniquesByRange.get(range)[slotIndex];
      return technique
        ? renderTechniqueCard(technique)
        : `<div class="map-technique-empty" aria-label="${RANGE_LABELS[range]}のスロット${slotIndex + 1}は空き">空きスロット</div>`;
    }).join("");
    return `<div class="map-technique-slot"><span>SLOT</span><b>${slotIndex + 1}</b></div>${cells}`;
  }).join("");
}

export function createMapInterface({
  arena,
  gameSession,
  gameController,
  playerProfile,
  portraitUrl,
  characterProfiles,
  onModeChange = () => {},
}) {
  const root = document.createElement("div");
  root.className = "map-interface";
  root.innerHTML = `
    <div class="map-interaction-prompt" hidden><kbd>E</kbd><span>話す</span></div>
    <div class="map-action-buttons" aria-label="マップメニュー">
      <button type="button" data-map-action="talk" disabled><span>●</span>話す</button>
      <button type="button" data-map-action="status"><span>✦</span>ステータス</button>
    </div>
    <section class="map-dialogue-panel" role="dialog" aria-modal="true" aria-labelledby="map-dialogue-speaker" hidden>
      <div class="map-dialogue-portrait" aria-hidden="true" hidden></div>
      <div class="map-dialogue-copy">
        <p id="map-dialogue-speaker" class="map-dialogue-speaker"></p>
        <p class="map-dialogue-text" aria-live="polite"></p>
        <div class="map-dialogue-choices"></div>
        <button class="map-dialogue-next" type="button">つぎへ <span>●</span></button>
      </div>
    </section>
    <section class="map-status-panel" role="dialog" aria-modal="true" aria-labelledby="map-status-title" hidden>
      <article class="map-status-card" data-character-id="${playerProfile.id}" data-status-view="abilities">
        <header>
          <div class="map-status-title"><p>PLAYER PROFILE</p><small>${playerProfile.subtitle}</small><h2 id="map-status-title">${playerProfile.name}</h2></div>
          <div class="map-status-tabs" role="tablist" aria-label="ステータス表示の切り替え">
            <button id="map-status-abilities-tab" type="button" role="tab" aria-selected="true" aria-controls="map-status-abilities" data-status-tab="abilities">能力</button>
            <button id="map-status-techniques-tab" type="button" role="tab" aria-selected="false" aria-controls="map-status-techniques" data-status-tab="techniques" tabindex="-1">技</button>
          </div>
          <button class="map-status-close" type="button" data-map-action="close-status" aria-label="ステータスを閉じる">×</button>
        </header>
        <div class="map-status-main">
          <img class="map-status-portrait" src="${portraitUrl}" alt="${playerProfile.name}" />
          <section id="map-status-abilities" class="map-status-view map-status-abilities" role="tabpanel" aria-labelledby="map-status-abilities-tab">
            <div class="map-status-profile">
              <p>${playerProfile.description}</p>
              <strong>${playerProfile.abilitiesLabel}</strong>
            </div>
            <dl class="map-status-stats">${renderStatRows(playerProfile)}</dl>
          </section>
          <section id="map-status-techniques" class="map-status-view map-status-techniques" role="tabpanel" aria-labelledby="map-status-techniques-tab" hidden>
            <div class="map-technique-axis" aria-label="技の間合い">
              <span class="map-technique-axis-title">遠い ←</span>
              ${TECHNIQUE_RANGE_ORDER.map((range) => `<div><small>RANGE ${range + 1}</small><strong>${RANGE_LABELS[range]}</strong></div>`).join("")}
            </div>
            <div class="map-technique-matrix" aria-label="横が間合い、縦がスロットの所持技配置">
              ${renderTechniqueMatrix(playerProfile)}
            </div>
          </section>
        </div>
        <footer><span><kbd>M</kbd> / メニューボタン</span><button type="button" data-map-action="close-status">マップへ戻る</button></footer>
      </article>
    </section>`;
  arena.append(root);

  const prompt = root.querySelector(".map-interaction-prompt");
  const promptText = prompt.querySelector("span");
  const talkButton = root.querySelector('[data-map-action="talk"]');
  const statusButton = root.querySelector('[data-map-action="status"]');
  const statusPanel = root.querySelector(".map-status-panel");
  const dialoguePanel = root.querySelector(".map-dialogue-panel");
  const dialoguePortrait = root.querySelector(".map-dialogue-portrait");
  const dialogueSpeaker = root.querySelector(".map-dialogue-speaker");
  const dialogueText = root.querySelector(".map-dialogue-text");
  const dialogueChoices = root.querySelector(".map-dialogue-choices");
  const dialogueNext = root.querySelector(".map-dialogue-next");
  const closeStatusButtons = [...root.querySelectorAll('[data-map-action="close-status"]')];
  const statusCard = root.querySelector(".map-status-card");
  const statusTabs = [...root.querySelectorAll('[role="tab"]')];
  const statusViews = [...root.querySelectorAll('[role="tabpanel"]')];
  const techniqueMatrix = root.querySelector(".map-technique-matrix");

  let nearbyNpc = null;
  let nearbyNpcKey = "initial";
  let presentation = null;
  let selectedChoiceIndex = 0;

  function isMapVisible() {
    return gameSession.getState().scene === "map";
  }

  function isBlocking() {
    return !dialoguePanel.hidden || !statusPanel.hidden || gameController.getMapSnapshot()?.inputLocked === true;
  }

  function updateNearbyNpc() {
    nearbyNpc = isMapVisible() && !isBlocking() ? gameController.findFacingActor() : null;
    const canTalk = Boolean(nearbyNpc);
    const nextKey = nearbyNpc?.entityId ?? "none";
    if (nearbyNpcKey === nextKey) return;
    nearbyNpcKey = nextKey;
    if (nearbyNpc) {
      promptText.textContent = `${characterProfiles[nearbyNpc.characterId]?.name ?? nearbyNpc.entityId}に話す`;
    }
    prompt.hidden = !canTalk;
    talkButton.disabled = !canTalk;
  }

  function openDialogue() {
    if (!nearbyNpc || isBlocking()) return;
    presentation = gameController.startActorEvent(nearbyNpc.entityId);
    if (!presentation) return;
    selectedChoiceIndex = 0;
    dialoguePanel.hidden = false;
    prompt.hidden = true;
    nearbyNpcKey = "blocked";
    onModeChange("dialogue");
    renderDialogue();
  }

  function renderDialogue() {
    if (!presentation) return;
    const speakerSide =
      presentation.speakerId && presentation.speakerId !== gameSession.getState().controlledCharacterId
        ? "other"
        : "self";
    dialoguePanel.dataset.speakerSide = speakerSide;
    renderDialoguePortrait(
      presentation.speakerId ? characterProfiles[presentation.speakerId] : null,
      presentation.speakerId,
      speakerSide,
    );
    dialogueSpeaker.textContent = presentation.speaker;
    dialogueText.textContent = presentation.text;
    dialogueChoices.replaceChildren();
    const choices = presentation.choices;
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
    dialogueNext.textContent = presentation.advanceLabel === "close" ? "会話を終える  ●" : "つぎへ  ●";
    (dialogueChoices.querySelector(".selected") ?? dialogueNext).focus({ preventScroll: true });
  }

  function advance() {
    if (!presentation) return;
    if (presentation.choices.length) {
      choose(presentation.choices[selectedChoiceIndex].id);
      return;
    }
    continueEvent();
  }

  function choose(choiceId) {
    if (presentation) continueEvent(choiceId);
  }

  function continueEvent(choiceId) {
    try {
      applyPresentation(gameController.advanceEvent(choiceId));
    } catch (error) {
      gameController.cancelEvent();
      finishDialogue();
      throw error;
    }
  }

  function applyPresentation(nextPresentation) {
    presentation = nextPresentation;
    if (!presentation) {
      finishDialogue();
      return;
    }
    selectedChoiceIndex = 0;
    renderDialogue();
  }

  function finishDialogue() {
    presentation = null;
    renderDialoguePortrait(null, null, null);
    delete dialoguePanel.dataset.speakerSide;
    dialoguePanel.hidden = true;
    updateNearbyNpc();
    onModeChange("map");
    talkButton.focus({ preventScroll: true });
  }

  function cancelDialogue() {
    gameController.cancelEvent();
    finishDialogue();
  }

  function renderDialoguePortrait(profile, speakerId, side) {
    if (!profile || !speakerId) {
      dialoguePortrait.hidden = true;
      dialoguePortrait.replaceChildren();
      delete dialoguePortrait.dataset.characterId;
      delete dialoguePortrait.dataset.side;
      delete dialoguePortrait.dataset.mirrored;
      return;
    }

    const mirrored = String(shouldMirrorDialoguePortrait(profile.baseFacing, side));

    if (
      dialoguePortrait.dataset.characterId === speakerId &&
      dialoguePortrait.dataset.side === side &&
      dialoguePortrait.dataset.mirrored === mirrored &&
      dialoguePortrait.firstElementChild
    ) {
      dialoguePortrait.hidden = false;
      return;
    }

    const image = new Image();
    image.src = profile.images.idle;
    image.alt = "";
    dialoguePortrait.replaceChildren(image);
    dialoguePortrait.dataset.characterId = speakerId;
    dialoguePortrait.dataset.side = side;
    dialoguePortrait.dataset.mirrored = mirrored;
    dialoguePortrait.hidden = false;
  }

  function openStatus() {
    if (!isMapVisible() || isBlocking()) return;
    gameController.openStatus();
    updatePlayerProfile(characterProfiles[gameSession.getState().controlledCharacterId]);
    selectStatusTab("abilities");
    statusPanel.hidden = false;
    prompt.hidden = true;
    nearbyNpcKey = "blocked";
    onModeChange("status");
    statusPanel.querySelector('[data-map-action="close-status"]').focus({ preventScroll: true });
  }

  function closeStatus() {
    gameController.closeStatus();
    statusPanel.hidden = true;
    updateNearbyNpc();
    onModeChange("map");
    statusButton.focus({ preventScroll: true });
  }

  function selectStatusTab(tabId, focus = false) {
    const selectedTab = statusTabs.find((tab) => tab.dataset.statusTab === tabId);
    if (!selectedTab) return;
    for (const tab of statusTabs) {
      const selected = tab === selectedTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const view of statusViews) view.hidden = view.id !== selectedTab.getAttribute("aria-controls");
    statusCard.dataset.statusView = tabId;
    if (focus) selectedTab.focus({ preventScroll: true });
  }

  function moveStatusTab(event) {
    const currentIndex = statusTabs.indexOf(event.target);
    if (currentIndex < 0) return false;
    let nextIndex;
    if (event.code === "ArrowLeft") nextIndex = (currentIndex - 1 + statusTabs.length) % statusTabs.length;
    else if (event.code === "ArrowRight") nextIndex = (currentIndex + 1) % statusTabs.length;
    else if (event.code === "Home") nextIndex = 0;
    else if (event.code === "End") nextIndex = statusTabs.length - 1;
    else return false;
    selectStatusTab(statusTabs[nextIndex].dataset.statusTab, true);
    return true;
  }

  function moveChoice(delta) {
    if (!presentation) return;
    const choices = presentation.choices;
    if (!choices.length) return;
    selectedChoiceIndex = (selectedChoiceIndex + delta + choices.length) % choices.length;
    renderDialogue();
  }

  function onKeyDown(event) {
    if (!isMapVisible()) return;
    if (isBlocking()) {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "Enter", "Space", "KeyE", "Escape", "KeyM"]
          .includes(event.code)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      if (!dialoguePanel.hidden) {
        if (event.code === "ArrowUp") moveChoice(-1);
        else if (event.code === "ArrowDown") moveChoice(1);
        else if (["Enter", "Space", "KeyE"].includes(event.code)) advance();
        else if (event.code === "Escape") cancelDialogue();
      } else {
        if (moveStatusTab(event)) return;
        if (["Escape", "KeyM"].includes(event.code)) closeStatus();
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
  statusTabs.forEach((tab) => tab.addEventListener("click", () => selectStatusTab(tab.dataset.statusTab)));
  window.addEventListener("keydown", onKeyDown, true);

  function updatePlayerProfile(profile) {
    if (!profile) return;
    const image = root.querySelector(".map-status-portrait");
    image.src = profile.images.idle;
    image.alt = profile.name;
    statusCard.dataset.characterId = profile.id;
    root.querySelector(".map-status-title small").textContent = profile.subtitle;
    root.querySelector("#map-status-title").textContent = profile.name;
    root.querySelector(".map-status-profile p").textContent = profile.description;
    root.querySelector(".map-status-profile strong").textContent = profile.abilitiesLabel;
    for (const [key] of STAT_LABELS) {
      const stat = root.querySelector(`[data-map-stat="${key}"]`);
      const value = profile.stats[key];
      stat.textContent = value;
      stat.parentElement.style.setProperty("--stat-level", `${Math.max(0, Math.min(value / PARAMETER_MAX, 1)) * 100}%`);
    }
    techniqueMatrix.innerHTML = renderTechniqueMatrix(profile);
  }

  return {
    isBlocking,
    updateNearbyNpc,
    openDialogue,
    openStatus,
    getDebugState() {
      return {
        mode: dialoguePanel.hidden ? (statusPanel.hidden ? "map" : "status") : "dialogue",
        nearbyNpc: nearbyNpc?.entityId ?? null,
        eventId: presentation?.eventId ?? null,
        eventNodeId: presentation?.nodeId ?? null,
      };
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown, true);
      root.remove();
    },
  };
}
