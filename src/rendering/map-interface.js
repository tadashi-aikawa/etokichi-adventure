import {
  advanceDialogue,
  findFacingNpc,
  getCharacterGreeting,
  getDialogueNode,
  getDialogueSpeakerId,
  selectDialogueChoice,
  startDialogue,
} from "../game/map-interaction.ts";
import { getTechniqueRank } from "../game/technique-rank.ts";

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
    ["ガッツダウン", getTechniqueRank("gutsDown", technique.gutsDamage)],
  ];
  return ranks
    .map(([label, rank]) => `<div><dt>${label}</dt><dd data-rank="${rank}">${rank}</dd></div>`)
    .join("");
}

function renderTechniques(profile) {
  return profile.techniques
    .map(
      (technique) => `<li>
        <div class="map-technique-heading">
          <span>${RANGE_LABELS[technique.range]}・${technique.attackStat === "power" ? "ちから" : "かしこさ"}</span>
          <strong>${technique.name}</strong>
          <b><small>GUTS</small>${technique.cost}</b>
        </div>
        <dl>${renderTechniqueRanks(technique)}</dl>
      </li>`,
    )
    .join("");
}

const CHARACTER_ACTIONS = [
  { id: "battle", label: "対戦する" },
  { id: "switch", label: "操作を変える" },
  { id: "cancel", label: "なんでもない" },
];

export function createMapInterface({
  arena,
  gameSession,
  playerProfile,
  portraitUrl,
  characterProfiles,
  getNpcMarkers,
  getNpcCharacterId,
  onDialogueOpen = () => {},
  onModeChange = () => {},
  onBattle = () => {},
  onSwitch = () => {},
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
      <article class="map-status-card" data-character-id="${playerProfile.id}">
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
            <div class="map-technique-guide"><strong>所持技</strong><span>性能値は8段階ランクで表示</span></div>
            <ul class="map-technique-list">${renderTechniques(playerProfile)}</ul>
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
  const techniqueList = root.querySelector(".map-technique-list");

  let nearbyNpc = null;
  let progress = null;
  let characterAction = null;
  let selectedChoiceIndex = 0;

  function isMapVisible() {
    return gameSession.getState().scene === "map";
  }

  function isBlocking() {
    return !dialoguePanel.hidden || !statusPanel.hidden;
  }

  function updateNearbyNpc() {
    nearbyNpc = isMapVisible() && !isBlocking()
      ? findFacingNpc(gameSession.getState().player, getNpcMarkers())
      : null;
    const canTalk = Boolean(nearbyNpc);
    if (nearbyNpc) {
      const characterId = getNpcCharacterId(nearbyNpc.name);
      promptText.textContent = `${characterProfiles[characterId]?.name ?? nearbyNpc.name}に話す`;
    }
    prompt.hidden = !canTalk;
    talkButton.disabled = !canTalk;
  }

  function openDialogue() {
    if (!nearbyNpc || isBlocking()) return;
    const characterId = getNpcCharacterId(nearbyNpc.name);
    if (characterId && characterProfiles[characterId]) {
      characterAction = { marker: nearbyNpc, characterId, stage: "greeting" };
      selectedChoiceIndex = 0;
      dialoguePanel.hidden = false;
      prompt.hidden = true;
      onModeChange("dialogue");
      onDialogueOpen(nearbyNpc);
      renderCharacterGreeting();
      return;
    }
    const dialogueId = nearbyNpc.properties.dialogueId;
    if (typeof dialogueId !== "string") return;
    progress = startDialogue(dialogueId, gameSession.getState().flags);
    if (!progress) return;
    selectedChoiceIndex = 0;
    dialoguePanel.hidden = false;
    prompt.hidden = true;
    onModeChange("dialogue");
    onDialogueOpen(nearbyNpc);
    renderDialogue();
  }

  function renderCharacterGreeting() {
    if (!characterAction) return;
    const profile = characterProfiles[characterAction.characterId];
    renderDialoguePortrait(profile, characterAction.characterId);
    dialogueSpeaker.textContent = profile.name;
    dialogueText.textContent = getCharacterGreeting(characterAction.characterId);
    dialogueChoices.replaceChildren();
    dialogueNext.hidden = false;
    dialogueNext.textContent = "つぎへ  ●";
    dialogueNext.focus({ preventScroll: true });
  }

  function renderCharacterActions() {
    if (!characterAction) return;
    const profile = characterProfiles[characterAction.characterId];
    renderDialoguePortrait(profile, characterAction.characterId);
    dialogueSpeaker.textContent = profile.name;
    dialogueText.textContent = `${profile.name}にどうする？`;
    dialogueChoices.replaceChildren();
    dialogueNext.hidden = true;
    CHARACTER_ACTIONS.forEach((action, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.characterAction = action.id;
      button.className = index === selectedChoiceIndex ? "selected" : "";
      button.innerHTML = `<span>${index + 1}</span>${action.label}`;
      button.addEventListener("click", () => chooseCharacterAction(action.id));
      dialogueChoices.append(button);
    });
    dialogueChoices.querySelector(".selected")?.focus({ preventScroll: true });
  }

  function renderDialogue() {
    if (!progress) return;
    const node = getDialogueNode(progress);
    const speakerId = getDialogueSpeakerId(node);
    renderDialoguePortrait(speakerId ? characterProfiles[speakerId] : null, speakerId);
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
    if (characterAction) {
      if (characterAction.stage === "greeting") {
        characterAction.stage = "actions";
        renderCharacterActions();
        return;
      }
      chooseCharacterAction(CHARACTER_ACTIONS[selectedChoiceIndex].id);
      return;
    }
    if (!progress) return;
    const node = getDialogueNode(progress);
    if (node.choices?.length) {
      choose(node.choices[selectedChoiceIndex].id);
      return;
    }
    applyTransition(advanceDialogue(progress));
  }

  function chooseCharacterAction(actionId) {
    if (!characterAction) return;
    const selection = characterAction;
    closeDialogue();
    if (actionId === "battle") onBattle(selection.marker, selection.characterId);
    else if (actionId === "switch") onSwitch(selection.marker, selection.characterId);
  }

  function choose(choiceId) {
    if (progress) applyTransition(selectDialogueChoice(progress, choiceId));
  }

  function closeDialogue() {
    progress = null;
    characterAction = null;
    renderDialoguePortrait(null, null);
    dialoguePanel.hidden = true;
    updateNearbyNpc();
    onModeChange("map");
    talkButton.focus({ preventScroll: true });
  }

  function renderDialoguePortrait(profile, speakerId) {
    if (!profile || !speakerId) {
      dialoguePortrait.hidden = true;
      dialoguePortrait.replaceChildren();
      delete dialoguePortrait.dataset.characterId;
      return;
    }

    if (dialoguePortrait.dataset.characterId === speakerId && dialoguePortrait.firstElementChild) {
      dialoguePortrait.hidden = false;
      return;
    }

    const image = new Image();
    image.src = profile.images.idle;
    image.alt = "";
    dialoguePortrait.replaceChildren(image);
    dialoguePortrait.dataset.characterId = speakerId;
    dialoguePortrait.hidden = false;
  }

  function openStatus() {
    if (!isMapVisible() || isBlocking()) return;
    updatePlayerProfile(characterProfiles[gameSession.getState().controlledCharacterId]);
    selectStatusTab("abilities");
    statusPanel.hidden = false;
    prompt.hidden = true;
    onModeChange("status");
    statusPanel.querySelector('[data-map-action="close-status"]').focus({ preventScroll: true });
  }

  function closeStatus() {
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
    if (characterAction) {
      if (characterAction.stage !== "actions") return;
      selectedChoiceIndex = (selectedChoiceIndex + delta + CHARACTER_ACTIONS.length) % CHARACTER_ACTIONS.length;
      renderCharacterActions();
      return;
    }
    if (!progress) return;
    const choices = getDialogueNode(progress).choices ?? [];
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
        else if (event.code === "Escape") closeDialogue();
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
    techniqueList.innerHTML = renderTechniques(profile);
  }

  return {
    isBlocking,
    updateNearbyNpc,
    openDialogue,
    openStatus,
    getDebugState() {
      return {
        mode: dialoguePanel.hidden ? (statusPanel.hidden ? "map" : "status") : "dialogue",
        nearbyNpc: nearbyNpc?.name ?? null,
        dialogueNodeId: progress?.nodeId ?? null,
        characterActionId: characterAction?.characterId ?? null,
        characterActionStage: characterAction?.stage ?? null,
      };
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown, true);
      root.remove();
    },
  };
}
