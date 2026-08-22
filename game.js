import { getImageFacing, getPresentationScaleCompensation, getPresentationYOffsetRatio, getWalkFrame, shouldMirror } from "./src/game/actors.ts";
import { SUTEKICHI_COMET_WAVES } from "./src/game/animation-plan.ts";
import { createCharacterProfiles } from "./src/game/characters.ts";
import {
  applyCharmEvasionPenalty,
  applyGenkiGutsRegenMultiplier,
  applyGenkiMovementMultiplier,
  applyPetrificationGutsRegenMultiplier,
  applyPetrificationMovementMultiplier,
  applyPursuitGutsRegenMultiplier,
  applyPursuitMovementMultiplier,
  applyRestraintGutsRegenMultiplier,
  applyRestraintMovementMultiplier,
  canActivateBattleSpecialDuringKnockout,
  calculateBaseHitRate,
  calculateRecoverySuccessChance,
  CHARM_EFFECT,
  closeToMinimumRange,
  GENKI_EFFECT,
  getRangeForDistance,
  PLEASURE_EFFECT,
  PETRIFICATION_EFFECT,
  PURSUIT_EFFECT,
  reachedZoneLifeThreshold,
  RESTRAINT_EFFECT,
  shouldTriggerPleasure,
  shouldGuaranteeZone,
  ZONE_EFFECT,
} from "./src/game/combat.ts";

(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const mobileLandscapeMedia = window.matchMedia("(orientation: landscape) and (max-height: 500px)");

  const refs = {
    gameShell: $(".game-shell"),
    arena: $("#arena"),
    hero: $("#hero"),
    enemy: $("#enemy"),
    heroSprite: $("#hero-sprite"),
    enemySprite: $("#enemy-sprite"),
    heroLife: $("#hero-life"),
    enemyLife: $("#enemy-life"),
    heroHp: $("#hero-hp-text"),
    enemyHp: $("#enemy-hp-text"),
    heroSpecials: $("#hero-specials"),
    enemySpecials: $("#enemy-specials"),
    heroCombatStatus: $("#hero-combat-status"),
    enemyCombatStatus: $("#enemy-combat-status"),
    timer: $("#timer"),
    timerWrap: $(".timer-wrap"),
    gutsValue: $("#guts-value"),
    gutsBar: $("#guts-bar"),
    hitRate: $("#hit-rate"),
    enemyGutsValue: $("#enemy-guts-value"),
    enemyGutsBar: $("#enemy-guts-bar"),
    enemyHitRate: $("#enemy-hit-rate"),
    enemyTechniques: $$(".enemy-technique"),
    enemyTechniqueCycleButtons: $$('[data-enemy-tech-cycle]'),
    enemyTechniqueCycleDotGroups: $$(".enemy-technique-cycle-dots"),
    heroDistanceRuler: $("#hero-distance-ruler"),
    enemyDistanceRuler: $("#enemy-distance-ruler"),
    announcement: $("#announcement"),
    effects: $("#effects"),
    titleScreen: $("#title-screen"),
    opponentSelectScreen: $("#opponent-select-screen"),
    characterOptions: $$(".character-option"),
    battleMusicOptions: $$(".battle-music-option"),
    opponentConfirmButton: $("#opponent-confirm-button"),
    startScreen: $("#start-screen"),
    resultScreen: $("#result-screen"),
    techniques: $$(".technique"),
    techniqueCycleButtons: $$('[data-tech-cycle]'),
    techniqueCycleDotGroups: $$(".technique-cycle-dots"),
    startButton: $("#start-button"),
    retryButton: $("#retry-button"),
    attackButton: $("#attack-button"),
    pushButton: $("#push-button"),
    moveLeft: $("#move-left"),
    moveRight: $("#move-right"),
    prebattleHeroSprite: $("#prebattle-hero-sprite"),
    prebattleHeroName: $("#prebattle-hero-name"),
    prebattleHeroAbilities: $("#prebattle-hero-abilities"),
    prebattleEnemySprite: $("#prebattle-enemy-sprite"),
    prebattleEnemyName: $("#prebattle-enemy-name"),
    prebattleEnemyAbilities: $("#prebattle-enemy-abilities"),
    prebattleStatRows: $$("[data-fighter][data-stat]"),
    gameStartButton: $("#game-start-button"),
    enemyName: $("#enemy-name"),
    enemySubtitle: $("#enemy-subtitle"),
    heroName: $("#hero-name"),
    heroSubtitle: $("#hero-subtitle"),
    heroTechniquePanel: $("#hero-technique-panel"),
    enemyTechniquePanel: $("#enemy-technique-panel"),
    heroFocusedTechnique: $("#hero-focused-technique"),
    enemyFocusedTechnique: $("#enemy-focused-technique"),
  };
  const assetUrl = (source) => window.etokichiAssetUrl?.(source) ?? source;
  const actorImage = assetUrl;

  const CHARACTER_PROFILES = createCharacterProfiles(actorImage);
  let selectedHeroId = "etokichi";
  let selectedEnemyId = "kuroboshi";
  let selectedBattleMusicId = "ceremonial-colosseum";
  let activeHero = CHARACTER_PROFILES[selectedHeroId];
  let activeEnemy = CHARACTER_PROFILES[selectedEnemyId];
  let HERO_IMAGES = activeHero.images;
  let ENEMY_IMAGES = activeEnemy.images;
  let techniques = activeHero.techniques;
  let enemyTechniques = activeEnemy.techniques;

  const fighterStats = {
    hero: { ...activeHero.stats },
    enemy: { ...activeEnemy.stats },
  };
  const fighterAbilities = {
    hero: [...activeHero.abilities],
    enemy: [...activeEnemy.abilities],
  };
  const battleSpecialMeta = {
    power: { label: "底力", message: "追い込まれて真価を発揮！ 与えるダメージ2倍", shortEffect: "与えるダメージ ×2", effectDuration: 10000, animationDuration: 2000, cssClass: "status-power" },
    grit: { label: "根性", message: "50%の執念！ ライフ1で復活", shortEffect: "ライフ1で復活・発動済み", effectDuration: 0, animationDuration: 4000, cssClass: "" },
    ease: { label: "余裕", message: "5連続命中または連続回避から生まれる余裕！", shortEffect: "技消費↓・相手の命中↓・被ダメ×1.5", effectDuration: 8000, animationDuration: 2000, cssClass: "status-ease" },
    real: { label: "本気", message: "相手を追い詰め真の力を解放！", shortEffect: "攻防・G回復・移動↑", effectDuration: 8000, animationDuration: 2000, cssClass: "status-real" },
    jealousy: { label: "嫉妬", message: "50%の激情！ 相手の輝きが許せない", shortEffect: "攻撃・Gダメ↑ / 被ダメ↑", effectDuration: 8000, animationDuration: 2000, cssClass: "status-jealousy" },
    serenity: { label: "明鏡止水", message: "心を澄ませ、すべてを見切る！ 回避・命中・移動上昇", shortEffect: "回避99%・次の命中99%・移動×2", effectDuration: 10000, animationDuration: 2000, cssClass: "status-serenity" },
    awakening: { label: "覚醒", message: "死の淵から覚醒！ ライフ25%で復活し、試合終了まで超強化", shortEffect: "攻撃×2・回避×2・G回復×2", effectDuration: Number.POSITIVE_INFINITY, animationDuration: 2400, cssClass: "status-awakening" },
    etoile: { label: "星纏", message: "Etoileの光が次の一撃を包む！", shortEffect: "次の攻撃: ダメージ×1.4・命中+10・会心+20", effectDuration: 30000, animationDuration: 2000, cssClass: "status-etoile" },
    inspiration: { label: "ひらめき", message: "3つの間合いを観測して新発見！ 知力・命中・G回復上昇", shortEffect: "知力技×1.45・命中+15・G回復×1.4", effectDuration: 10000, animationDuration: 2200, cssClass: "status-inspiration" },
    genki: { label: "元気", message: "ぐっすり眠って元気いっぱい！", shortEffect: "G回復×1.35・移動×1.15", effectDuration: GENKI_EFFECT.duration, animationDuration: 1400, cssClass: "status-genki" },
    charm: { label: "魅了", message: "見惚れて行動不能！", shortEffect: "移動・攻撃不可 / 回避率×0.5", effectDuration: CHARM_EFFECT.duration, animationDuration: 0, cssClass: "status-charm" },
    zone: { label: "ゾーン", message: "極限の集中状態へ！", shortEffect: "命中・会心・G回復↑ / 消費G↑・回避↓", effectDuration: ZONE_EFFECT.duration, animationDuration: 1400, cssClass: "status-zone" },
    pursuit: { label: "追跡", message: "逃げる相手をじっと追い続ける！", shortEffect: "移動×1.45・命中+12・G回復×2.5", effectDuration: PURSUIT_EFFECT.duration, animationDuration: 1500, cssClass: "status-pursuit" },
    pleasure: { label: "快感", message: "3連続被弾でちょっと嬉しくなった！", shortEffect: "発動時G+30・被弾ごとG+15", effectDuration: PLEASURE_EFFECT.duration, animationDuration: 1500, cssClass: "status-pleasure" },
    restraint: { label: "拘束", message: "巨体に取り押さえられて動けない！", shortEffect: "移動・G回復 ×1/3", effectDuration: RESTRAINT_EFFECT.duration, animationDuration: 0, cssClass: "status-restraint" },
    petrified: { label: "石化", message: "魔眼に貫かれ石像と化した！", shortEffect: "行動・G回復停止 / 被命中100%", effectDuration: PETRIFICATION_EFFECT.duration, animationDuration: 0, cssClass: "status-petrified" },
  };
  const SPECIAL_ACTION_CLASSES = ["special-action", "special-action-power", "special-action-grit", "special-action-ease", "special-action-real", "special-action-jealousy", "special-action-serenity", "special-action-awakening", "special-action-etoile", "special-action-inspiration", "special-action-zone", "special-action-pursuit", "special-action-pleasure"];
  const SPECIAL_TRIGGER_CHANCES = { awakening: .25, grit: .5, jealousy: .5, easeSecondDodge: .5, easeThirdDodge: .75 };
  const keys = { left: false, right: false };
  let HERO_MAX_HP = fighterStats.hero.life;
  let ENEMY_MAX_HP = fighterStats.enemy.life;
  const STAGE_MIN_X = 10;
  const STAGE_MAX_X = 250;
  const MIN_FIGHTER_DISTANCE = 13;
  const MAX_TECHNIQUE_DISTANCE = 80;
  const PUSH_DISTANCE = 84;
  const MAX_PROJECTED_DISTANCE = 76;
  const INITIAL_FIGHTER_DISTANCE = 54;
  const OUT_OF_RANGE_RULER_SHARE = 12;
  const CLOSEUP_ZOOM_BONUS = .32;
  const STAGE_SCREEN_TRACKING_SPAN = 28;
  const CLOSEUP_SCREEN_TRACKING_BONUS = 16;
  const SCREEN_FIGHTER_MARGIN = 10;
  const PREBATTLE_FOCUS_DURATION = 2600;
  const PREBATTLE_COUNT_DURATION = 1900;
  const KO_FALL_DURATION = 650;
  const KO_AFTER_FALL_DELAY = 1000;
  const SPECIAL_REACTION_DELAY = 2000;
  const SPECIAL_POST_PAUSE = 1000;
  const RESULT_BUTTON_DELAY = 8100;
  const RESULT_EFFECT_CLEANUP_DELAY = 8300;
  const VICTORY_CLIMAX_DELAY = 2450;
  const DODGE_DURATION = 880;
  const DODGE_RETREAT_DISTANCE = 6;
  const PUSH_FOCUS_DURATION = 500;
  const PUSH_TRAVEL_DURATION = 1300;
  const PUSH_RECOIL_DISTANCE = 8;
  const PARAMETER_MAX = 999;
  const DEFAULT_GUTS_DAMAGE_VARIANCE = .2;
  const SIMULATION_FRAME_INTERVAL = 1000 / 60;
  const UI_FRAME_INTERVAL = 1000 / 30;
  const ENTRANCE_MUSIC_VOLUME = .25;
  const BATTLE_MUSIC_VOLUME = .22;
  const VICTORY_MUSIC_VOLUME = .18;
  const SOUND_EFFECT_VOLUME = 1.15;
  const BATTLE_MUSIC_TRACKS = {
    "ceremonial-colosseum": "assets/audio/ceremonial-colosseum.mp3",
    "ceremonial-colosseum-2": "assets/audio/ceremonial-colosseum-2.mp3",
    "the-unyielding-titan": "assets/audio/the-unyielding-titan.mp3",
  };
  const entranceMusic = new Audio(assetUrl("assets/audio/arena-overture-intro.mp3"));
  entranceMusic.loop = false;
  entranceMusic.preload = "auto";
  entranceMusic.volume = 0;
  const battleMusic = new Audio(assetUrl(BATTLE_MUSIC_TRACKS[selectedBattleMusicId]));
  battleMusic.loop = true;
  battleMusic.preload = "auto";
  battleMusic.volume = 0;
  const victoryMusic = new Audio(assetUrl("assets/audio/arena-crest-victory.mp3"));
  victoryMusic.loop = false;
  victoryMusic.preload = "auto";
  victoryMusic.volume = 0;
  let state;
  let gameLoopFrame = null;
  let lastAnimationFrame = 0;
  let simulationAccumulator = 0;
  let uiAccumulator = 0;
  let hiddenBattleAt = 0;
  let hiddenActiveSpecials = null;
  const projectionStyleCache = new Map();
  let audioContext = null;
  let effectsOutput = null;
  let prebattleIntroToken = 0;

  function freshState() {
    return {
      phase: "ready",
      heroHp: HERO_MAX_HP,
      enemyHp: ENEMY_MAX_HP,
      heroGuts: 50,
      enemyGuts: 50,
      heroX: 103,
      enemyX: 157,
      time: 60,
      heroBusyUntil: 0,
      enemyBusyUntil: 0,
      actionLockUntil: 0,
      actionActor: null,
      actionSpecialSnapshot: null,
      koPending: false,
      koResolutionToken: 0,
      heroActionToken: 0,
      enemyActionToken: 0,
      specialCameraToken: 0,
      aiThinkAt: 0,
      aiDirection: 0,
      aiIdleUntil: 0,
      aiAttackReadyAt: 0,
      aiAttackCooldownUntil: 0,
      walkFrame: { hero: 0, enemy: 0 },
      walkFrameAt: { hero: 0, enemy: 0 },
      heroTechniqueSelection: [0, 0, 0, 0],
      enemyTechniqueSelection: [0, 0, 0, 0],
      specials: {
        hero: freshSpecialState(),
        enemy: freshSpecialState(),
      },
      lastTick: performance.now(),
    };
  }

  function freshSpecialState() {
    return {
      activeUntil: {},
      pending: {},
      triggered: { power: false, grit: false, ease: false, real: false, jealousy: false, serenity: false, awakening: false, inspiration: false, zone: false, pursuit: false, pleasure: false },
      awakeningChecked: false,
      hitStreak: 0,
      dodgeStreak: 0,
      receivedHitStreak: 0,
      pursuitDuration: 0,
      observedRanges: new Set(),
      realExhausted: false,
      serenityReadySince: 0,
      zoneThresholdChecked: false,
    };
  }

  function syncSpriteAssetFacing(side, sprite, source) {
    const profile = side === "hero" ? activeHero : activeEnemy;
    const root = sprite.closest(".combatant, .monster-status");
    if (!profile || !root || !source) return;
    root.classList.toggle("asset-facing-reversed", getImageFacing(profile, source) !== profile.baseFacing);
  }

  function setSpriteSource(side, sprite, source) {
    if (!sprite || !source) return;
    syncSpriteAssetFacing(side, sprite, source);
    sprite.src = source;
  }

  function applyHeroProfile(heroId) {
    const profile = CHARACTER_PROFILES[heroId];
    if (!profile) return;
    selectedHeroId = heroId;
    activeHero = profile;
    HERO_IMAGES = profile.images;
    techniques = profile.techniques;
    fighterStats.hero = { ...profile.stats };
    fighterAbilities.hero = [...profile.abilities];
    HERO_MAX_HP = profile.stats.life;
    refs.arena.dataset.heroId = heroId;
    refs.hero.style.setProperty("--character-scale", String(profile.visualScale ?? 1));
    refs.hero.style.setProperty("--presentation-scale-compensation", String(getPresentationScaleCompensation(profile)));
    refs.hero.style.setProperty("--presentation-y-offset", `${getPresentationYOffsetRatio(profile) * 100}%`);
    refs.hero.style.setProperty("--presentation-y-offset-ratio", String(getPresentationYOffsetRatio(profile)));
    refs.heroName.textContent = profile.name;
    refs.heroSubtitle.textContent = profile.subtitle;
    refs.heroHp.textContent = profile.stats.life;
    if (state && ["title", "titleTransition", "opponentSelect", "intro", "ready"].includes(state.phase)) state.heroHp = profile.stats.life;
    setSpriteSource("hero", refs.heroSprite, profile.images.battleIdle ?? profile.images.idle);
    refs.heroSprite.alt = profile.name;
    refs.hero.classList.toggle("mirror-character", shouldMirror(profile, "hero"));
    refs.heroSpecials.setAttribute("aria-label", `${profile.name}の状態変化`);
    setSpriteSource("hero", refs.prebattleHeroSprite, profile.images.idle);
    refs.prebattleHeroSprite.alt = `ファイティングポーズを取る${profile.name}`;
    refs.prebattleHeroSprite.closest(".monster-status")?.classList.toggle("mirror-character", shouldMirror(profile, "hero"));
    refs.prebattleHeroName.textContent = profile.name;
    refs.prebattleHeroAbilities.textContent = profile.abilitiesLabel;
    refs.heroTechniquePanel.setAttribute("aria-label", `${profile.name}の距離別技`);
    refs.characterOptions.filter((option) => option.dataset.selectSide === "hero").forEach((option) => {
      const selected = option.dataset.characterId === heroId;
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-checked", String(selected));
    });
    configureTechniquePanel("hero", profile);
    if (state) state.heroTechniqueSelection = [0, 0, 0, 0];
    Object.values(profile.images).flat().forEach((src) => { const image = new Image(); image.src = src; });
    renderPrebattleStats(1);
  }

  function applyEnemyProfile(enemyId) {
    const profile = CHARACTER_PROFILES[enemyId];
    if (!profile) return;
    selectedEnemyId = enemyId;
    activeEnemy = profile;
    ENEMY_IMAGES = profile.images;
    enemyTechniques = profile.techniques;
    fighterStats.enemy = { ...profile.stats };
    fighterAbilities.enemy = [...profile.abilities];
    ENEMY_MAX_HP = profile.stats.life;
    refs.arena.dataset.enemyId = enemyId;
    refs.enemy.style.setProperty("--character-scale", String(profile.visualScale ?? 1));
    refs.enemy.style.setProperty("--presentation-scale-compensation", String(getPresentationScaleCompensation(profile)));
    refs.enemy.style.setProperty("--presentation-y-offset", `${getPresentationYOffsetRatio(profile) * 100}%`);
    refs.enemy.style.setProperty("--presentation-y-offset-ratio", String(getPresentationYOffsetRatio(profile)));
    refs.enemyName.textContent = profile.name;
    refs.enemySubtitle.textContent = profile.subtitle;
    refs.enemyHp.textContent = profile.stats.life;
    if (state && ["title", "titleTransition", "opponentSelect", "intro", "ready"].includes(state.phase)) state.enemyHp = profile.stats.life;
    setSpriteSource("enemy", refs.enemySprite, profile.images.idle);
    refs.enemySprite.alt = profile.name;
    refs.enemy.classList.toggle("mirror-character", shouldMirror(profile, "enemy"));
    refs.enemySpecials.setAttribute("aria-label", `${profile.name}の状態変化`);
    setSpriteSource("enemy", refs.prebattleEnemySprite, profile.images.idle);
    refs.prebattleEnemySprite.alt = `ファイティングポーズを取る${profile.name}`;
    refs.prebattleEnemySprite.closest(".monster-status")?.classList.toggle("mirror-character", shouldMirror(profile, "enemy"));
    refs.prebattleEnemyName.textContent = profile.name;
    refs.prebattleEnemyAbilities.textContent = profile.abilitiesLabel;
    refs.enemyTechniquePanel.setAttribute("aria-label", `${profile.name}の距離別技`);
    refs.characterOptions.filter((option) => option.dataset.selectSide === "enemy").forEach((option) => {
      const selected = option.dataset.characterId === enemyId;
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-checked", String(selected));
    });
    configureTechniquePanel("enemy", profile);
    if (state) state.enemyTechniqueSelection = [0, 0, 0, 0];
    Object.values(profile.images).flat().forEach((src) => { const image = new Image(); image.src = src; });
    renderPrebattleStats(1);
  }

  function applyBattleMusic(battleMusicId) {
    const source = BATTLE_MUSIC_TRACKS[battleMusicId];
    if (!source) return;
    selectedBattleMusicId = battleMusicId;
    battleMusic.src = assetUrl(source);
    battleMusic.load();
    refs.battleMusicOptions.forEach((option) => {
      const selected = option.dataset.battleMusicId === battleMusicId;
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-checked", String(selected));
    });
  }

  function configureTechniquePanel(side, profile) {
    const items = side === "hero" ? refs.techniques : refs.enemyTechniques;
    items.forEach((item) => {
      const itemRange = Number(side === "hero" ? item.dataset.range : item.dataset.enemyTech);
      const choices = profile.techniques.filter((technique) => technique.range === itemRange);
      const technique = choices[0];
      const stack = item.closest(".technique-stack");
      const cycle = side === "hero" ? stack.querySelector(".technique-cycle") : stack.querySelector(".enemy-technique-cycle");
      stack.hidden = false;
      stack.classList.toggle("empty-technique", !technique);
      item.setAttribute("aria-hidden", String(!technique));
      if (!technique) {
        stack.classList.remove("has-multiple");
        if (cycle) cycle.hidden = true;
        return;
      }
      item.querySelector(".technique-name").textContent = technique.name;
      const icon = item.querySelector(".technique-icon svg");
      icon.removeAttribute("fill");
      icon.innerHTML = technique.iconSvg;
      if (cycle) {
        cycle.hidden = choices.length < 2;
        stack.classList.toggle("has-multiple", choices.length > 1);
      }
    });
    const dotGroups = side === "hero" ? refs.techniqueCycleDotGroups : refs.enemyTechniqueCycleDotGroups;
    dotGroups.forEach((group) => {
      const range = Number(side === "hero" ? group.dataset.cycleRange : group.dataset.enemyCycleRange);
      const choices = profile.techniques.filter((technique) => technique.range === range);
      group.replaceChildren(...choices.map(() => document.createElement("i")));
      group.firstElementChild?.classList.add("active");
    });
  }

  function setup() {
    applyHeroProfile(selectedHeroId);
    applyEnemyProfile(selectedEnemyId);
    state = freshState();
    state.phase = "title";
    const characterSources = Object.values(CHARACTER_PROFILES).flatMap((profile) => Object.values(profile.images).flat());
    characterSources.forEach((src) => { const image = new Image(); image.src = src; });
    bindControls();
    updateUI();
  }

  function renderPrebattleStats(progress = 1) {
    refs.prebattleStatRows.forEach((row, index) => {
      const { fighter, stat } = row.dataset;
      const value = fighterStats[fighter][stat];
      const rowIndex = index % 6;
      const rowProgress = clamp(progress * 1.55 - rowIndex * .11, 0, 1);
      const easedProgress = 1 - (1 - rowProgress) ** 3;
      row.querySelector("dd").textContent = Math.round(value * easedProgress);
      row.style.setProperty("--stat-level", `${clamp(value / PARAMETER_MAX, 0, 1) * 100 * easedProgress}%`);
    });
  }

  function startPrebattleIntro() {
    const token = ++prebattleIntroToken;
    state.phase = "intro";
    refs.startScreen.classList.add("visible");
    refs.startButton.disabled = true;
    startEntranceMusic();
    setPrebattleIntroPhase("hero");
    playPrebattlePose("hero", PREBATTLE_FOCUS_DURATION, token);
    setTimeout(() => {
      if (token !== prebattleIntroToken || state.phase !== "intro") return;
      setPrebattleIntroPhase("enemy");
      playPrebattlePose("enemy", PREBATTLE_FOCUS_DURATION, token);
    }, PREBATTLE_FOCUS_DURATION);
    setTimeout(() => {
      if (token !== prebattleIntroToken || state.phase !== "intro") return;
      setPrebattleIntroPhase("versus");
      setSpriteSource("hero", refs.prebattleHeroSprite, HERO_IMAGES[activeHero.versusPoseKey]);
      setSpriteSource("enemy", refs.prebattleEnemySprite, ENEMY_IMAGES[activeEnemy.versusPoseKey]);
      animatePrebattleStats(token);
    }, PREBATTLE_FOCUS_DURATION * 2);
  }

  function setPrebattleIntroPhase(phase) {
    refs.startScreen.classList.remove("intro-focus", "intro-hero", "intro-enemy", "intro-versus", "intro-ready");
    if (phase === "hero" || phase === "enemy") refs.startScreen.classList.add("intro-focus", `intro-${phase}`);
    else refs.startScreen.classList.add("intro-versus");
  }

  function playPrebattlePose(side, duration, token) {
    const sprite = side === "hero" ? refs.prebattleHeroSprite : refs.prebattleEnemySprite;
    const profile = side === "hero" ? activeHero : activeEnemy;
    const images = side === "hero" ? HERO_IMAGES : ENEMY_IMAGES;
    const frames = profile.introPoseKeys.map((key) => images[key]);
    const startedAt = performance.now();
    const changeFrame = () => {
      if (token !== prebattleIntroToken || performance.now() - startedAt >= duration) return;
      const frameIndex = Math.floor((performance.now() - startedAt) / 430) % frames.length;
      setSpriteSource(side, sprite, frames[frameIndex]);
      setTimeout(changeFrame, 120);
    };
    changeFrame();
  }

  function animatePrebattleStats(token) {
    const startedAt = performance.now();
    renderPrebattleStats(0);
    const tick = (now) => {
      if (token !== prebattleIntroToken || state.phase !== "intro") return;
      const progress = clamp((now - startedAt) / PREBATTLE_COUNT_DURATION, 0, 1);
      renderPrebattleStats(progress);
      if (progress < 1) {
        requestAnimationFrame(tick);
        return;
      }
      state.phase = "ready";
      refs.startScreen.classList.add("intro-ready");
      refs.startButton.disabled = false;
    };
    requestAnimationFrame(tick);
  }

  function bindControls() {
    refs.gameStartButton.addEventListener("click", leaveTitleScreen);
    refs.characterOptions.forEach((option) => option.addEventListener("click", () => {
      if (option.dataset.selectSide === "hero") applyHeroProfile(option.dataset.characterId);
      else applyEnemyProfile(option.dataset.characterId);
    }));
    refs.battleMusicOptions.forEach((option) => option.addEventListener("click", () => {
      applyBattleMusic(option.dataset.battleMusicId);
    }));
    refs.opponentConfirmButton.addEventListener("click", confirmOpponentSelection);
    refs.startButton.addEventListener("click", startBattle);
    refs.retryButton.addEventListener("click", startBattle);
    refs.attackButton.addEventListener("click", useCurrentTechnique);
    refs.pushButton.addEventListener("click", pushEnemy);
    refs.techniques.forEach((button) => button.addEventListener("click", () => usePlayerTechnique(getSelectedTechnique(Number(button.dataset.range)))));
    refs.techniqueCycleButtons.forEach((button) => button.addEventListener("click", () => cycleTechniqueAtRange(Number(button.dataset.cycleRange), Number(button.dataset.techCycle))));
    refs.enemyTechniqueCycleButtons.forEach((button) => button.addEventListener("click", () => cycleEnemyTechniqueAtRange(Number(button.dataset.enemyCycleRange), Number(button.dataset.enemyTechCycle))));

    window.addEventListener("keydown", (event) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) event.preventDefault();
      if (event.repeat && !["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(event.code)) return;
      if (["ArrowLeft", "KeyA"].includes(event.code)) keys.left = true;
      if (["ArrowRight", "KeyD"].includes(event.code)) keys.right = true;
      if (event.code === "ArrowUp") cycleTechniqueAtRange(getRange(), -1);
      if (event.code === "ArrowDown") cycleTechniqueAtRange(getRange(), 1);
      if (event.code === "Space") useCurrentTechnique();
      if (["ShiftLeft", "ShiftRight", "KeyS"].includes(event.code)) pushEnemy();
      if (/^Digit[1-4]$/.test(event.code)) usePlayerTechnique(getSelectedTechnique(Number(event.code.at(-1)) - 1));
      if (event.code === "Enter" && state.phase === "title") leaveTitleScreen();
      else if (event.code === "Enter" && state.phase === "opponentSelect") confirmOpponentSelection();
      else if (event.code === "Enter" && ["ready", "result"].includes(state.phase)) startBattle();
    });
    window.addEventListener("keyup", (event) => {
      if (["ArrowLeft", "KeyA"].includes(event.code)) keys.left = false;
      if (["ArrowRight", "KeyD"].includes(event.code)) keys.right = false;
    });
    window.addEventListener("blur", () => { keys.left = false; keys.right = false; });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (state.phase === "battle") {
          hiddenBattleAt = performance.now();
          hiddenActiveSpecials = {
            hero: new Set(Object.keys(state.specials.hero.activeUntil)),
            enemy: new Set(Object.keys(state.specials.enemy.activeUntil)),
          };
        }
        stopGameLoop();
        return;
      }
      if (state.phase === "battle") {
        if (hiddenBattleAt) resumeSpecialDeadlinesAfterHidden(performance.now());
        startGameLoop();
      }
      hiddenBattleAt = 0;
      hiddenActiveSpecials = null;
    });

    bindHoldButton(refs.moveLeft, "left");
    bindHoldButton(refs.moveRight, "right");
    window.etokichiRenderer.setMobileControlHandlers({
      moveLeft: (active) => { keys.left = active; },
      moveRight: (active) => { keys.right = active; },
      cycleUp: () => {
        const range = getRange();
        if (range !== null) cycleTechniqueAtRange(range, -1);
      },
      cycleDown: () => {
        const range = getRange();
        if (range !== null) cycleTechniqueAtRange(range, 1);
      },
      attack: useCurrentTechnique,
      push: pushEnemy,
    });
  }

  function leaveTitleScreen() {
    if (state.phase !== "title") return;
    state.phase = "titleTransition";
    refs.gameStartButton.disabled = true;
    refs.titleScreen.classList.add("leaving");
    armEntranceMusic();
    setTimeout(() => {
      if (state.phase !== "titleTransition") return;
      refs.titleScreen.classList.remove("visible", "leaving");
      state.phase = "opponentSelect";
      refs.opponentSelectScreen.classList.add("visible");
    }, 620);
  }

  function confirmOpponentSelection() {
    if (state.phase !== "opponentSelect") return;
    refs.opponentSelectScreen.classList.remove("visible");
    startPrebattleIntro();
  }

  function bindHoldButton(button, direction) {
    const down = (event) => { event.preventDefault(); keys[direction] = true; button.classList.add("pressed"); };
    const up = () => { keys[direction] = false; button.classList.remove("pressed"); };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("pointerleave", up);
  }

  function startBattle() {
    if (["title", "titleTransition", "opponentSelect", "intro"].includes(state.phase)) return;
    stopGameLoop();
    hiddenBattleAt = 0;
    hiddenActiveSpecials = null;
    ++prebattleIntroToken;
    initAudio();
    stopEntranceMusic();
    stopVictoryMusic();
    armBattleMusic();
    state = freshState();
    state.phase = "countdown";
    refs.gameShell.classList.remove("prebattle");
    refs.startScreen.classList.remove("visible");
    refs.resultScreen.classList.remove("visible");
    refs.arena.classList.remove("battle-ending", "victory-climax", "victory-hero", "victory-enemy", "camera-hero", "camera-enemy", "camera-track-release", "camera-face-closeup", "camera-aster-evil-eye-closeup", "camera-aster-death-energy-closeup", "push-camera", "push-camera-hero", "push-camera-enemy");
    refs.arena.style.removeProperty("--victory-focus-x");
    refs.hero.className = "combatant hero";
    refs.enemy.className = "combatant enemy";
    refs.hero.classList.toggle("mirror-character", shouldMirror(activeHero, "hero"));
    refs.enemy.classList.toggle("mirror-character", shouldMirror(activeEnemy, "enemy"));
    setSpriteSource("hero", refs.heroSprite, HERO_IMAGES.idle);
    setSpriteSource("enemy", refs.enemySprite, ENEMY_IMAGES.idle);
    refs.enemySprite.style.removeProperty("filter");
    refs.effects.replaceChildren();
    updateUI();
    announce("READY");
    sound("ready");
    setTimeout(() => {
      if (state.phase !== "countdown") return;
      state.phase = "battle";
      transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.battleIdle ?? HERO_IMAGES.idle);
      const battleStartedAt = performance.now();
      state.lastTick = battleStartedAt;
      state.aiThinkAt = battleStartedAt + random(260, 780);
      state.aiAttackReadyAt = battleStartedAt + random(900, 2800);
      announce("FIGHT!");
      startMusic();
      sound("fight");
      updateUI();
      startGameLoop(battleStartedAt);
    }, 950);
  }

  function startGameLoop(now = performance.now()) {
    if (gameLoopFrame !== null || state.phase !== "battle" || document.hidden) return;
    lastAnimationFrame = now;
    simulationAccumulator = 0;
    uiAccumulator = 0;
    gameLoopFrame = requestAnimationFrame(loop);
  }

  function stopGameLoop() {
    if (gameLoopFrame !== null) cancelAnimationFrame(gameLoopFrame);
    gameLoopFrame = null;
    simulationAccumulator = 0;
    uiAccumulator = 0;
  }

  function loop(now) {
    gameLoopFrame = null;
    if (state.phase !== "battle") return;

    const elapsed = Math.min(now - lastAnimationFrame, 50);
    lastAnimationFrame = now;
    simulationAccumulator += elapsed;
    uiAccumulator += elapsed;

    while (simulationAccumulator >= SIMULATION_FRAME_INTERVAL && state.phase === "battle") {
      const simulationNow = now - simulationAccumulator + SIMULATION_FRAME_INTERVAL;
      updateBattle(simulationNow, SIMULATION_FRAME_INTERVAL / 1000);
      simulationAccumulator -= SIMULATION_FRAME_INTERVAL;
    }

    if (uiAccumulator >= UI_FRAME_INTERVAL || state.phase !== "battle") {
      updateUI();
      uiAccumulator %= UI_FRAME_INTERVAL;
    }

    if (state.phase === "battle") gameLoopFrame = requestAnimationFrame(loop);
  }

  function updateBattle(now, delta) {
    const actionLocked = now < state.actionLockUntil || state.koPending;
    if (actionLocked) shiftFiniteSpecialDeadlines(delta * 1000);
    updateSpecialTimers(now);
    state.time = Math.max(0, state.time - delta);
    checkZoneTrigger("hero");
    checkZoneTrigger("enemy");
    if (!state.koPending && (!actionLocked || state.actionActor !== "hero")) {
      state.heroGuts = Math.min(100, state.heroGuts + delta * fighterStats.hero.gutsRegen * getGutsRegenMultiplier("hero"));
    }
    if (!state.koPending && (!actionLocked || state.actionActor !== "enemy")) {
      state.enemyGuts = Math.min(100, state.enemyGuts + delta * fighterStats.enemy.gutsRegen * getGutsRegenMultiplier("enemy"));
    }
    checkSerenityTrigger("hero", now, actionLocked);
    checkSerenityTrigger("enemy", now, actionLocked);

    // 技の途中で0秒になっても演出と命中判定は完遂し、操作ロック解除後に判定する。
    if (state.time <= 0 && !actionLocked) {
      finishBattle("time");
      return;
    }

    const heroFree = now >= state.heroBusyUntil && now >= state.actionLockUntil && !isActionDisabled("hero");
    let heroDirection = 0;
    if (heroFree) heroDirection = Number(keys.right) - Number(keys.left);
    moveHero(heroDirection, delta);
    setMovementClass("hero", heroDirection);

    updateAI(now, delta);
    checkPursuitTrigger("hero", heroDirection, state.aiDirection, delta);
    checkPursuitTrigger("enemy", state.aiDirection, heroDirection, delta);

  }

  function moveHero(direction, delta) {
    if (direction === 0) return;
    const step = 15.5 * getMovementMultiplier("hero") * delta;
    if (direction < 0) {
      state.heroX = Math.max(STAGE_MIN_X, state.heroX - step);
      return;
    }

    const openDistance = Math.max(0, state.enemyX - state.heroX - MIN_FIGHTER_DISTANCE);
    const closingStep = Math.min(step, openDistance);
    state.heroX += closingStep;
    const sharedStep = Math.min(step - closingStep, STAGE_MAX_X - state.enemyX);
    state.heroX += sharedStep;
    state.enemyX += sharedStep;
  }

  function moveEnemy(direction, delta) {
    if (direction === 0) return;
    const step = 11.5 * getMovementMultiplier("enemy") * delta;
    if (direction > 0) {
      state.enemyX = Math.min(STAGE_MAX_X, state.enemyX + step);
      return;
    }

    const openDistance = Math.max(0, state.enemyX - state.heroX - MIN_FIGHTER_DISTANCE);
    const closingStep = Math.min(step, openDistance);
    state.enemyX -= closingStep;
    const sharedStep = Math.min(step - closingStep, state.heroX - STAGE_MIN_X);
    state.heroX -= sharedStep;
    state.enemyX -= sharedStep;
  }

  function updateAI(now, delta) {
    if (now < state.enemyBusyUntil || now < state.actionLockUntil || isActionDisabled("enemy")) {
      state.aiDirection = 0;
      setMovementClass("enemy", 0);
      return;
    }
    if (now < state.aiIdleUntil) {
      state.aiDirection = 0;
      setMovementClass("enemy", 0);
      return;
    }

    if (now >= state.aiThinkAt) {
      state.aiThinkAt = now + random(520, 1180);
      const range = getRange();
      if (range === null) {
        if (Math.random() < .24) {
          state.aiDirection = 0;
          state.aiIdleUntil = now + random(320, 980);
        } else {
          state.aiDirection = -1;
        }
      } else {
        const rangeTechniques = getEnemyTechniquesAtRange(range);
        const attackTechniques = rangeTechniques.filter((technique) => technique.kind !== "support");
        const affordableAttacks = attackTechniques.filter((technique) => state.enemyGuts >= getTechniqueCost(technique, "enemy"));
        const napTechnique = enemyTechniques.find((technique) => technique.healFull);
        const wantsNap = Boolean(napTechnique && state.enemyHp <= ENEMY_MAX_HP * .55);
        const canNap = wantsNap && range === napTechnique.range && state.enemyGuts >= getTechniqueCost(napTechnique, "enemy");
        const selfBuff = rangeTechniques.find((technique) => technique.animation === "etoileDrive");
        const canSelfBuff = Boolean(selfBuff && !isSpecialActive("enemy", "etoile") && state.enemyGuts >= getTechniqueCost(selfBuff, "enemy"));
        const attack = canNap && Math.random() < .68 ? napTechnique
          : canSelfBuff && Math.random() < .3 ? selfBuff
          : affordableAttacks[Math.floor(Math.random() * affordableAttacks.length)];
        const canAttack = Boolean(attack);
        const brave = state.enemyHp < ENEMY_MAX_HP * .48 || state.time < 12;
        const attackReady = now >= state.aiAttackReadyAt && now >= state.aiAttackCooldownUntil;
        const attackChance = brave ? .58 : .32;

        if (canAttack && attackReady && Math.random() < attackChance) {
          state.aiAttackCooldownUntil = now + random(1500, 3400);
          performEnemyTechnique(attack, now);
          state.aiDirection = 0;
          return;
        }

        const behaviorRoll = Math.random();
        if (range === 0 && behaviorRoll < .12) {
          enemyPush(now);
          state.aiDirection = 0;
          return;
        }

        if (behaviorRoll < (brave ? .31 : .46)) {
          state.aiDirection = 0;
          state.aiIdleUntil = now + random(brave ? 240 : 420, brave ? 780 : 1450);
          setMovementClass("enemy", 0);
          return;
        }

        const preferred = wantsNap ? napTechnique.range : state.enemyGuts > 52 ? (Math.random() < .48 ? 2 : 3) : (Math.random() < .65 ? 1 : 2);
        if (behaviorRoll > .84) state.aiDirection = Math.random() < .5 ? -1 : 1;
        else state.aiDirection = range < preferred ? 1 : range > preferred ? -1 : (Math.random() < .5 ? -1 : 1);
      }
    }

    if (state.aiDirection !== 0) {
      moveEnemy(state.aiDirection, delta);
      setMovementClass("enemy", state.aiDirection);
    } else {
      setMovementClass("enemy", 0);
    }
  }

  function setMovementClass(side, direction) {
    const isHero = side === "hero";
    const element = isHero ? refs.hero : refs.enemy;
    const sprite = isHero ? refs.heroSprite : refs.enemySprite;
    const profile = isHero ? activeHero : activeEnemy;
    if (element.classList.contains("attack-light") || element.classList.contains("casting") || element.classList.contains("hurt") || element.classList.contains("dodging") || element.classList.contains("special-action")) return;
    element.classList.toggle("moving-forward", direction === (isHero ? 1 : -1));
    element.classList.toggle("moving-back", direction === (isHero ? -1 : 1));
    if (direction === 0) {
      stopWalk(side);
      return;
    }
    if (!profile.images.walk?.length) {
      element.classList.remove("fighter-walking", "walk-reversed");
      return;
    }
    const now = performance.now();
    element.classList.add("fighter-walking");
    element.classList.remove("asset-facing-reversed");
    element.classList.toggle("walk-reversed", direction !== (isHero ? 1 : -1));
    if (now >= state.walkFrameAt[side]) {
      sprite.src = getWalkFrame(profile, state.walkFrame[side]);
      state.walkFrame[side] += 1;
      state.walkFrameAt[side] = now + 110;
    }
  }

  function stopWalk(side) {
    const element = side === "hero" ? refs.hero : refs.enemy;
    element.classList.remove("fighter-walking", "walk-reversed", "moving-forward", "moving-back");
    state.walkFrameAt[side] = 0;
  }

  function transitionTechniqueSprite(sprite, nextSource) {
    if (!sprite) return;
    const side = sprite === refs.heroSprite ? "hero" : "enemy";
    if (sprite.getAttribute("src") === nextSource) {
      syncSpriteAssetFacing(side, sprite, nextSource);
      return;
    }
    setSpriteSource(side, sprite, nextSource);
  }

  function getTechniquesAtRange(range) { return techniques.filter((technique) => technique.range === range); }

  function getEnemyTechniquesAtRange(range) { return enemyTechniques.filter((technique) => technique.range === range); }

  function getSelectedEnemyTechnique(range) {
    const choices = getEnemyTechniquesAtRange(range);
    if (!choices.length) return null;
    const selectedIndex = state.enemyTechniqueSelection[range] % choices.length;
    return choices[selectedIndex];
  }

  function getSelectedTechnique(range) {
    const choices = getTechniquesAtRange(range);
    if (!choices.length) return null;
    const selectedIndex = state.heroTechniqueSelection[range] % choices.length;
    return choices[selectedIndex];
  }

  function cycleTechniqueAtRange(range, direction) {
    const now = performance.now();
    if (state.phase !== "battle" || now < state.heroBusyUntil || now < state.actionLockUntil) return;
    const choices = getTechniquesAtRange(range);
    if (choices.length < 2) return;
    const current = state.heroTechniqueSelection[range];
    state.heroTechniqueSelection[range] = (current + direction + choices.length) % choices.length;
    sound("techSwitch");
    updateUI();
  }

  function cycleEnemyTechniqueAtRange(range, direction) {
    if (state.phase !== "battle") return;
    const choices = getEnemyTechniquesAtRange(range);
    if (choices.length < 2) return;
    const current = state.enemyTechniqueSelection[range];
    state.enemyTechniqueSelection[range] = (current + direction + choices.length) % choices.length;
    sound("techSwitch");
    updateUI();
  }

  function useCurrentTechnique() { usePlayerTechnique(getSelectedTechnique(getRange())); }

  function usePlayerTechnique(technique) {
    performTechnique("hero", technique, performance.now());
  }

  function performEnemyTechnique(technique, now) {
    performTechnique("enemy", technique, now);
  }

  function performTechnique(side, technique, now) {
    if (isActionDisabled(side)) {
      if (side === "hero") {
        popStatus(refs.hero, isPetrified(side) ? "石化中" : "魅了中");
        sound("deny");
      }
      return;
    }
    const profile = side === "hero" ? activeHero : activeEnemy;
    if (profile.id === "etokichi") performEtokichiTechnique(side, technique, now);
    else performProfileTechnique(side, technique, now);
  }

  function resolveRecoveryTechnique(side, technique, actionGuts) {
    try {
      const successChance = calculateRecoverySuccessChance(technique.successChance ?? 65, actionGuts);
      const success = Math.random() * 100 < successChance;
      const actor = side === "hero" ? refs.hero : refs.enemy;
      createSutekichiNapResult(success, side);
      if (!success) {
        popStatus(actor, "おひるね失敗");
        sound("sutekichiNapFail");
        return;
      }
      const lifeKey = side === "hero" ? "heroHp" : "enemyHp";
      const maximumLife = fighterStats[side].life;
      const recovered = Math.max(0, maximumLife - state[lifeKey]);
      state[lifeKey] = maximumLife;
      activateGenki(side);
      popStatus(actor, `全回復 +${Math.ceil(recovered)}`);
      sound("sutekichiNapSuccess");
    } finally {
      completeTechniqueResolution();
    }
  }

  function activateEtoileDriveForSide(side) {
    const meta = battleSpecialMeta.etoile;
    const actor = side === "hero" ? refs.hero : refs.enemy;
    state.specials[side].activeUntil.etoile = performance.now() + meta.effectDuration;
    actor.classList.add(meta.cssClass);
    state.actionLockUntil = Math.max(state.actionLockUntil, performance.now() + meta.animationDuration + SPECIAL_POST_PAUSE);
    startSpecialCamera(side, "etoile", meta.animationDuration);
    showBattleSpecialBanner(side, "etoile", meta);
    sound("etoileGlow");
  }

  function activateGenki(side) {
    const meta = battleSpecialMeta.genki;
    const actor = side === "hero" ? refs.hero : refs.enemy;
    const sprite = side === "hero" ? refs.heroSprite : refs.enemySprite;
    const images = side === "hero" ? HERO_IMAGES : ENEMY_IMAGES;
    state.specials[side].activeUntil.genki = performance.now() + meta.effectDuration;
    actor.classList.add(meta.cssClass);
    transitionTechniqueSprite(sprite, images.statusGenki ?? images.battleIdle ?? images.idle, 220);
    showBattleSpecialBanner(side, "genki", meta);
  }

  function performEtokichiTechnique(side, technique, now = performance.now()) {
    const isHero = side === "hero";
    const actor = isHero ? refs.hero : refs.enemy;
    const target = isHero ? refs.enemy : refs.hero;
    const actorSprite = isHero ? refs.heroSprite : refs.enemySprite;
    const images = isHero ? HERO_IMAGES : ENEMY_IMAGES;
    const gutsKey = isHero ? "heroGuts" : "enemyGuts";
    const busyKey = isHero ? "heroBusyUntil" : "enemyBusyUntil";
    const tokenKey = isHero ? "heroActionToken" : "enemyActionToken";
    if (state.phase !== "battle" || now < state[busyKey] || now < state.actionLockUntil) return;
    const range = getRange();
    if (!technique || technique.range !== range) {
      popStatus(actor, "間合い外");
      sound("deny");
      return;
    }
    const actionCost = getTechniqueCost(technique, side);
    if (state[gutsKey] < actionCost) {
      popStatus(actor, "ガッツ不足");
      sound("deny");
      return;
    }
    if (technique.animation === "etoileDrive") {
      performEtoileDrive(side, technique, now, actionCost);
      return;
    }

    const actionGuts = state[gutsKey];
    const serenityAttack = isSpecialActive(side, "serenity");
    const impactDelay = technique.impactDelay ?? (technique.kind === "special" ? 3150 : technique.kind === "shot" ? 390 : 250);
    beginTechniqueResolution(side, serenityAttack);
    stopWalk(side);
    state[gutsKey] -= actionCost;
    state[busyKey] = now + technique.duration;
    state.actionLockUntil = now + technique.duration;
    state.actionActor = side;
    startCamera(side, technique.duration, technique.cameraReleaseDelay, ["angelWink", "asterEvilEye"].includes(technique.animation));
    const token = ++state[tokenKey];
    const actionStartedAt = now;
    const isPentagramNova = technique.animation === "pentagramNova";
    let pentagramWillHit = null;
    let pentagramFinisherMotion = null;
    actor.classList.remove("moving-forward", "moving-back");
    if (isPentagramNova) actor.classList.add("pentagram-nova-sequence", "pentagram-nova-charge");
    else if (technique.kind === "special") actor.classList.add("casting");
    else if (technique.animation === "galaxyRay") actor.classList.add("galaxy-ray-sequence");
    else if (technique.animation === "throwKiss") actor.classList.add("throw-kiss-sequence");
    else if (technique.animation === "physicalPunch") actor.classList.add("physical-punch-sequence");
    else if (technique.animation === "physicalStarRing") actor.classList.add("star-ring-sequence");
    else actor.classList.add("attack-light");
    announceTechnique(technique.name, technique.kind === "special" || technique.kind === "super", !isHero);
    sound(isPentagramNova ? "novaCharge" : technique.kind === "special" ? "charge" : technique.animation === "galaxyRay" ? "rayCharge" : technique.animation === "throwKiss" ? "kissWindup" : technique.animation?.startsWith("physical") ? "physicalWindup" : "swing");

    if (isPentagramNova) {
      refs.arena.classList.add("pentagram-nova-mode");
      transitionTechniqueSprite(actorSprite, images.pentagramNovaWindup, 280);
      createPentagramNovaCharge(side);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        actor.classList.remove("pentagram-nova-charge");
        actor.classList.add("pentagram-nova-rush");
        transitionTechniqueSprite(actorSprite, images.pentagramNovaRush, 230);
        createPentagramNovaRush(side);
        sound("novaRush");
      }, 1120);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        const hitChance = serenityAttack ? 99 : calculateHitChance(technique, actionGuts, isHero);
        pentagramWillHit = Math.random() * 100 < hitChance;
        if (!pentagramWillHit) {
          actor.classList.add("pentagram-nova-miss");
          refs.arena.classList.add("pentagram-nova-missed");
          resolveHit(side, technique, actionGuts, serenityAttack, false);
          state[busyKey] = actionStartedAt + 3300;
          state.actionLockUntil = actionStartedAt + 3300;
          setTimeout(() => {
            if (token !== state[tokenKey]) return;
            actor.classList.remove("pentagram-nova-sequence", "pentagram-nova-rush", "pentagram-nova-miss");
            refs.arena.classList.remove("pentagram-nova-mode", "pentagram-nova-missed", isHero ? "camera-hero" : "camera-enemy", "camera-track-release");
            if (state.phase === "battle") transitionTechniqueSprite(actorSprite, images.battleIdle, 260);
          }, 1700);
          return;
        }
        actor.classList.add("pentagram-nova-combo");
        target.classList.add("nova-captured");
        createPentagramNovaCapture(side);
        startPentagramNovaCombo(side);
        sound("novaCapture");
      }, 1600);
      [2050, 2440, 2830, 3220, 3610].forEach((delay, index) => {
        setTimeout(() => {
          if (state.phase !== "battle" || token !== state[tokenKey] || pentagramWillHit !== true) return;
          createPentagramNovaStrike(side, index);
          sound("novaStrike");
        }, delay);
      });
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey] || pentagramWillHit !== true) return;
        actor.classList.remove("pentagram-nova-rush", "pentagram-nova-combo");
        actor.classList.add("pentagram-nova-finisher");
        transitionTechniqueSprite(actorSprite, images.pentagramNovaDive, 260);
        pentagramFinisherMotion = startPentagramNovaFinisherRise(side);
        createPentagramNovaUppercut(side, pentagramFinisherMotion);
        sound("novaRise");
      }, 4080);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey] || pentagramWillHit !== true) return;
        actor.classList.add("pentagram-nova-diving");
        pentagramFinisherMotion = startPentagramNovaFinisherDive(side, pentagramFinisherMotion);
        createPentagramNovaDive(side, pentagramFinisherMotion?.enemyGroundTarget);
        sound("novaDive");
      }, 4650);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey] || pentagramWillHit !== true) return;
        target.classList.remove("nova-captured");
        void target.offsetWidth;
        const outcome = resolveHit(side, technique, actionGuts, serenityAttack, true);
        createPentagramNovaImpact(side, Boolean(outcome?.critical));
      }, technique.impactDelay);
    } else if (technique.kind === "special") {
      actor.classList.add("ultimate-sequence");
      transitionTechniqueSprite(actorSprite, images.battleIdle);
      refs.arena.classList.add("special-mode");
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.galaxyCharge, 260);
        createGalaxyCharge(side);
        sound("chargePeak");
      }, 500);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.cast, 260);
      }, 1750);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createGalaxyFlash(side);
      }, 2700);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.galaxyRecoil, 240);
      }, 3500);
    } else if (technique.animation === "galaxyRay") {
      transitionTechniqueSprite(actorSprite, images.battleIdle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.galaxyCharge, 230);
        createGalaxyRayCharge(side);
      }, 260);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.galaxyRayCast, 240);
        actor.classList.add("galaxy-ray-aiming");
        sound("rayLock");
      }, 820);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createGalaxyRay(side);
        sound("rayFire");
      }, 1210);
      setTimeout(() => {
        if (token !== state[tokenKey]) return;
        actor.classList.add("galaxy-ray-recoil");
      }, 1900);
    } else if (technique.animation === "throwKiss") {
      transitionTechniqueSprite(actorSprite, images.battleIdle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.throwKissCast, 240);
      }, 300);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createKissCharge(side);
        sound("kissSparkle");
      }, 560);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createThrowingKiss(side);
        actor.classList.add("throw-kiss-release");
        sound("kissLaunch");
      }, 950);
      setTimeout(() => {
        if (token !== state[tokenKey]) return;
        actor.classList.add("throw-kiss-recovery");
      }, 2050);
      setTimeout(() => {
        if (token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.battleIdle, 240);
      }, 2320);
    } else if (technique.animation === "physicalPunch") {
      transitionTechniqueSprite(actorSprite, images.battleIdle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createPhysicalDust(side, "gold");
      }, 240);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.punchCast, 220);
      }, 500);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createPunchTrail(side);
        sound("punchRush");
      }, 820);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createPhysicalContact(side, "punch");
        sound("physicalContact");
      }, 1180);
    } else if (technique.animation === "physicalStarRing") {
      transitionTechniqueSprite(actorSprite, images.battleIdle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createPhysicalDust(side, "gold");
      }, 260);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.starRingCast, 230);
      }, 540);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createStarRingSweep(side);
        sound("ringWhip");
      }, 880);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createPhysicalContact(side, "ring");
        sound("physicalContact");
      }, 1560);
    }

    if (technique.kind === "shot" && !technique.animation) createProjectile(side);

    if (!isPentagramNova) {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        resolveHit(side, technique, actionGuts, serenityAttack);
      }, impactDelay);
    }

    setTimeout(() => {
      if (token !== state[tokenKey]) return;
      actor.classList.remove("attack-light", "casting", "ultimate-sequence", "galaxy-ray-sequence", "galaxy-ray-aiming", "galaxy-ray-recoil", "throw-kiss-sequence", "throw-kiss-release", "throw-kiss-recovery", "physical-punch-sequence", "star-ring-sequence", "pentagram-nova-sequence", "pentagram-nova-charge", "pentagram-nova-rush", "pentagram-nova-combo", "pentagram-nova-finisher", "pentagram-nova-diving", "pentagram-nova-miss");
      target.classList.remove("nova-captured");
      refs.arena.classList.remove("special-mode", "pentagram-nova-mode", "pentagram-nova-missed", "nova-hit-pulse", "impact-freeze");
      if (state.phase === "battle") transitionTechniqueSprite(actorSprite, images.battleIdle, 240);
    }, technique.duration);
  }

  function performEtoileDrive(side, technique, now, actionCost) {
    const isHero = side === "hero";
    const actor = isHero ? refs.hero : refs.enemy;
    const actorSprite = isHero ? refs.heroSprite : refs.enemySprite;
    const images = isHero ? HERO_IMAGES : ENEMY_IMAGES;
    const gutsKey = isHero ? "heroGuts" : "enemyGuts";
    const busyKey = isHero ? "heroBusyUntil" : "enemyBusyUntil";
    const tokenKey = isHero ? "heroActionToken" : "enemyActionToken";
    if (isSpecialActive(side, "etoile")) {
      popStatus(actor, "星纏 発動中");
      sound("deny");
      return;
    }
    stopWalk(side);
    state[gutsKey] -= actionCost;
    state[busyKey] = now + technique.duration;
    state.actionLockUntil = now + technique.duration;
    state.actionActor = side;
    startCamera(side, technique.duration);
    const token = ++state[tokenKey];
    actor.classList.remove("moving-forward", "moving-back");
    actor.classList.add("etoile-drive-sequence");
    transitionTechniqueSprite(actorSprite, images.battleIdle);
    announceTechnique(technique.name, true, !isHero);
    createEtoileDriveEffect(side, technique.duration);
    sound("etoileDraw");

    setTimeout(() => {
      if (state.phase !== "battle" || token !== state[tokenKey]) return;
      transitionTechniqueSprite(actorSprite, images.etoileDriveCast, 250);
      sound("etoileRaise");
    }, 360);
    setTimeout(() => {
      if (state.phase !== "battle" || token !== state[tokenKey]) return;
      actor.classList.add("etoile-drive-peak");
      sound("etoileGlow");
    }, 2050);
    setTimeout(() => {
      if (state.phase !== "battle" || token !== state[tokenKey]) return;
      activateEtoileDriveForSide(side);
      actor.classList.remove("etoile-drive-sequence", "etoile-drive-peak");
      transitionTechniqueSprite(actorSprite, images.battleIdle, 260);
    }, technique.duration);
  }

  function performProfileTechnique(side, technique, now) {
    const isHero = side === "hero";
    const actor = isHero ? refs.hero : refs.enemy;
    const target = isHero ? refs.enemy : refs.hero;
    const actorSprite = isHero ? refs.heroSprite : refs.enemySprite;
    const images = isHero ? HERO_IMAGES : ENEMY_IMAGES;
    const gutsKey = isHero ? "heroGuts" : "enemyGuts";
    const busyKey = isHero ? "heroBusyUntil" : "enemyBusyUntil";
    const tokenKey = isHero ? "heroActionToken" : "enemyActionToken";
    const selectionKey = isHero ? "heroTechniqueSelection" : "enemyTechniqueSelection";
    if (!technique || state.phase !== "battle" || now < state[busyKey] || now < state.actionLockUntil) return;
    if (technique.range !== getRange()) {
      if (isHero) {
        popStatus(actor, "間合い外");
        sound("deny");
      }
      return;
    }
    const actionCost = getTechniqueCost(technique, side);
    if (state[gutsKey] < actionCost) {
      if (isHero) {
        popStatus(actor, "ガッツ不足");
        sound("deny");
      }
      return;
    }
    const actionGuts = state[gutsKey];
    const rangeChoices = (isHero ? techniques : enemyTechniques).filter((candidate) => candidate.range === technique.range);
    const selectedIndex = rangeChoices.indexOf(technique);
    if (selectedIndex >= 0) state[selectionKey][technique.range] = selectedIndex;
    const serenityAttack = technique.kind !== "support" && isSpecialActive(side, "serenity");
    const impactDelay = technique.impactDelay ?? (technique.kind === "shot" ? 420 : 270);
    let restraintHit;
    beginTechniqueResolution(side, serenityAttack);
    stopWalk(side);
    state[gutsKey] -= actionCost;
    state[busyKey] = now + technique.duration;
    state.actionLockUntil = now + technique.duration;
    state.actionActor = side;
    const asterCloseupMode = technique.animation === "asterEvilEye"
      ? "aster-evil-eye"
      : technique.animation === "asterDeathEnergy" ? "aster-death-energy" : false;
    startCamera(side, technique.duration, technique.cameraReleaseDelay, technique.animation === "angelWink" ? "face" : asterCloseupMode);
    const token = ++state[tokenKey];
    actor.classList.remove("moving-forward", "moving-back");
    const animationClasses = {
      darkOrbit: "dark-orbit-sequence",
      blackMeteor: "black-meteor-sequence",
      physicalMeteorClaw: "meteor-claw-sequence",
      physicalCrescentHorn: "crescent-horn-sequence",
      sutekichiStarTouch: "sutekichi-star-touch-sequence",
      sutekichiHaloSkip: "sutekichi-halo-skip-sequence",
      sutekichiStellaSearch: "sutekichi-stella-search-sequence",
      sutekichiDiscoveryComet: "sutekichi-comet-sequence",
      sutekichiNap: "sutekichi-nap-sequence",
      businessCardStrike: "business-card-strike-sequence",
      closingTimeDash: "closing-time-dash-sequence",
      angelWink: "angel-wink-sequence",
      approvalMeteor: "approval-meteor-sequence",
      tatsuoSlap: "tatsuo-slap-sequence",
      tatsuoRestraint: "tatsuo-restraint-sequence",
      tatsuoRoar: "tatsuo-roar-sequence",
      tatsuoPress: "tatsuo-press-sequence",
      asterDeathEnergy: "aster-death-energy-sequence",
      asterEvilEye: "aster-evil-eye-sequence",
      asterMigration: "aster-migration-sequence",
      asterTailSweep: "aster-tail-sweep-sequence",
    };
    actor.classList.add(animationClasses[technique.animation] ?? "attack-light");
    announceTechnique(technique.name, false, !isHero);
    const openingSounds = {
      darkOrbit: "orbitCharge",
      blackMeteor: "meteorSummon",
      physicalMeteorClaw: "physicalWindup",
      physicalCrescentHorn: "physicalWindup",
      sutekichiStarTouch: "sutekichiTouch",
      sutekichiHaloSkip: "sutekichiHalo",
      sutekichiStellaSearch: "sutekichiScan",
      sutekichiDiscoveryComet: "sutekichiCometCharge",
      sutekichiNap: "sutekichiNap",
      businessCardStrike: "businessCardDraw",
      closingTimeDash: "closingTimeDash",
      angelWink: "angelWink",
      approvalMeteor: "approvalMeteorCharge",
      tatsuoSlap: "tatsuoSlap",
      tatsuoRestraint: "physicalWindup",
      tatsuoRoar: "tatsuoRoarWindup",
      tatsuoPress: "tatsuoPressWindup",
      asterDeathEnergy: "asterDeathLaugh",
      asterEvilEye: "asterEvilEyeFocus",
      asterMigration: "asterMigrationCharge",
      asterTailSweep: "physicalWindup",
    };
    sound(openingSounds[technique.animation] ?? (technique.kind === "shot" ? "enemyShot" : "enemySwing"));
    if (technique.kind === "shot" && !technique.animation) createProjectile(side);

    if (technique.animation === "darkOrbit") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.darkOrbitCast, 240);
        createDarkOrbitField(side);
      }, 260);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createDarkOrbitVolley(side);
        sound("orbitLaunch");
      }, 1100);
      setTimeout(() => {
        if (token === state[tokenKey]) actor.classList.add("technique-recoil");
      }, 2200);
    } else if (technique.animation === "blackMeteor") {
      refs.arena.classList.add("black-meteor-mode");
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.blackMeteorCast, 250);
        createBlackMeteorSky(side);
      }, 300);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createBlackMeteor(side);
        sound("meteorFall");
      }, 1200);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createBlackMeteorImpact(side);
        sound("meteorCrash");
      }, 2820);
      setTimeout(() => {
        if (token === state[tokenKey]) actor.classList.add("technique-recoil");
      }, 3000);
    } else if (technique.animation === "physicalMeteorClaw") {
      transitionTechniqueSprite(actorSprite, images.idle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createPhysicalDust(side, "violet");
      }, 250);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.meteorClawCast, 220);
      }, 520);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createMeteorClawTrail(side);
        sound("clawRush");
      }, 850);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createPhysicalContact(side, "claw");
        sound("physicalContact");
      }, 1280);
    } else if (technique.animation === "physicalCrescentHorn") {
      transitionTechniqueSprite(actorSprite, images.idle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createPhysicalDust(side, "violet");
      }, 280);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.crescentHornCast, 230);
      }, 560);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createCrescentHornRush(side);
        sound("hornRush");
      }, 940);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createPhysicalContact(side, "horn");
        sound("physicalContact");
      }, 1710);
    } else if (technique.animation === "sutekichiStarTouch") {
      transitionTechniqueSprite(actorSprite, images.idle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.starTouchCast, 210);
        createSutekichiStarTouchEffect(side);
      }, 430);
    } else if (technique.animation === "sutekichiHaloSkip") {
      transitionTechniqueSprite(actorSprite, images.idle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.haloSkipCast, 220);
        createSutekichiHaloSkipEffect(side);
      }, 500);
    } else if (technique.animation === "sutekichiStellaSearch") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.stellaSearchCast, 240);
        createSutekichiStellaSearchEffect(side);
      }, 300);
    } else if (technique.animation === "sutekichiDiscoveryComet") {
      refs.arena.classList.add("sutekichi-comet-mode");
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.discoveryCometCast, 240);
        createSutekichiCometCharge(side);
      }, 300);
      SUTEKICHI_COMET_WAVES.forEach(({ launchDelay, impactDelay }, index) => {
        setTimeout(() => {
          if (state.phase !== "battle" || token !== state[tokenKey]) return;
          createSutekichiComet(side, index);
          sound("sutekichiCometFall");
        }, launchDelay);
        setTimeout(() => {
          if (state.phase !== "battle" || token !== state[tokenKey]) return;
          createSutekichiCometImpact(side, index);
          sound("sutekichiCometImpact");
        }, impactDelay);
      });
    } else if (technique.animation === "sutekichiNap") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.napCast, 260);
        createSutekichiNapDream(side);
      }, 260);
    } else if (technique.animation === "businessCardStrike") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.businessCardStrikeCast, 220);
        createBusinessCardStrike(side);
        sound("businessCardStrike");
      }, 420);
    } else if (technique.animation === "closingTimeDash") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.closingTimeDashCast, 110);
        createClosingTimeDash(side);
        sound("closingTimeRush");
      }, 120);
    } else if (technique.animation === "angelWink") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.angelWinkCast, 110);
      }, 180);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createAngelWink(side);
        sound("angelWinkLaunch");
      }, 420);
    } else if (technique.animation === "approvalMeteor") {
      refs.arena.classList.add("approval-meteor-mode");
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.approvalMeteorCast, 250);
        createApprovalMeteorCharge(side);
      }, 320);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createApprovalMeteor(side);
        sound("approvalMeteorFall");
      }, 1320);
    } else if (technique.animation === "tatsuoSlap") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.slapCast, 70);
        createTatsuoTechniqueEffect("tatsuoSlap", side);
      }, 100);
    } else if (technique.animation === "tatsuoRestraint") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.restraintRush);
        startFighterMotion(side, "tatsuoRestraint", { duration: 460 });
        createTatsuoTechniqueEffect("tatsuoRestraintRush", side);
        sound("tatsuoRestraintRush");
      }, 60);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        const hitChance = serenityAttack ? 99 : calculateHitChance(technique, actionGuts, isHero);
        restraintHit = Math.random() * 100 < hitChance;
        if (!restraintHit) {
          resolveHit(side, technique, actionGuts, serenityAttack, false);
          return;
        }
        transitionTechniqueSprite(actorSprite, images.restraintPin);
        target.classList.add("tatsuo-pinned");
        setTimeout(() => target.classList.remove("tatsuo-pinned"), 980);
      }, 520);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey] || !restraintHit) return;
        createTatsuoTechniqueEffect("tatsuoRestraint", side);
        sound("physicalContact");
      }, 820);
    } else if (technique.animation === "tatsuoRoar") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.roarCast, 220);
        createTatsuoTechniqueEffect("tatsuoRoar", side);
        sound("tatsuoRoar");
      }, 420);
    } else if (technique.animation === "tatsuoPress") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.pressCast, 240);
        startFighterMotion(side, "tatsuoPress", { duration: 1880 });
        createTatsuoTechniqueEffect("tatsuoPressRise", side);
        sound("tatsuoPressRise");
      }, 360);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createTatsuoTechniqueEffect("tatsuoPressDive", side);
        sound("tatsuoPressDive");
      }, 1660);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createTatsuoTechniqueEffect("tatsuoPressImpact", side);
        sound("tatsuoPressCrash");
      }, 2380);
    } else if (technique.animation === "asterTailSweep") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.tailSweepWindup, 120);
      }, 100);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.tailSweepCast, 90);
      }, 410);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.tailSweepStrike, 80);
        createAsterTechniqueEffect("asterTailSweep", side);
        sound("ringWhip");
      }, 720);
    } else if (technique.animation === "asterMigration") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.migrationCast, 220);
        createAsterTechniqueEffect("asterMigrationCharge", side);
      }, 220);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createAsterTechniqueEffect("asterMigration", side);
        sound("asterMigrationDrain");
      }, 1050);
    } else if (technique.animation === "asterEvilEye") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.evilEyeCast, 110);
      }, 100);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createAsterTechniqueEffect("asterEvilEyeCharge", side);
      }, 500);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        sound("asterEvilEyeGlow");
      }, 520);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        refs.arena.classList.add("aster-evil-eye-mode");
      }, 1120);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createAsterTechniqueEffect("asterEvilEye", side);
        sound("rayLock");
      }, 1250);
    } else if (technique.animation === "asterDeathEnergy") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        transitionTechniqueSprite(actorSprite, images.deathEnergyCast, 240);
        createAsterTechniqueEffect("asterDeathEnergyCharge", side);
      }, 260);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state[tokenKey]) return;
        createAsterTechniqueEffect("asterDeathEnergy", side);
        sound("asterDeathMist");
      }, 800);
    }

    setTimeout(() => {
      if (state.phase !== "battle" || token !== state[tokenKey]) return;
      if (technique.animation === "tatsuoRestraint") {
        if (restraintHit) resolveHit(side, technique, actionGuts, serenityAttack, true);
        return;
      }
      if (technique.animation === "sutekichiNap") resolveRecoveryTechnique(side, technique, actionGuts);
      else resolveHit(side, technique, actionGuts, serenityAttack);
    }, impactDelay);
    setTimeout(() => {
      if (token !== state[tokenKey]) return;
      actor.classList.remove("attack-light", "dark-orbit-sequence", "black-meteor-sequence", "meteor-claw-sequence", "crescent-horn-sequence", "sutekichi-star-touch-sequence", "sutekichi-halo-skip-sequence", "sutekichi-stella-search-sequence", "sutekichi-comet-sequence", "sutekichi-nap-sequence", "business-card-strike-sequence", "closing-time-dash-sequence", "angel-wink-sequence", "approval-meteor-sequence", "tatsuo-slap-sequence", "tatsuo-restraint-sequence", "tatsuo-roar-sequence", "tatsuo-press-sequence", "aster-death-energy-sequence", "aster-evil-eye-sequence", "aster-migration-sequence", "aster-tail-sweep-sequence", "technique-recoil");
      target.classList.remove("tatsuo-pinned");
      refs.arena.classList.remove("black-meteor-mode", "sutekichi-comet-mode", "approval-meteor-mode", "aster-evil-eye-mode");
      if (state.phase === "battle") transitionTechniqueSprite(actorSprite, images.battleIdle, 240);
    }, technique.duration);
  }

  function resolveHit(attacker, technique, actionGuts, serenityAttack = false, forcedHit = null) {
    try {
    const heroAttacks = attacker === "hero";
    const defender = heroAttacks ? "enemy" : "hero";
    const target = heroAttacks ? refs.enemy : refs.hero;
    recordOpponentObservation(defender, technique.range);
    const hitChance = serenityAttack ? 99 : calculateHitChance(technique, actionGuts, heroAttacks);
    const hit = forcedHit ?? (Math.random() * 100 < hitChance);

    if (!hit) {
      resetHitStreak(attacker);
      recordDodge(defender);
      resetReceivedHitStreak(defender);
      playDodge(target, defender);
      if (technique.closesDistance) applyTechniqueClosing(attacker);
      if (technique.animation === "throwKiss") createKissMissBreak(attacker);
      popStatus(target, "MISS");
      sound("miss");
      checkEaseTrigger(defender, "dodge");
      return { hit: false, critical: false, damage: 0, gutsDamage: 0 };
    }

    recordHit(attacker);
    recordReceivedHit(defender);
    resetDodgeStreak(defender);
    const pleasureWasActive = isSpecialActive(defender, "pleasure");
    const charmBrokenByHit = isCharmed(defender);
    if (charmBrokenByHit) {
      deactivateBattleSpecial(defender, "charm");
      createCharmBreak(defender);
    }

    const attackerStats = fighterStats[heroAttacks ? "hero" : "enemy"];
    const defenderStats = fighterStats[heroAttacks ? "enemy" : "hero"];
    const attackValue = attackerStats[technique.attackStat];
    const statScale = .8 + (attackValue / (attackValue + defenderStats.defense)) * .5;
    const variance = random(.9, 1.1);
    const lowLifeBoost = (heroAttacks ? state.heroHp : state.enemyHp) < 200 ? 1.14 : 1;
    let criticalChance = technique.critical + (isSpecialActive(attacker, "jealousy") ? 10 : 0);
    if (isSpecialActive(attacker, "awakening")) criticalChance = Math.min(99, criticalChance * 1.5);
    if (isSpecialActive(attacker, "zone")) criticalChance *= ZONE_EFFECT.criticalMultiplier;
    if (isSpecialActive(attacker, "etoile")) criticalChance += 20;
    criticalChance = Math.min(99, criticalChance);
    const critical = Math.random() * 100 < criticalChance;
    const criticalMultiplier = critical ? 1.5 : 1;
    const inspirationMultiplier = technique.attackStat === "intelligence" && isSpecialActive(attacker, "inspiration") ? 1.45 : 1;
    const damage = Math.round(technique.power * statScale * variance * lowLifeBoost * getDamageMultiplier(attacker, defender) * inspirationMultiplier * criticalMultiplier);
    const rolledGutsDamage = rollGutsDamage(technique, attacker, defender);
    const defenderLifeBefore = heroAttacks ? state.enemyHp : state.heroHp;
    let gutsDamage = 0;
    if (heroAttacks) {
      state.enemyHp = Math.max(0, state.enemyHp - damage);
      const gutsBefore = state.enemyGuts;
      state.enemyGuts = Math.max(0, state.enemyGuts - rolledGutsDamage);
      gutsDamage = Math.max(0, Math.round(gutsBefore - state.enemyGuts));
    } else {
      state.heroHp = Math.max(0, state.heroHp - damage);
      const gutsBefore = state.heroGuts;
      state.heroGuts = Math.max(0, state.heroGuts - rolledGutsDamage);
      gutsDamage = Math.max(0, Math.round(gutsBefore - state.heroGuts));
    }
    const actualLifeDamage = Math.max(0, Math.round(defenderLifeBefore - (heroAttacks ? state.enemyHp : state.heroHp)));
    if (technique.lifeDrainRatio || technique.gutsDrainRatio) {
      recoverTechniqueDrain(attacker, actualLifeDamage, gutsDamage, technique);
    }
    if (isSpecialActive(defender, "ease")) deactivateBattleSpecial(defender, "ease");
    if (pleasureWasActive) recoverPleasureGuts(defender, PLEASURE_EFFECT.hitGutsRecovery);

    showDamage(target, damage, heroAttacks, gutsDamage, critical, technique.kind === "super");
    if (technique.animation === "throwKiss") {
      createKissBurst(attacker);
      sound("kissHit");
    }
    createImpact(attacker, profileFor(attacker).id);
    if (technique.knockback) applyTechniqueKnockback(heroAttacks, technique.knockback, target);
    if (technique.closesDistance) applyTechniqueClosing(attacker);
    if (technique.kind === "special") {
      refs.arena.classList.add("impact-freeze");
      setTimeout(() => refs.arena.classList.remove("impact-freeze"), 520);
    } else if (technique.kind === "super") {
      refs.arena.classList.add("impact-freeze");
      setTimeout(() => refs.arena.classList.remove("impact-freeze"), critical ? 420 : 300);
    } else if (technique.animation?.startsWith("physical")) {
      const hitSideClass = heroAttacks ? "physical-hit-hero" : "physical-hit-enemy";
      refs.arena.classList.add("impact-freeze", hitSideClass);
      setTimeout(() => refs.arena.classList.remove("impact-freeze", hitSideClass), 210);
    }
    sound(critical ? "critical" : technique.kind === "super" ? "novaCrash" : technique.kind === "special" ? "bigHit" : "hit");
    target.classList.remove("hurt");
    void target.offsetWidth;
    target.classList.add("hurt");
    if (critical) target.classList.add("critical-hit");
    setTimeout(() => {
      target.classList.remove("hurt", "critical-hit");
    }, critical ? 780 : 490);

    if ((heroAttacks ? state.enemyHp : state.heroHp) <= 0) {
      scheduleKnockoutResolution(defender, attacker, target);
    } else {
      if (technique.charmChance && Math.random() < technique.charmChance) activateCharm(defender);
      if (technique.restraintDuration) activateRestraint(defender, technique.restraintDuration);
      if (technique.petrifyChance) {
        if (Math.random() < technique.petrifyChance) activatePetrification(defender, technique.petrifyDuration);
        else popStatus(target, "石化せず");
      }
      checkPleasureTrigger(defender);
      checkPostHitSpecials(attacker, defender);
    }
    return { hit: true, critical, damage, gutsDamage };
    } finally {
      completeTechniqueResolution();
    }
  }

  function recoverTechniqueDrain(side, lifeDamage, gutsDamage, technique) {
    const lifeKey = side === "hero" ? "heroHp" : "enemyHp";
    const gutsKey = side === "hero" ? "heroGuts" : "enemyGuts";
    const actor = side === "hero" ? refs.hero : refs.enemy;
    const lifeRecovery = Math.min(
      Math.round(lifeDamage * (technique.lifeDrainRatio ?? 0)),
      Math.max(0, fighterStats[side].life - state[lifeKey]),
    );
    const gutsRecovery = Math.min(
      Math.round(gutsDamage * (technique.gutsDrainRatio ?? 0)),
      Math.max(0, 100 - state[gutsKey]),
    );
    state[lifeKey] += lifeRecovery;
    state[gutsKey] += gutsRecovery;
    popStatus(actor, `吸収 / LIFE+${lifeRecovery} G+${gutsRecovery}`);
  }

  function pushEnemy() {
    const now = performance.now();
    if (state.phase !== "battle" || now < state.heroBusyUntil || now < state.actionLockUntil || isActionDisabled("hero")) return;
    if (getRange() !== 0) {
      popStatus(refs.hero, "接近時のみ");
      sound("deny");
      return;
    }
    stopWalk("hero");
    const totalDuration = PUSH_FOCUS_DURATION + PUSH_TRAVEL_DURATION;
    const battleState = state;
    state.heroBusyUntil = now + totalDuration;
    state.actionLockUntil = now + totalDuration;
    state.actionActor = "hero";
    startPushCamera("hero", totalDuration);
    refs.hero.classList.add("push-focus");
    refs.enemy.classList.add("push-threatened");
    sound("physicalWindup");
    setTimeout(() => {
      if (state !== battleState || state.phase !== "battle") return;
      createImpact(true);
      refs.hero.classList.remove("push-focus");
      refs.enemy.classList.remove("push-threatened");
      refs.hero.classList.add("push-travel", "push-recoil-right");
      refs.enemy.classList.add("push-travel", "blown-right");
      state.heroX = Math.max(STAGE_MIN_X, state.heroX - PUSH_RECOIL_DISTANCE);
      state.enemyX = Math.min(STAGE_MAX_X, state.enemyX + PUSH_DISTANCE);
      popStatus(refs.enemy, "PUSH!");
      sound("push");
    }, PUSH_FOCUS_DURATION);
    setTimeout(() => {
      refs.hero.classList.remove("push-focus", "push-travel", "push-recoil-right");
      refs.enemy.classList.remove("push-threatened", "push-travel", "blown-right");
    }, totalDuration);
  }

  function playDodge(target, defender) {
    const now = performance.now();
    state.actionLockUntil = Math.max(state.actionLockUntil, now + DODGE_DURATION);
    stopWalk(defender);
    if (defender === "hero") state.heroX = Math.max(STAGE_MIN_X, state.heroX - DODGE_RETREAT_DISTANCE);
    else state.enemyX = Math.min(STAGE_MAX_X, state.enemyX + DODGE_RETREAT_DISTANCE);
    target.classList.remove("dodging", "dodge-left", "dodge-right");
    void target.offsetWidth;
    const direction = defender === "hero" ? "dodge-left" : "dodge-right";
    target.classList.add("dodging", direction);
    setTimeout(() => {
      target.classList.remove("dodging", "dodge-left", "dodge-right");
    }, DODGE_DURATION);
  }

  function enemyPush(now) {
    if (getRange() !== 0 || isActionDisabled("enemy")) return;
    const totalDuration = PUSH_FOCUS_DURATION + PUSH_TRAVEL_DURATION;
    const battleState = state;
    state.enemyBusyUntil = now + totalDuration;
    state.actionLockUntil = now + totalDuration;
    state.actionActor = "enemy";
    startPushCamera("enemy", totalDuration);
    refs.enemy.classList.add("push-focus");
    refs.hero.classList.add("push-threatened");
    sound("physicalWindup");
    setTimeout(() => {
      if (state !== battleState || state.phase !== "battle") return;
      createImpact(false);
      refs.enemy.classList.remove("push-focus");
      refs.hero.classList.remove("push-threatened");
      refs.enemy.classList.add("push-travel", "push-recoil-left");
      refs.hero.classList.add("push-travel", "blown-left");
      state.enemyX = Math.min(STAGE_MAX_X, state.enemyX + PUSH_RECOIL_DISTANCE);
      state.heroX = Math.max(STAGE_MIN_X, state.heroX - PUSH_DISTANCE);
      popStatus(refs.hero, "PUSH!");
      sound("push");
    }, PUSH_FOCUS_DURATION);
    setTimeout(() => {
      refs.enemy.classList.remove("push-focus", "push-travel", "push-recoil-left");
      refs.hero.classList.remove("push-threatened", "push-travel", "blown-left");
    }, totalDuration);
  }

  function startPushCamera(side, duration) {
    refs.arena.classList.remove("camera-hero", "camera-enemy", "camera-track-release", "camera-face-closeup", "camera-aster-evil-eye-closeup", "camera-aster-death-energy-closeup", "push-camera", "push-camera-hero", "push-camera-enemy");
    refs.arena.style.setProperty("--push-camera-duration", `${duration}ms`);
    refs.arena.style.setProperty("--push-travel-duration", `${PUSH_TRAVEL_DURATION}ms`);
    void refs.arena.offsetWidth;
    refs.arena.classList.add("push-camera", `push-camera-${side}`);
    setTimeout(() => refs.arena.classList.remove("push-camera", "push-camera-hero", "push-camera-enemy"), duration);
  }

  function startCamera(side, duration, releaseDelay = null, closeupMode = false) {
    const cameraClass = side === "hero" ? "camera-hero" : "camera-enemy";
    const closeupClass = closeupMode ? `camera-${closeupMode === true ? "face" : closeupMode}-closeup` : null;
    refs.arena.classList.remove("camera-hero", "camera-enemy", "camera-track-release", "camera-face-closeup", "camera-aster-evil-eye-closeup", "camera-aster-death-energy-closeup");
    refs.arena.style.setProperty("--camera-duration", `${duration}ms`);
    if (Number.isFinite(releaseDelay)) refs.arena.style.setProperty("--camera-release-delay", `${releaseDelay}ms`);
    else refs.arena.style.removeProperty("--camera-release-delay");
    void refs.arena.offsetWidth;
    refs.arena.classList.add(cameraClass);
    if (Number.isFinite(releaseDelay)) refs.arena.classList.add("camera-track-release");
    if (closeupClass) refs.arena.classList.add(closeupClass);
    setTimeout(() => refs.arena.classList.remove(cameraClass, "camera-track-release", "camera-face-closeup", "camera-aster-evil-eye-closeup", "camera-aster-death-energy-closeup"), duration);
  }

  function hasBattleSpecial(side, type) {
    return fighterAbilities[side].includes(type);
  }

  function checkSerenityTrigger(side, now, actionLocked) {
    const special = state.specials[side];
    if (!hasBattleSpecial(side, "serenity") || special.triggered.serenity || state.time <= 0) return;
    const guts = side === "hero" ? state.heroGuts : state.enemyGuts;
    const busyUntil = side === "hero" ? state.heroBusyUntil : state.enemyBusyUntil;
    const standingStill = side === "hero" ? !keys.left && !keys.right : state.aiDirection === 0;
    if (guts < 100 || actionLocked || now < busyUntil || !standingStill) {
      special.serenityReadySince = 0;
      return;
    }
    if (!special.serenityReadySince) special.serenityReadySince = now;
    if (now - special.serenityReadySince >= 1500) triggerBattleSpecial(side, "serenity");
  }

  function isSpecialActive(side, type) {
    const special = state.specials[side];
    return performance.now() < (special.activeUntil[type] ?? 0) || isSpecialPinnedForResolution(side, type);
  }

  function isCharmed(side) {
    return isSpecialActive(side, "charm");
  }

  function isPetrified(side) {
    return isSpecialActive(side, "petrified");
  }

  function isActionDisabled(side) {
    return isCharmed(side) || isPetrified(side);
  }

  function activateRestraint(side, duration = RESTRAINT_EFFECT.duration) {
    const meta = battleSpecialMeta.restraint;
    const actor = side === "hero" ? refs.hero : refs.enemy;
    state.specials[side].activeUntil.restraint = performance.now() + duration;
    actor.classList.add(meta.cssClass);
    stopWalk(side);
    if (side === "hero") {
      keys.left = false;
      keys.right = false;
    } else {
      state.aiDirection = 0;
    }
    popStatus(actor, "拘束 8秒");
    sound("deny");
  }

  function activatePetrification(side, duration = PETRIFICATION_EFFECT.duration) {
    const meta = battleSpecialMeta.petrified;
    const actor = side === "hero" ? refs.hero : refs.enemy;
    state.specials[side].activeUntil.petrified = performance.now() + duration;
    actor.classList.add(meta.cssClass);
    stopWalk(side);
    if (side === "hero") {
      keys.left = false;
      keys.right = false;
    } else {
      state.aiDirection = 0;
    }
    createPetrificationStatus(side);
    popStatus(actor, "石化 8秒");
    sound("deny");
  }

  function checkPursuitTrigger(side, ownDirection, opponentDirection, delta) {
    const special = state.specials[side];
    if (!hasBattleSpecial(side, "pursuit") || special.triggered.pursuit || special.pending.pursuit) return;
    const forwardDirection = side === "hero" ? 1 : -1;
    const opponentRetreatDirection = side === "hero" ? 1 : -1;
    const isPursuing = ownDirection === forwardDirection
      && opponentDirection === opponentRetreatDirection
      && (getRange() ?? 0) >= 1;
    special.pursuitDuration = isPursuing ? special.pursuitDuration + delta * 1000 : 0;
    if (special.pursuitDuration >= PURSUIT_EFFECT.triggerDuration) triggerBattleSpecial(side, "pursuit");
  }

  function recordReceivedHit(side) {
    state.specials[side].receivedHitStreak += 1;
  }

  function resetReceivedHitStreak(side) {
    state.specials[side].receivedHitStreak = 0;
  }

  function recoverPleasureGuts(side, amount) {
    const gutsKey = side === "hero" ? "heroGuts" : "enemyGuts";
    const actor = side === "hero" ? refs.hero : refs.enemy;
    state[gutsKey] = Math.min(100, state[gutsKey] + amount);
    popStatus(actor, `快感 / G+${amount}`);
  }

  function checkPleasureTrigger(side) {
    const special = state.specials[side];
    if (!hasBattleSpecial(side, "pleasure") || special.triggered.pleasure || special.pending.pleasure) return;
    if (!shouldTriggerPleasure(special.receivedHitStreak)) return;
    special.receivedHitStreak = 0;
    scheduleBattleSpecial(side, "pleasure", 700);
  }

  function activateCharm(side) {
    const meta = battleSpecialMeta.charm;
    const actor = side === "hero" ? refs.hero : refs.enemy;
    state.specials[side].activeUntil.charm = performance.now() + meta.effectDuration;
    actor.classList.add(meta.cssClass);
    stopWalk(side);
    if (side === "hero") {
      keys.left = false;
      keys.right = false;
    } else {
      state.aiDirection = 0;
    }
    createCharmStatus(side);
    popStatus(actor, "魅了");
    sound("charmed");
  }

  function checkZoneTrigger(side) {
    const special = state.specials[side];
    if (state.koPending || !hasBattleSpecial(side, "zone") || special.triggered.zone) return;
    const opponent = side === "hero" ? "enemy" : "hero";
    const ownLife = side === "hero" ? state.heroHp : state.enemyHp;
    const opponentLife = side === "hero" ? state.enemyHp : state.heroHp;
    const ownLifeRatio = ownLife / fighterStats[side].life;
    const opponentLifeRatio = opponentLife / fighterStats[opponent].life;
    if (shouldGuaranteeZone(state.time, ownLifeRatio, opponentLifeRatio)) {
      activateZone(side);
      return;
    }
    if (special.zoneThresholdChecked || !reachedZoneLifeThreshold(opponentLifeRatio)) return;
    special.zoneThresholdChecked = true;
    if (Math.random() < ZONE_EFFECT.opponentLifeTriggerChance) activateZone(side);
  }

  function activateZone(side) {
    if (!triggerBattleSpecial(side, "zone")) return false;
    const actor = side === "hero" ? refs.hero : refs.enemy;
    const gutsKey = side === "hero" ? "heroGuts" : "enemyGuts";
    state[gutsKey] = Math.min(100, state[gutsKey] + ZONE_EFFECT.gutsRecovery);
    popStatus(actor, `ゾーン / G+${ZONE_EFFECT.gutsRecovery}`);
    sound("zone");
    return true;
  }

  function isSpecialPinnedForResolution(side, type) {
    return state.actionSpecialSnapshot?.active[side]?.includes(type) ?? false;
  }

  function beginTechniqueResolution(attacker, consumeSerenity) {
    const now = performance.now();
    const active = { hero: [], enemy: [] };
    for (const side of ["hero", "enemy"]) {
      for (const [type, activeUntil] of Object.entries(state.specials[side].activeUntil)) {
        if (!["charm", "zone", "restraint", "petrified"].includes(type) && Number.isFinite(activeUntil) && now < activeUntil) active[side].push(type);
      }
    }
    state.actionSpecialSnapshot = { attacker, consumeSerenity, active };
  }

  function completeTechniqueResolution() {
    const snapshot = state.actionSpecialSnapshot;
    if (!snapshot) return;
    state.actionSpecialSnapshot = null;
    if (snapshot.consumeSerenity) deactivateBattleSpecial(snapshot.attacker, "serenity");
    if (snapshot.active[snapshot.attacker].includes("etoile")) deactivateBattleSpecial(snapshot.attacker, "etoile");
    updateSpecialTimers(performance.now());
  }

  function triggerBattleSpecial(side, type) {
    const special = state.specials[side];
    const meta = battleSpecialMeta[type];
    if (
      !meta ||
      special.triggered[type] ||
      !canActivateBattleSpecialDuringKnockout(state.koPending, type)
    ) return false;
    const now = performance.now();
    const element = side === "hero" ? refs.hero : refs.enemy;
    special.triggered[type] = true;
    if (meta.effectDuration > 0) {
      special.activeUntil[type] = now + meta.effectDuration;
      if (meta.cssClass) element.classList.add(meta.cssClass);
    }
    if (type === "jealousy") {
      const gutsKey = side === "hero" ? "heroGuts" : "enemyGuts";
      state[gutsKey] = Math.min(100, state[gutsKey] + 15);
    }
    if (type === "pleasure") recoverPleasureGuts(side, PLEASURE_EFFECT.activationGutsRecovery);
    if (type === "grit") {
      element.classList.add("grit-rise");
      setTimeout(() => element.classList.remove("grit-rise"), meta.animationDuration);
    }
    if (type === "awakening") {
      element.classList.add("awakening-rise");
      setTimeout(() => element.classList.remove("awakening-rise"), meta.animationDuration);
    }
    state.actionLockUntil = Math.max(state.actionLockUntil, now + meta.animationDuration + SPECIAL_POST_PAUSE);
    startSpecialCamera(side, type, meta.animationDuration);
    showBattleSpecialBanner(side, type, meta);
    if (type === "awakening") sound("awakening");
    else if (type === "grit") sound("grit");
    scheduleJealousyReaction(side, type, meta.animationDuration);
    return true;
  }

  function scheduleBattleSpecial(side, type, delay = SPECIAL_REACTION_DELAY) {
    const special = state.specials[side];
    const meta = battleSpecialMeta[type];
    if (!meta || special.triggered[type] || special.pending[type]) return false;
    const battleState = state;
    special.pending[type] = true;
    state.actionLockUntil = Math.max(
      state.actionLockUntil,
      performance.now() + delay + meta.animationDuration + SPECIAL_POST_PAUSE,
    );
    setTimeout(() => {
      if (state !== battleState || state.phase !== "battle") return;
      delete special.pending[type];
      triggerBattleSpecial(side, type);
    }, delay);
    return true;
  }

  function scheduleJealousyReaction(sourceSide, sourceType, delay) {
    if (sourceType === "jealousy") return;
    const rival = sourceSide === "hero" ? "enemy" : "hero";
    const jealousy = state.specials[rival];
    if (!hasBattleSpecial(rival, "jealousy") || jealousy.triggered.jealousy || jealousy.pending.jealousy) return;
    if (Math.random() >= SPECIAL_TRIGGER_CHANCES.jealousy) return;
    const meta = battleSpecialMeta.jealousy;
    const reactionDelay = delay + SPECIAL_POST_PAUSE;
    const battleState = state;
    jealousy.pending.jealousy = true;
    state.actionLockUntil = Math.max(
      state.actionLockUntil,
      performance.now() + reactionDelay + meta.animationDuration + SPECIAL_POST_PAUSE,
    );
    setTimeout(() => {
      if (state !== battleState || state.phase !== "battle") return;
      delete jealousy.pending.jealousy;
      if (jealousy.triggered.jealousy) return;
      triggerBattleSpecial(rival, "jealousy");
    }, reactionDelay);
  }

  function startSpecialCamera(side, type, duration) {
    const token = ++state.specialCameraToken;
    const element = side === "hero" ? refs.hero : refs.enemy;
    const totalDuration = duration + SPECIAL_POST_PAUSE;
    refs.arena.classList.remove("camera-hero", "camera-enemy", "camera-track-release", "camera-face-closeup", "camera-aster-evil-eye-closeup", "camera-aster-death-energy-closeup", "status-camera", "status-camera-hero", "status-camera-enemy");
    refs.hero.classList.remove(...SPECIAL_ACTION_CLASSES);
    refs.enemy.classList.remove(...SPECIAL_ACTION_CLASSES);
    refs.arena.style.setProperty("--special-action-duration", `${duration}ms`);
    refs.arena.style.setProperty("--special-camera-duration", `${totalDuration}ms`);
    void refs.arena.offsetWidth;
    refs.arena.classList.add("status-camera", `status-camera-${side}`);
    element.classList.add("special-action", `special-action-${type}`);
    playSpecialSpriteAnimation(side, type, duration, token);
    setTimeout(() => {
      if (token !== state.specialCameraToken) return;
      element.classList.remove(...SPECIAL_ACTION_CLASSES);
    }, duration);
    setTimeout(() => {
      if (token !== state.specialCameraToken) return;
      refs.arena.classList.remove("status-camera", "status-camera-hero", "status-camera-enemy");
    }, totalDuration);
  }

  function getSpecialSpritePlan(side, type) {
    const profile = side === "hero" ? activeHero : activeEnemy;
    const images = side === "hero" ? HERO_IMAGES : ENEMY_IMAGES;
    const plans = profile.id === "etokichi" ? {
      power: { pose: images.galaxyCharge },
      grit: { opening: images.defeat, pose: images.cast, poseAt: .34 },
      ease: { pose: images.idle },
      serenity: { pose: images.statusSerenity },
      awakening: { opening: images.defeat, pose: images.galaxyCharge, poseAt: .34 },
      etoile: { pose: images.etoileDriveCast },
      real: { pose: images.cast },
      jealousy: { pose: images.punchCast },
    } : profile.id === "sutekichi" ? {
      ease: { pose: images.statusEase },
      inspiration: { pose: images.statusInspiration },
      genki: { pose: images.statusGenki },
      power: { pose: images.discoveryCometCast },
      grit: { opening: images.idle, pose: images.haloSkipCast, poseAt: .34 },
      real: { pose: images.discoveryCometCast },
      jealousy: { pose: images.starTouchCast },
      serenity: { pose: images.stellaSearchCast },
      awakening: { opening: images.idle, pose: images.discoveryCometCast, poseAt: .34 },
    } : profile.id === "salarymanEtokichi" ? {
      ease: { pose: images.angelWinkCast },
      inspiration: { pose: images.approvalMeteorCast },
      power: { pose: images.closingTimeDashCast },
      grit: { opening: images.defeat, pose: images.businessCardStrikeCast, poseAt: .34 },
      real: { pose: images.approvalMeteorCast },
      jealousy: { pose: images.businessCardStrikeCast },
      serenity: { pose: images.angelWinkCast },
      awakening: { opening: images.defeat, pose: images.approvalMeteorCast, poseAt: .34 },
      zone: { pose: images.approvalMeteorCast },
    } : profile.id === "tatsuo" ? {
      real: { pose: images.roarCast },
      pursuit: { pose: images.restraintCast },
      pleasure: { pose: images.statusPleasure },
    } : {
      power: { pose: images.blackMeteorCast },
      grit: { opening: images.idle, pose: images.crescentHornCast, poseAt: .34 },
      ease: { pose: images.statusEase },
      real: { pose: images.blackMeteorCast },
      jealousy: { pose: images.meteorClawCast },
      serenity: { pose: images.darkOrbitCast },
      awakening: { opening: images.idle, pose: images.blackMeteorCast, poseAt: .34 },
      inspiration: { pose: images.statusInspiration },
    };
    const restoreSource = images.battleIdle ?? images.idle;
    return plans[type] ?? { pose: restoreSource };
  }

  function playSpecialSpriteAnimation(side, type, duration, token) {
    const sprite = side === "hero" ? refs.heroSprite : refs.enemySprite;
    const images = side === "hero" ? HERO_IMAGES : ENEMY_IMAGES;
    const restoreSource = images.battleIdle ?? images.idle;
    const plan = getSpecialSpritePlan(side, type);
    transitionTechniqueSprite(sprite, plan.opening ?? plan.pose, 180);
    if (plan.opening && plan.pose !== plan.opening) {
      setTimeout(() => {
        if (token !== state.specialCameraToken || state.phase !== "battle") return;
        transitionTechniqueSprite(sprite, plan.pose, 260);
      }, duration * (plan.poseAt ?? .34));
    }
    setTimeout(() => {
      if (token !== state.specialCameraToken || state.phase !== "battle") return;
      transitionTechniqueSprite(sprite, restoreSource, 220);
    }, duration);
  }

  function showBattleSpecialBanner(side, type, meta) {
    const banner = document.createElement("div");
    banner.className = `battle-special-banner ${side === "hero" ? "is-hero" : "is-enemy"} special-${type}`;
    banner.style.setProperty("--special-animation", `${meta.animationDuration}ms`);
    const eyebrow = document.createElement("small");
    const title = document.createElement("strong");
    const message = document.createElement("span");
    eyebrow.textContent = "BATTLE SPECIAL";
    title.textContent = meta.label;
    message.textContent = meta.message;
    banner.append(eyebrow, title, message);
    refs.effects.append(banner);
    setTimeout(() => banner.remove(), meta.animationDuration + 80);
  }

  function deactivateBattleSpecial(side, type) {
    const special = state.specials[side];
    if (!special.activeUntil[type]) return;
    const element = side === "hero" ? refs.hero : refs.enemy;
    const meta = battleSpecialMeta[type];
    if (meta?.cssClass) element.classList.remove(meta.cssClass);
    delete special.activeUntil[type];
    if (type === "real") special.realExhausted = true;
    if (type === "petrified") createPetrificationBreak(side);
  }

  function updateSpecialTimers(now) {
    for (const side of ["hero", "enemy"]) {
      const special = state.specials[side];
      for (const [type, activeUntil] of Object.entries(special.activeUntil)) {
        if (now >= activeUntil && !isSpecialPinnedForResolution(side, type)) deactivateBattleSpecial(side, type);
      }
    }
  }

  function shiftFiniteSpecialDeadlines(milliseconds) {
    if (milliseconds <= 0) return;
    for (const side of ["hero", "enemy"]) {
      const activeUntil = state.specials[side].activeUntil;
      for (const [type, deadline] of Object.entries(activeUntil)) {
        if (!["charm", "zone", "restraint", "petrified"].includes(type) && Number.isFinite(deadline)) activeUntil[type] = deadline + milliseconds;
      }
    }
  }

  function resumeSpecialDeadlinesAfterHidden(now) {
    const hiddenDuration = now - hiddenBattleAt;
    for (const side of ["hero", "enemy"]) {
      const activeUntil = state.specials[side].activeUntil;
      for (const [type, deadline] of Object.entries(activeUntil)) {
        if (!Number.isFinite(deadline)) continue;
        if (hiddenActiveSpecials?.[side].has(type)) activeUntil[type] = deadline + hiddenDuration;
        else activeUntil[type] = now + (battleSpecialMeta[type]?.effectDuration ?? 0);
      }
    }
  }

  function tryGrit(side) {
    const lifeKey = side === "hero" ? "heroHp" : "enemyHp";
    if (state[lifeKey] > 0 || !hasBattleSpecial(side, "grit") || state.specials[side].triggered.grit) return false;
    if (Math.random() >= SPECIAL_TRIGGER_CHANCES.grit) return false;
    state[lifeKey] = 1;
    return true;
  }

  function tryAwakening(side) {
    const lifeKey = side === "hero" ? "heroHp" : "enemyHp";
    const special = state.specials[side];
    if (state[lifeKey] > 0 || !hasBattleSpecial(side, "awakening") || special.awakeningChecked) return false;
    special.awakeningChecked = true;
    if (Math.random() >= SPECIAL_TRIGGER_CHANCES.awakening) return false;
    state[lifeKey] = Math.ceil(fighterStats[side].life * .25);
    return true;
  }

  function scheduleKnockoutResolution(defender, attacker, target) {
    if (state.koPending) return;
    const delay = KO_FALL_DURATION + KO_AFTER_FALL_DELAY;
    const token = ++state.koResolutionToken;
    state.koPending = true;
    state.actionLockUntil = Math.max(state.actionLockUntil, performance.now() + delay);
    target.classList.remove("ko-pending");
    void target.offsetWidth;
    target.classList.add("ko-pending");
    setTimeout(() => {
      if (state.phase !== "battle" || token !== state.koResolutionToken) return;
      const awakeningActivated = tryAwakening(defender);
      const gritActivated = awakeningActivated ? false : tryGrit(defender);
      state.koPending = false;
      if (awakeningActivated || gritActivated) {
        target.classList.remove("ko-pending", "hurt", "critical-hit");
        void target.offsetWidth;
        triggerBattleSpecial(defender, awakeningActivated ? "awakening" : "grit");
        return;
      }
      finishBattle("ko", attacker);
    }, delay);
  }

  function checkPostHitSpecials(attacker, defender) {
    const defenderLife = defender === "hero" ? state.heroHp : state.enemyHp;
    if (hasBattleSpecial(defender, "power") && !state.specials[defender].triggered.power && !state.specials[defender].pending.power && defenderLife / fighterStats[defender].life <= .3) {
      scheduleBattleSpecial(defender, "power");
      return;
    }
    if (hasBattleSpecial(attacker, "real") && !state.specials[attacker].triggered.real && !state.specials[attacker].pending.real && defenderLife / fighterStats[defender].life <= .25) {
      scheduleBattleSpecial(attacker, "real");
      return;
    }
    checkEaseTrigger(attacker, "hit");
  }

  function recordHit(side) {
    state.specials[side].hitStreak += 1;
  }

  function resetHitStreak(side) {
    state.specials[side].hitStreak = 0;
  }

  function recordDodge(side) {
    state.specials[side].dodgeStreak += 1;
  }

  function resetDodgeStreak(side) {
    state.specials[side].dodgeStreak = 0;
  }

  function checkEaseTrigger(side, source) {
    const special = state.specials[side];
    if (!hasBattleSpecial(side, "ease") || special.triggered.ease || special.pending.ease) return;
    const fiveHitStreak = source === "hit" && special.hitStreak >= 5;
    const dodgeChance = source === "dodge" && special.dodgeStreak === 2
      ? SPECIAL_TRIGGER_CHANCES.easeSecondDodge
      : source === "dodge" && special.dodgeStreak >= 3 ? SPECIAL_TRIGGER_CHANCES.easeThirdDodge : 0;
    if (fiveHitStreak || (dodgeChance > 0 && Math.random() < dodgeChance)) {
      scheduleBattleSpecial(side, "ease");
      special.hitStreak = 0;
      special.dodgeStreak = 0;
    }
  }

  function recordOpponentObservation(side, range) {
    const special = state.specials[side];
    if (!hasBattleSpecial(side, "inspiration") || special.triggered.inspiration || special.pending.inspiration) return;
    special.observedRanges.add(range);
    if (special.observedRanges.size >= 3) scheduleBattleSpecial(side, "inspiration", 900);
  }

  function getTechniqueCost(technique, side) {
    const easeMultiplier = isSpecialActive(side, "ease") ? .65625 : 1;
    const zoneMultiplier = isSpecialActive(side, "zone") ? ZONE_EFFECT.techniqueCostMultiplier : 1;
    return Math.max(1, Math.round(technique.cost * easeMultiplier * zoneMultiplier));
  }

  function getDamageMultiplier(attacker, defender) {
    let multiplier = 1;
    if (isSpecialActive(attacker, "power")) multiplier *= 2;
    if (isSpecialActive(attacker, "real")) multiplier *= 1.5;
    if (isSpecialActive(attacker, "jealousy")) multiplier *= 1.35;
    if (isSpecialActive(attacker, "awakening")) multiplier *= 2;
    if (isSpecialActive(attacker, "etoile")) multiplier *= 1.4;
    if (state.specials[attacker].realExhausted) multiplier *= .5;
    if (isSpecialActive(defender, "real")) multiplier *= .65625;
    if (isSpecialActive(defender, "jealousy")) multiplier *= 1.2;
    if (isSpecialActive(defender, "ease")) multiplier *= 1.5;
    if (state.specials[defender].realExhausted) multiplier *= 2;
    return multiplier;
  }

  function getGutsDamageMultiplier(attacker, defender) {
    let multiplier = 1;
    if (isSpecialActive(attacker, "real")) multiplier *= 1.5;
    if (isSpecialActive(attacker, "jealousy")) multiplier *= 1.35;
    if (isSpecialActive(attacker, "awakening")) multiplier *= 1.5;
    if (state.specials[attacker].realExhausted) multiplier *= .5;
    if (isSpecialActive(defender, "real")) multiplier *= .65625;
    if (state.specials[defender].realExhausted) multiplier *= 2;
    return multiplier;
  }

  function rollGutsDamage(technique, attacker, defender) {
    if (!technique.gutsDamage) return 0;
    const variance = technique.gutsDamageVariance ?? DEFAULT_GUTS_DAMAGE_VARIANCE;
    const multiplier = getGutsDamageMultiplier(attacker, defender);
    return Math.max(1, Math.round(technique.gutsDamage * multiplier * random(1 - variance, 1 + variance)));
  }

  function getGutsRegenMultiplier(side) {
    let multiplier = 1;
    if (isSpecialActive(side, "real")) multiplier *= 1.524;
    if (state.specials[side].realExhausted) multiplier *= .5;
    if (isSpecialActive(side, "awakening")) multiplier *= 2;
    if (isSpecialActive(side, "inspiration")) multiplier *= 1.4;
    if (isSpecialActive(side, "zone")) multiplier *= ZONE_EFFECT.gutsRegenMultiplier;
    multiplier = applyGenkiGutsRegenMultiplier(multiplier, isSpecialActive(side, "genki"));
    multiplier = applyPursuitGutsRegenMultiplier(multiplier, isSpecialActive(side, "pursuit"));
    multiplier = applyRestraintGutsRegenMultiplier(multiplier, isSpecialActive(side, "restraint"));
    return applyPetrificationGutsRegenMultiplier(multiplier, isPetrified(side));
  }

  function getMovementMultiplier(side) {
    let multiplier = 1;
    if (isSpecialActive(side, "real")) multiplier *= 1.35;
    if (state.specials[side].realExhausted) multiplier *= .55;
    if (isSpecialActive(side, "serenity")) multiplier *= 2;
    multiplier = applyGenkiMovementMultiplier(multiplier, isSpecialActive(side, "genki"));
    multiplier = applyPursuitMovementMultiplier(multiplier, isSpecialActive(side, "pursuit"));
    multiplier = applyRestraintMovementMultiplier(multiplier, isSpecialActive(side, "restraint"));
    return applyPetrificationMovementMultiplier(multiplier, isPetrified(side));
  }

  function calculateHitChance(technique, guts, heroAttacks = true) {
    const attackerStats = fighterStats[heroAttacks ? "hero" : "enemy"];
    const defenderStats = fighterStats[heroAttacks ? "enemy" : "hero"];
    let hitRate = calculateBaseHitRate(technique.accuracy, guts, attackerStats.accuracy, defenderStats.evasion);
    const attacker = heroAttacks ? "hero" : "enemy";
    const defender = heroAttacks ? "enemy" : "hero";
    if (isPetrified(defender)) return PETRIFICATION_EFFECT.hitRate;
    if (isSpecialActive(defender, "serenity")) hitRate = 1;
    if (isSpecialActive(attacker, "serenity")) hitRate = 99;
    if (isSpecialActive(defender, "ease")) hitRate = (hitRate * hitRate) / 100;
    if (isSpecialActive(attacker, "awakening")) hitRate *= 1.5;
    if (isSpecialActive(defender, "awakening")) hitRate *= .5;
    if (isSpecialActive(attacker, "etoile")) hitRate += 10;
    if (isSpecialActive(attacker, "inspiration")) hitRate += 15;
    if (isSpecialActive(attacker, "zone")) hitRate *= ZONE_EFFECT.hitRateMultiplier;
    if (isSpecialActive(attacker, "pursuit")) hitRate += PURSUIT_EFFECT.hitRateBonus;
    hitRate = applyCharmEvasionPenalty(hitRate, isSpecialActive(defender, "zone"));
    hitRate = applyCharmEvasionPenalty(hitRate, isCharmed(defender));
    const minimumHitRate = isSpecialActive(defender, "awakening") ? 1 : 18;
    const maximumHitRate = isSpecialActive(attacker, "awakening") ? 99 : 96;
    return clamp(Math.round(hitRate), minimumHitRate, maximumHitRate);
  }

  function getRange() {
    return getRangeForDistance(state.enemyX - state.heroX, MAX_TECHNIQUE_DISTANCE);
  }

  function getStageProjection() {
    const distance = state.enemyX - state.heroX;
    const midpoint = (state.heroX + state.enemyX) / 2;
    const stageProgress = clamp((midpoint - STAGE_MIN_X) / (STAGE_MAX_X - STAGE_MIN_X), 0, 1);
    const closeupProgress = clamp((INITIAL_FIGHTER_DISTANCE - distance) / (INITIAL_FIGHTER_DISTANCE - MIN_FIGHTER_DISTANCE), 0, 1);
    const distanceZoom = clamp(Math.sqrt(INITIAL_FIGHTER_DISTANCE / Math.max(distance, INITIAL_FIGHTER_DISTANCE)), .5, 1);
    const zoom = distanceZoom + closeupProgress * CLOSEUP_ZOOM_BONUS;
    const projectedDistance = Math.min(distance * zoom, MAX_PROJECTED_DISTANCE);
    const screenTrackingSpan = STAGE_SCREEN_TRACKING_SPAN + closeupProgress * CLOSEUP_SCREEN_TRACKING_BONUS;
    const desiredScreenMidpoint = 50 + (stageProgress - .5) * screenTrackingSpan;
    const screenMidpoint = clamp(desiredScreenMidpoint, SCREEN_FIGHTER_MARGIN + projectedDistance / 2, 100 - SCREEN_FIGHTER_MARGIN - projectedDistance / 2);
    const pan = (.5 - stageProgress) * Math.min(window.innerWidth, 1500) * .28;
    const backdropParallax = .22 + closeupProgress * .72;
    return {
      heroX: screenMidpoint - projectedDistance / 2,
      enemyX: screenMidpoint + projectedDistance / 2,
      pan,
      zoom,
      backdropPan: pan * backdropParallax,
      backdropZoom: .88 + zoom * .12 + closeupProgress * .2,
    };
  }

  function finishBattle(reason, attacker) {
    if (["finishing", "result"].includes(state.phase)) return;
    state.phase = "finishing";
    stopGameLoop();
    stopMusic();
    startVictoryMusic();
    keys.left = false;
    keys.right = false;
    ++state.heroActionToken;
    ++state.enemyActionToken;
    ++state.specialCameraToken;
    state.specials = { hero: freshSpecialState(), enemy: freshSpecialState() };
    refs.hero.classList.remove("moving-forward", "moving-back", "fighter-walking", "walk-reversed", "attack-light", "casting", "dodging", "dodge-left", "dodge-right", "ultimate-sequence", "galaxy-ray-sequence", "galaxy-ray-aiming", "galaxy-ray-recoil", "throw-kiss-sequence", "throw-kiss-release", "throw-kiss-recovery", "physical-punch-sequence", "star-ring-sequence", "pentagram-nova-sequence", "pentagram-nova-charge", "pentagram-nova-rush", "pentagram-nova-combo", "pentagram-nova-finisher", "pentagram-nova-diving", "pentagram-nova-miss", "etoile-drive-sequence", "etoile-drive-peak", "business-card-strike-sequence", "closing-time-dash-sequence", "angel-wink-sequence", "approval-meteor-sequence", "tatsuo-slap-sequence", "tatsuo-restraint-sequence", "tatsuo-roar-sequence", "tatsuo-press-sequence", "tatsuo-pinned", "push-focus", "push-threatened", "push-travel", "push-recoil-right", "push-recoil-left", "blown-right", "blown-left", "status-power", "status-ease", "status-real", "status-jealousy", "status-serenity", "status-awakening", "status-etoile", "status-inspiration", "status-genki", "status-charm", "status-zone", "status-pursuit", "status-pleasure", "status-restraint", "grit-rise", "awakening-rise", ...SPECIAL_ACTION_CLASSES);
    refs.enemy.classList.remove("moving-forward", "moving-back", "attack-light", "casting", "dodging", "dodge-left", "dodge-right", "dark-orbit-sequence", "black-meteor-sequence", "meteor-claw-sequence", "crescent-horn-sequence", "sutekichi-star-touch-sequence", "sutekichi-halo-skip-sequence", "sutekichi-stella-search-sequence", "sutekichi-comet-sequence", "sutekichi-nap-sequence", "business-card-strike-sequence", "closing-time-dash-sequence", "angel-wink-sequence", "approval-meteor-sequence", "tatsuo-slap-sequence", "tatsuo-restraint-sequence", "tatsuo-roar-sequence", "tatsuo-press-sequence", "tatsuo-pinned", "technique-recoil", "nova-captured", "push-focus", "push-threatened", "push-travel", "push-recoil-right", "push-recoil-left", "blown-right", "blown-left", "status-power", "status-ease", "status-real", "status-jealousy", "status-serenity", "status-awakening", "status-inspiration", "status-genki", "status-charm", "status-zone", "status-pursuit", "status-pleasure", "status-restraint", "grit-rise", "awakening-rise", ...SPECIAL_ACTION_CLASSES);
    const sharedTechniqueClasses = ["ultimate-sequence", "galaxy-ray-sequence", "throw-kiss-sequence", "physical-punch-sequence", "star-ring-sequence", "pentagram-nova-sequence", "etoile-drive-sequence", "dark-orbit-sequence", "black-meteor-sequence", "meteor-claw-sequence", "crescent-horn-sequence", "sutekichi-star-touch-sequence", "sutekichi-halo-skip-sequence", "sutekichi-stella-search-sequence", "sutekichi-comet-sequence", "sutekichi-nap-sequence", "business-card-strike-sequence", "closing-time-dash-sequence", "angel-wink-sequence", "approval-meteor-sequence", "tatsuo-slap-sequence", "tatsuo-restraint-sequence", "tatsuo-roar-sequence", "tatsuo-press-sequence", "aster-death-energy-sequence", "aster-evil-eye-sequence", "aster-migration-sequence", "aster-tail-sweep-sequence"];
    refs.hero.classList.remove(...sharedTechniqueClasses);
    refs.enemy.classList.remove(...sharedTechniqueClasses);
    refs.hero.classList.remove("status-petrified");
    refs.enemy.classList.remove("status-petrified");
    refs.arena.classList.remove("sutekichi-comet-mode", "aster-evil-eye-mode");
    refs.arena.classList.remove("special-mode", "pentagram-nova-mode", "pentagram-nova-missed", "nova-hit-pulse", "black-meteor-mode", "approval-meteor-mode", "camera-hero", "camera-enemy", "camera-track-release", "camera-face-closeup", "camera-aster-evil-eye-closeup", "camera-aster-death-energy-closeup", "push-camera", "push-camera-hero", "push-camera-enemy", "impact-freeze", "physical-hit-hero", "physical-hit-enemy", "status-camera", "status-camera-hero", "status-camera-enemy");
    refs.arena.classList.add("battle-ending");
    updateUI();

    let heroWon;
    if (reason === "ko") heroWon = attacker === "hero";
    else heroWon = state.heroHp / HERO_MAX_HP >= state.enemyHp / ENEMY_MAX_HP;

    announce(reason === "ko" ? "K.O.!" : "TIME UP");
    setTimeout(() => {
      if (state.phase !== "finishing") return;
      refs.hero.classList.remove("hurt", "critical-hit");
      refs.enemy.classList.remove("hurt", "critical-hit");
      if (heroWon) {
        setSpriteSource("hero", refs.heroSprite, HERO_IMAGES.battleIdle ?? HERO_IMAGES.idle);
        refs.hero.classList.add("result-winner");
        refs.enemy.classList.add("result-loser");
      } else {
        setSpriteSource("hero", refs.heroSprite, HERO_IMAGES.defeat ?? HERO_IMAGES.idle);
        refs.hero.classList.add("result-loser");
        refs.enemy.classList.add("result-winner");
      }
      createVictoryCelebration(heroWon ? "hero" : "enemy");
    }, 420);
    setTimeout(() => {
      if (state.phase !== "finishing") return;
      const winner = heroWon ? refs.hero : refs.enemy;
      const winnerSprite = heroWon ? refs.heroSprite : refs.enemySprite;
      const winnerImages = heroWon ? HERO_IMAGES : ENEMY_IMAGES;
      setSpriteSource(heroWon ? "hero" : "enemy", winnerSprite, winnerImages.victoryClimax ?? winnerImages.battleIdle ?? winnerImages.idle);
      winner.classList.add("result-winner-climax");
      refs.arena.classList.add("victory-climax", heroWon ? "victory-hero" : "victory-enemy");
      sound("victoryClimax");
    }, VICTORY_CLIMAX_DELAY);
    setTimeout(() => {
      if (state.phase !== "finishing") return;
      state.phase = "result";
      refs.resultScreen.classList.add("visible");
    }, RESULT_BUTTON_DELAY);
  }

  function createVictoryCelebration(winner) {
    const projection = getStageProjection();
    const winnerX = winner === "hero" ? projection.heroX : projection.enemyX;
    spawnEffect("victoryCelebration", { side: winner });
    const celebration = document.createElement("div");
    celebration.className = `victory-celebration victory-${winner}`;
    celebration.style.setProperty("--winner-x", `${winnerX}%`);
    refs.arena.style.setProperty("--victory-focus-x", `${winnerX}%`);
    const title = document.createElement("div");
    title.className = "victory-title";
    const label = document.createElement("span");
    label.textContent = "WINNER";
    const name = document.createElement("strong");
    name.textContent = winner === "hero" ? activeHero.name : activeEnemy.name;
    title.append(label, name);
    celebration.append(title);
    refs.effects.append(celebration);
    setTimeout(() => celebration.remove(), RESULT_EFFECT_CLEANUP_DELAY);
  }

  function updateUI() {
    const projection = getStageProjection();
    window.etokichiRenderer.setProjection({
      heroX: projection.heroX,
      enemyX: projection.enemyX,
      pan: projection.pan,
      zoom: projection.zoom,
      backdropPan: projection.backdropPan,
      backdropZoom: projection.backdropZoom,
    });
    setProjectionStyle(refs.hero, "hero-x", "--x", projection.heroX.toFixed(2));
    setProjectionStyle(refs.enemy, "enemy-x", "--x", projection.enemyX.toFixed(2));
    setProjectionStyle(refs.arena, "stage-pan", "--stage-pan", `${projection.pan.toFixed(1)}px`);
    setProjectionStyle(refs.arena, "stage-zoom", "--stage-zoom", projection.zoom.toFixed(3));
    setProjectionStyle(refs.arena, "backdrop-pan", "--backdrop-pan", `${projection.backdropPan.toFixed(1)}px`);
    setProjectionStyle(refs.arena, "backdrop-zoom", "--backdrop-zoom", projection.backdropZoom.toFixed(3));
    const heroPercent = state.heroHp / HERO_MAX_HP * 100;
    const enemyPercent = state.enemyHp / ENEMY_MAX_HP * 100;
    refs.heroLife.style.width = `${heroPercent}%`;
    refs.enemyLife.style.width = `${enemyPercent}%`;
    refs.heroLife.classList.toggle("danger", heroPercent <= 25);
    refs.enemyLife.classList.toggle("danger", enemyPercent <= 25);
    refs.heroHp.textContent = Math.ceil(state.heroHp);
    refs.enemyHp.textContent = Math.ceil(state.enemyHp);
    refs.timer.textContent = Math.ceil(state.time).toString().padStart(2, "0");
    refs.timerWrap.classList.toggle("danger", state.time <= 10 && state.phase === "battle");
    refs.gutsValue.textContent = Math.floor(state.heroGuts);
    refs.gutsBar.style.setProperty("--guts", state.heroGuts.toFixed(2));
    refs.enemyGutsValue.textContent = Math.floor(state.enemyGuts);
    refs.enemyGutsBar.style.setProperty("--guts", state.enemyGuts.toFixed(2));

    const range = getRange();
    const current = getSelectedTechnique(range);
    const enemyCurrent = range === null ? null : getSelectedEnemyTechnique(range);
    const outsideHeroTechniqueRange = range === null || !current;
    const outsideEnemyTechniqueRange = range === null || !enemyCurrent;
    const distancePosition = getDistanceCursorPosition(state.enemyX - state.heroX);
    refs.heroDistanceRuler.style.setProperty("--distance-position", `${100 - distancePosition}%`);
    refs.enemyDistanceRuler.style.setProperty("--distance-position", `${distancePosition}%`);
    refs.hitRate.textContent = current ? current.kind === "support" ? "自己強化" : `${calculateHitChance(current, state.heroGuts)}%` : range === null ? "圏外" : "技なし";
    refs.enemyHitRate.textContent = enemyCurrent ? enemyCurrent.kind === "support" ? "回復技" : `${calculateHitChance(enemyCurrent, state.enemyGuts, false)}%` : range === null ? "圏外" : "技なし";
    refs.heroFocusedTechnique.textContent = current?.name ?? (range === null ? "技の圏外" : "この間合いに技なし");
    refs.enemyFocusedTechnique.textContent = enemyCurrent?.name ?? (range === null ? "技の圏外" : "この間合いに技なし");
    refs.heroDistanceRuler.classList.toggle("out-of-technique-range", outsideHeroTechniqueRange);
    refs.enemyDistanceRuler.classList.toggle("out-of-technique-range", outsideEnemyTechniqueRange);

    refs.techniques.forEach((button) => {
      const buttonRange = Number(button.dataset.range);
      const technique = getSelectedTechnique(buttonRange);
      if (!technique) {
        button.classList.remove("active", "unaffordable", "power-tech", "intelligence-tech", "special-tech");
        button.disabled = true;
        return;
      }
      const cost = getTechniqueCost(technique, "hero");
      button.classList.toggle("active", buttonRange === range);
      button.classList.toggle("unaffordable", state.heroGuts < cost);
      button.classList.toggle("power-tech", technique.attackStat === "power");
      button.classList.toggle("intelligence-tech", technique.attackStat === "intelligence");
      button.classList.toggle("special-tech", technique.kind === "special" || technique.kind === "super");
      const techniqueKey = technique.id ?? technique.name;
      if (button.dataset.techniqueId !== techniqueKey) {
        button.dataset.techniqueId = techniqueKey;
        button.querySelector(".technique-name").textContent = technique.cardName ?? technique.name;
        const icon = button.querySelector(".technique-icon svg");
        icon.removeAttribute("fill");
        icon.innerHTML = technique.iconSvg;
      }
      button.querySelector(".technique-cost b").textContent = cost;
      button.disabled = state.phase !== "battle" || isActionDisabled("hero");
    });
    refs.techniqueCycleDotGroups.forEach((group) => {
      const cycleRange = Number(group.dataset.cycleRange);
      const choices = getTechniquesAtRange(cycleRange);
      const selectedIndex = state.heroTechniqueSelection[cycleRange] % choices.length;
      [...group.children].forEach((dot, index) => dot.classList.toggle("active", index === selectedIndex));
    });
    refs.techniqueCycleButtons.forEach((button) => { button.disabled = state.phase !== "battle" || performance.now() < state.actionLockUntil; });
    refs.enemyTechniques.forEach((item) => {
      const itemRange = Number(item.dataset.enemyTech);
      const technique = getSelectedEnemyTechnique(itemRange);
      if (!technique) return;
      const cost = getTechniqueCost(technique, "enemy");
      item.classList.toggle("active", itemRange === range);
      item.classList.toggle("unaffordable", state.enemyGuts < cost);
      item.classList.toggle("power-tech", technique.attackStat === "power");
      item.classList.toggle("intelligence-tech", technique.attackStat === "intelligence");
      item.classList.toggle("support-tech", technique.kind === "support");
      if (item.dataset.techniqueName !== technique.name) {
        item.dataset.techniqueName = technique.name;
        item.querySelector(".technique-name").textContent = technique.name;
        const icon = item.querySelector(".technique-icon svg");
        icon.removeAttribute("fill");
        icon.innerHTML = technique.iconSvg;
      }
      item.querySelector(".technique-cost b").textContent = cost;
    });
    refs.enemyTechniqueCycleDotGroups.forEach((group) => {
      const cycleRange = Number(group.dataset.enemyCycleRange);
      const choices = getEnemyTechniquesAtRange(cycleRange);
      const selectedIndex = state.enemyTechniqueSelection[cycleRange] % choices.length;
      [...group.children].forEach((dot, index) => dot.classList.toggle("active", index === selectedIndex));
    });
    refs.enemyTechniqueCycleButtons.forEach((button) => { button.disabled = state.phase !== "battle"; });
    const heroActionDisabled = isActionDisabled("hero");
    refs.attackButton.disabled = state.phase !== "battle" || heroActionDisabled || !current;
    refs.pushButton.disabled = state.phase !== "battle" || heroActionDisabled;
    refs.moveLeft.disabled = state.phase !== "battle" || heroActionDisabled;
    refs.moveRight.disabled = state.phase !== "battle" || heroActionDisabled;
    window.etokichiRenderer.setMobileControlState({
      enabled: state.phase === "battle" && !heroActionDisabled,
    });
    renderSpecialBadges("hero", refs.heroSpecials);
    renderSpecialBadges("enemy", refs.enemySpecials);
    renderCombatStatus("hero", refs.heroCombatStatus);
    renderCombatStatus("enemy", refs.enemyCombatStatus);
    positionCombatStatus("hero", refs.heroCombatStatus);
    positionCombatStatus("enemy", refs.enemyCombatStatus);
  }

  function setProjectionStyle(element, cacheKey, property, value) {
    if (projectionStyleCache.get(cacheKey) === value) return;
    projectionStyleCache.set(cacheKey, value);
    element.style.setProperty(property, value);
  }

  function getDistanceCursorPosition(distance) {
    const boundaries = [13, 19, 33, 48, 80];
    const range = getRange();
    const techniqueArea = 100 - OUT_OF_RANGE_RULER_SHARE;
    if (range === null) {
      const maximumDistance = STAGE_MAX_X - STAGE_MIN_X;
      const outProgress = clamp((distance - MAX_TECHNIQUE_DISTANCE) / (maximumDistance - MAX_TECHNIQUE_DISTANCE), 0, 1);
      return techniqueArea + outProgress * OUT_OF_RANGE_RULER_SHARE;
    }
    const lower = boundaries[range];
    const upper = boundaries[range + 1];
    const progressWithinRange = clamp((distance - lower) / (upper - lower), 0, 1);
    return (range + progressWithinRange) / 4 * techniqueArea;
  }

  function renderSpecialBadges(side, container) {
    const special = state.specials[side];
    const labels = [];
    for (const [type, activeUntil] of Object.entries(special.activeUntil)) {
      if (Number.isFinite(activeUntil)) {
        const remaining = Math.max(0, Math.ceil((activeUntil - performance.now()) / 1000));
        labels.push(isSpecialPinnedForResolution(side, type) && remaining === 0
          ? `${battleSpecialMeta[type].label} 判定中`
          : `${battleSpecialMeta[type].label} ${remaining}s`);
      } else {
        labels.push(battleSpecialMeta[type].label);
      }
    }
    if (special.realExhausted) labels.push("本気切れ");
    const text = labels.join(" / ");
    if (container.dataset.value === text) return;
    container.dataset.value = text;
    container.replaceChildren();
    if (text) {
      const badge = document.createElement("span");
      badge.textContent = text;
      container.append(badge);
    }
  }

  function renderCombatStatus(side, container) {
    const special = state.specials[side];
    const now = performance.now();
    const statuses = Object.entries(special.activeUntil).map(([type, activeUntil]) => ({
      type,
      label: battleSpecialMeta[type].label,
      remaining: Number.isFinite(activeUntil) ? Math.max(0, (activeUntil - now) / 1000) : Number.POSITIVE_INFINITY,
    }));
    if (special.realExhausted) statuses.push({ type: "real-exhausted", label: "本気切れ", remaining: null });
    if (special.triggered.grit) statuses.push({ type: "grit-used", label: "根性", remaining: null });

    const value = statuses.map(({ type, label, remaining }) => {
      const debugTime = remaining === null ? "" : Number.isFinite(remaining) ? remaining.toFixed(1) : "infinity";
      return `${type}|${label}|${debugTime}`;
    }).join("/");
    if (container.dataset.value === value) return;
    container.dataset.value = value;
    container.className = `combat-status ${side === "enemy" ? "enemy-combat-status " : ""}${statuses.length ? "visible combat-status-multiple" : ""}`.trim();
    container.replaceChildren();
    for (const { type, label, remaining } of statuses) {
      const entry = document.createElement("span");
      entry.className = "combat-status-entry";
      const title = document.createElement("strong");
      title.dataset.status = type;
      title.textContent = label;
      entry.append(title);
      if (remaining !== null) {
        const debugTime = document.createElement("small");
        debugTime.className = "combat-status-debug-time";
        debugTime.textContent = `残り ${Number.isFinite(remaining) ? `${remaining.toFixed(1)}s` : "∞"}`;
        entry.append(debugTime);
      }
      container.append(entry);
    }
  }

  function positionCombatStatus(side, container) {
    const point = window.etokichiRenderer.getActorPoint(side, .5, .02);
    container.style.left = `${point.x}px`;
    container.style.top = `${point.y}px`;
  }

  function announce(text) {
    refs.announcement.textContent = text;
    refs.announcement.classList.remove("show");
    void refs.announcement.offsetWidth;
    refs.announcement.classList.add("show");
  }

  function announceTechnique(text, special, enemy = false) {
    const label = document.createElement("div");
    label.className = `tech-callout ${special ? "is-special" : ""} ${enemy ? "is-enemy" : ""}`;
    label.textContent = text;
    refs.effects.append(label);
    label.animate([
      { opacity: 0, transform: "translateY(12px) scale(.88)" },
      { opacity: 1, transform: "translateY(0) scale(1)", offset: .2 },
      { opacity: 1, transform: "translateY(0) scale(1)", offset: .72 },
      { opacity: 0, transform: "translateY(-18px) scale(.96)" },
    ], { duration: special ? 1350 : 850, easing: "ease-out" }).finished.then(() => label.remove());
    Object.assign(label.style, {
      position: "absolute",
      left: enemy ? "auto" : "5%",
      right: enemy ? "5%" : "auto",
      top: special ? "35%" : "25%",
      maxWidth: "70%",
      color: special ? "#fff4a8" : enemy ? "#c8b5ff" : "white",
      fontSize: special ? "clamp(18px, 3vw, 36px)" : "clamp(12px, 2vw, 22px)",
      fontWeight: "900",
      fontStyle: "italic",
      textShadow: special ? "0 0 18px #f5a800, 0 3px #5c2a00" : "0 3px #351854",
    });
  }

  function popStatus(element, text) {
    const pop = element.querySelector(".status-pop");
    pop.className = "status-pop";
    pop.replaceChildren();
    pop.textContent = text;
    void pop.offsetWidth;
    pop.classList.add("show");
  }

  function showDamage(element, damage, heroAttacks, gutsDamage = 0, critical = false, superHit = false) {
    const targetSide = heroAttacks ? "enemy" : "hero";
    const followsPixiTarget = mobileLandscapeMedia.matches;
    const getTargetPoint = () => followsPixiTarget
      ? window.etokichiRenderer.getActorPoint(targetSide, .5, .36)
      : getEffectPoint(element.querySelector(".sprite"), .5, .36);
    const targetPoint = getTargetPoint();
    const pop = document.createElement("div");
    pop.className = `status-pop damage-pop ${heroAttacks ? "hero-damage" : "enemy-damage"}${superHit ? " super-damage" : ""}${critical ? " critical-damage" : ""}`;
    pop.style.left = `${targetPoint.x}px`;
    pop.style.top = `${targetPoint.y}px`;
    const label = document.createElement("span");
    const lifeValue = document.createElement("strong");
    const gutsValue = document.createElement("small");
    const gutsLabel = document.createElement("span");
    const gutsNumber = document.createElement("b");
    const criticalBurst = document.createElement("i");
    const criticalBonus = document.createElement("em");
    label.className = "damage-label";
    label.textContent = critical ? "CRITICAL!" : "DAMAGE";
    lifeValue.textContent = `-${damage}`;
    gutsValue.className = `guts-damage ${gutsDamage > 0 ? "has-damage" : "no-damage"}`;
    gutsLabel.textContent = "GUTS";
    gutsNumber.textContent = gutsDamage > 0 ? `-${gutsDamage}` : "0";
    criticalBurst.className = "critical-burst";
    criticalBonus.className = "critical-bonus";
    criticalBonus.textContent = "DAMAGE ×1.5";
    gutsValue.append(gutsLabel, gutsNumber);
    if (critical) pop.append(criticalBurst);
    pop.append(label, lifeValue);
    if (critical) pop.append(criticalBonus);
    pop.append(gutsValue);
    refs.effects.append(pop);
    let targetFollowFrame = 0;
    if (followsPixiTarget) {
      const followTarget = () => {
        const point = getTargetPoint();
        pop.style.left = `${point.x}px`;
        pop.style.top = `${point.y}px`;
        targetFollowFrame = requestAnimationFrame(followTarget);
      };
      followTarget();
    }
    void pop.offsetWidth;
    pop.classList.add("show");
    const displayDuration = critical ? 1950 : superHit ? 1750 : 1450;
    setTimeout(() => {
      if (targetFollowFrame) cancelAnimationFrame(targetFollowFrame);
      pop.remove();
    }, displayDuration);
    if (critical) createCriticalScreenBurst(element);
    if (damage >= 240) {
      refs.arena.classList.remove("shake");
      void refs.arena.offsetWidth;
      refs.arena.classList.add("shake");
    }
    if (!heroAttacks) navigator.vibrate?.(35);
  }

  function spawnEffect(type, options = {}) {
    if (!window.etokichiRenderer.spawnEffect(type, options)) {
      throw new Error(`GPUエフェクトが実装されていません: ${type}`);
    }
  }

  function startFighterMotion(side, type, options) {
    if (!window.etokichiRenderer.startFighterMotion(side, type, options)) {
      throw new Error(`GPUキャラクターアニメーションが実装されていません: ${type}`);
    }
  }

  function targetSpriteFor(side) {
    return side === "hero" ? refs.enemySprite : refs.heroSprite;
  }

  function profileFor(side) {
    return side === "hero" ? activeHero : activeEnemy;
  }

  function createCriticalScreenBurst(target) {
    spawnEffect("criticalScreenBurst", { side: target === refs.hero ? "hero" : "enemy" });
  }

  function createImpact(actorSide, characterId = null) {
    const side = typeof actorSide === "boolean" ? (actorSide ? "hero" : "enemy") : actorSide;
    spawnEffect("impact", { side, characterId });
  }

  function createEtoileDriveEffect(side, duration) {
    spawnEffect("etoileDrive", { side, duration });
  }

  function applyTechniqueKnockback(heroAttacks, distance, target) {
    target.classList.remove("flash-knockback");
    void target.offsetWidth;
    target.classList.add("flash-knockback");
    if (heroAttacks) state.enemyX = Math.min(STAGE_MAX_X, state.enemyX + distance);
    else state.heroX = Math.max(STAGE_MIN_X, state.heroX - distance);
    setTimeout(() => target.classList.remove("flash-knockback"), 1100);
  }

  function applyTechniqueClosing(attacker) {
    const actor = attacker === "hero" ? refs.hero : refs.enemy;
    const positions = closeToMinimumRange(
      state.heroX,
      state.enemyX,
      attacker,
      STAGE_MIN_X,
      STAGE_MAX_X,
      MIN_FIGHTER_DISTANCE + 1,
    );
    actor.classList.add("closing-distance");
    state.heroX = positions.heroX;
    state.enemyX = positions.enemyX;
    setTimeout(() => actor.classList.remove("closing-distance"), 150);
  }

  function createProjectile(actorSide) {
    const side = typeof actorSide === "boolean" ? (actorSide ? "enemy" : "hero") : actorSide;
    spawnEffect("projectile", { side });
  }

  function getEffectPoint(sprite, xRatio, yRatio) {
    const arenaRect = refs.arena.getBoundingClientRect();
    const spriteRect = sprite.getBoundingClientRect();
    return {
      x: spriteRect.left - arenaRect.left + spriteRect.width * xRatio,
      y: spriteRect.top - arenaRect.top + spriteRect.height * yRatio,
    };
  }

  function createPhysicalDust(side, color) {
    spawnEffect("dust", { side, color });
  }

  function createPunchTrail(side) {
    spawnEffect("punchTrail", { side });
  }

  function createStarRingSweep(side) {
    spawnEffect("starRing", { side });
  }

  function createMeteorClawTrail(side) {
    spawnEffect("meteorClaw", { side });
  }

  function createCrescentHornRush(side) {
    spawnEffect("crescentRush", { side });
  }

  function createPhysicalContact(actorSide, variant) {
    const side = typeof actorSide === "boolean" ? (actorSide ? "hero" : "enemy") : actorSide;
    spawnEffect("physicalContact", { side, variant, characterId: profileFor(side).id });
  }

  function createPentagramNovaCharge(side) {
    spawnEffect("novaCharge", { side });
  }

  function createPentagramNovaRush(side) {
    spawnEffect("novaRush", { side });
  }

  function createPentagramNovaCapture(side) {
    spawnEffect("novaCapture", { side });
  }

  function startPentagramNovaCombo(side) {
    const targetSprite = targetSpriteFor(side);
    const arenaRect = refs.arena.getBoundingClientRect();
    const target = getEffectPoint(targetSprite, .5, .5);
    const radiusX = clamp(arenaRect.width * .14, 105, 185);
    const radiusY = clamp(arenaRect.height * .23, 90, 165);
    const points = [
      { x: target.x, y: target.y - radiusY },
      { x: target.x + radiusX * .62, y: target.y + radiusY * .82 },
      { x: target.x - radiusX, y: target.y - radiusY * .18 },
      { x: target.x + radiusX, y: target.y - radiusY * .18 },
      { x: target.x - radiusX * .62, y: target.y + radiusY * .82 },
      { x: target.x, y: target.y - radiusY },
    ];
    spawnEffect("novaPath", { side, points });
    startFighterMotion(side, "novaCombo", { points, duration: 2480 });
  }

  function startPentagramNovaFinisherRise(side) {
    const targetSprite = targetSpriteFor(side);
    const arenaRect = refs.arena.getBoundingClientRect();
    const enemyGroundTarget = getEffectPoint(targetSprite, .5, .56);
    const lift = clamp(arenaRect.height * .38, 180, 300);
    const airTarget = { x: enemyGroundTarget.x, y: enemyGroundTarget.y - lift };
    startFighterMotion(side, "novaRise", {
      enemyGroundTarget,
      airTarget,
      duration: 570,
    });
    return { enemyGroundTarget, airTarget };
  }

  function startPentagramNovaFinisherDive(side, motion) {
    if (!motion) return null;
    startFighterMotion(side, "novaDive", {
      enemyGroundTarget: motion.enemyGroundTarget,
      duration: 550,
    });
    return motion;
  }

  function createPentagramNovaStrike(side, index) {
    spawnEffect("novaStrike", { side, index });
    refs.arena.classList.remove("nova-hit-pulse");
    void refs.arena.offsetWidth;
    refs.arena.classList.add("nova-hit-pulse");
  }

  function createPentagramNovaUppercut(side, motion) {
    if (!motion) return;
    spawnEffect("novaUppercut", {
      side,
      enemyGroundTarget: motion.enemyGroundTarget,
      airTarget: motion.airTarget,
    });
  }

  function createPentagramNovaDive(side, targetPoint) {
    spawnEffect("novaDive", { side, targetPoint });
  }

  function createPentagramNovaImpact(side, critical) {
    spawnEffect("novaImpact", { side, critical });
    refs.arena.classList.remove("shake");
    void refs.arena.offsetWidth;
    refs.arena.classList.add("shake");
  }

  function createGalaxyRayCharge(side) {
    spawnEffect("galaxyRayCharge", { side });
  }

  function createGalaxyRay(side) {
    spawnEffect("galaxyRay", { side });
  }

  function createKissCharge(side) {
    spawnEffect("kissCharge", { side });
  }

  function createThrowingKiss(side) {
    spawnEffect("throwingKiss", { side });
  }

  function createKissBurst(side) {
    spawnEffect("kissBurst", { side });
  }

  function createKissMissBreak(side) {
    spawnEffect("kissMiss", { side });
    sound("kissBreak");
  }

  function createDarkOrbitField(side) {
    spawnEffect("darkOrbitField", { side });
  }

  function createDarkOrbitVolley(side) {
    spawnEffect("darkOrbitVolley", { side });
  }

  function createBlackMeteorSky(side) {
    spawnEffect("blackMeteorSky", { side });
  }

  function createBlackMeteor(side) {
    spawnEffect("blackMeteor", { side });
  }

  function createBlackMeteorImpact(side) {
    spawnEffect("blackMeteorImpact", { side });
    refs.arena.classList.remove("shake");
    void refs.arena.offsetWidth;
    refs.arena.classList.add("shake");
  }

  function createSutekichiStarTouchEffect(side) {
    spawnEffect("sutekichiStarTouch", { side });
  }

  function createSutekichiHaloSkipEffect(side) {
    spawnEffect("sutekichiHaloSkip", { side });
  }

  function createSutekichiStellaSearchEffect(side) {
    spawnEffect("sutekichiStellaSearch", { side });
  }

  function createSutekichiCometCharge(side) {
    spawnEffect("sutekichiCometCharge", { side });
  }

  function createSutekichiComet(side, index = 0) {
    spawnEffect("sutekichiComet", { side, index });
  }

  function createSutekichiCometImpact(side, index = 0) {
    spawnEffect("sutekichiCometImpact", { side, index });
  }

  function createSutekichiNapDream(side) {
    spawnEffect("sutekichiNapDream", { side });
  }

  function createSutekichiNapResult(success, side = "enemy") {
    spawnEffect("sutekichiNapResult", { success, side });
  }

  function createBusinessCardStrike(side) {
    spawnEffect("businessCardStrike", { side });
  }

  function createClosingTimeDash(side) {
    startFighterMotion(side, "closingTimeDash", { duration: 420 });
    spawnEffect("closingTimeDash", { side });
  }

  function createAngelWink(side) {
    spawnEffect("angelWink", { side });
  }

  function createApprovalMeteorCharge(side) {
    spawnEffect("approvalMeteorCharge", { side });
  }

  function createApprovalMeteor(side) {
    spawnEffect("approvalMeteor", { side });
  }

  function createTatsuoTechniqueEffect(type, side) {
    spawnEffect(type, { side });
  }

  function createAsterTechniqueEffect(type, side) {
    spawnEffect(type, { side });
  }

  function createPetrificationStatus(side) {
    spawnEffect("petrificationStatus", { side });
  }

  function createPetrificationBreak(side) {
    spawnEffect("petrificationBreak", { side });
  }

  function createCharmStatus(side) {
    spawnEffect("charmStatus", { side });
  }

  function createCharmBreak(side) {
    spawnEffect("charmBreak", { side });
  }

  function createGalaxyCharge(side) {
    spawnEffect("galaxyCharge", { side });
  }

  function createGalaxyFlash(side) {
    if (state.phase !== "battle") return;
    spawnEffect("galaxyFlash", { side });
  }

  function armBattleMusic() {
    stopMusic();
    battleMusic.volume = 0;
    battleMusic.play().catch(() => {
      // FIGHT!時に再試行する。開始ボタン操作時の呼び出しで自動再生許可を確保する。
    });
  }

  function armEntranceMusic() {
    stopEntranceMusic();
    entranceMusic.volume = 0;
    entranceMusic.play().catch(() => {
      // 入場開始時に再試行する。ゲーム開始操作時の呼び出しで自動再生許可を確保する。
    });
  }

  function startEntranceMusic() {
    entranceMusic.currentTime = 0;
    entranceMusic.volume = ENTRANCE_MUSIC_VOLUME;
    entranceMusic.play().catch(() => {
      // 再生が拒否されても入場演出は継続する。
    });
  }

  function stopEntranceMusic() {
    entranceMusic.pause();
    entranceMusic.currentTime = 0;
    entranceMusic.volume = 0;
  }

  function startMusic() {
    battleMusic.currentTime = 0;
    battleMusic.volume = BATTLE_MUSIC_VOLUME;
    battleMusic.play().catch(() => {
      // ブラウザが再生を拒否した場合も、ゲーム進行とSEは継続する。
    });
  }

  function stopMusic() {
    battleMusic.pause();
    battleMusic.currentTime = 0;
    battleMusic.volume = 0;
  }

  function startVictoryMusic() {
    victoryMusic.currentTime = 0;
    victoryMusic.volume = VICTORY_MUSIC_VOLUME;
    victoryMusic.play().catch(() => {
      // 再生が拒否されても勝利演出は継続する。
    });
  }

  function stopVictoryMusic() {
    victoryMusic.pause();
    victoryMusic.currentTime = 0;
    victoryMusic.volume = 0;
  }

  function connectAudioOutput(node, pan = 0) {
    const output = effectsOutput || audioContext.destination;
    if (Math.abs(pan) < .01 || typeof audioContext.createStereoPanner !== "function") {
      node.connect(output);
      return;
    }
    const panner = audioContext.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    node.connect(panner).connect(output);
  }

  function noiseBurst(duration, volume, highpass, delay = 0, pan = 0) {
    if (!audioContext) return;
    const frameCount = Math.max(1, Math.floor(audioContext.sampleRate * duration));
    const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime + delay;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(highpass, start);
    gain.gain.setValueAtTime(volume * SOUND_EFFECT_VOLUME, start);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain);
    connectAudioOutput(gain, pan);
    source.start(start);
    source.stop(start + duration + .01);
  }

  function crowdNoise(duration, volume, delay = 0, pan = 0, brightness = 1800) {
    if (!audioContext) return;
    const frameCount = Math.max(1, Math.floor(audioContext.sampleRate * duration));
    const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    let smoothed = 0;
    for (let index = 0; index < data.length; index += 1) {
      smoothed = smoothed * .78 + (Math.random() * 2 - 1) * .22;
      data[index] = clamp(smoothed * 1.35, -1, 1);
    }
    const source = audioContext.createBufferSource();
    const highpass = audioContext.createBiquadFilter();
    const lowpass = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime + delay;
    highpass.type = "highpass";
    highpass.frequency.value = 150;
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(brightness * .72, start);
    lowpass.frequency.exponentialRampToValueAtTime(brightness, start + duration * .3);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume * SOUND_EFFECT_VOLUME, start + .09);
    gain.gain.setValueAtTime(volume * SOUND_EFFECT_VOLUME * .82, start + duration * .34);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.buffer = buffer;
    source.connect(highpass).connect(lowpass).connect(gain);
    connectAudioOutput(gain, pan);
    source.start(start);
    source.stop(start + duration + .01);
  }

  function crowdVoice(frequency, duration, volume, delay, pan, rise) {
    if (!audioContext) return;
    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const vibrato = audioContext.createOscillator();
    const vibratoDepth = audioContext.createGain();
    const gain = audioContext.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * rise, start + duration * .42);
    vibrato.type = "sine";
    vibrato.frequency.value = random(4.2, 7.4);
    vibratoDepth.gain.value = random(5, 11);
    vibrato.connect(vibratoDepth).connect(oscillator.frequency);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume * SOUND_EFFECT_VOLUME, start + random(.06, .13));
    gain.gain.setValueAtTime(volume * SOUND_EFFECT_VOLUME * .72, start + duration * .3);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain);
    connectAudioOutput(gain, pan);
    oscillator.start(start);
    vibrato.start(start);
    oscillator.stop(start + duration + .02);
    vibrato.stop(start + duration + .02);
  }

  function crowdVoices(duration, level, excited) {
    const voices = excited ? 12 : 9;
    for (let index = 0; index < voices; index += 1) {
      const frequency = random(145, 330);
      crowdVoice(
        frequency,
        duration * random(.62, .94),
        random(.01, .016) * level,
        .035 + index * .018 + random(0, .09),
        random(-.92, .92),
        random(excited ? 1.42 : 1.22, excited ? 1.82 : 1.55),
      );
    }
  }

  function initAudio() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (!effectsOutput) {
      effectsOutput = audioContext.createDynamicsCompressor();
      effectsOutput.threshold.value = -18;
      effectsOutput.knee.value = 18;
      effectsOutput.ratio.value = 4;
      effectsOutput.attack.value = .003;
      effectsOutput.release.value = .22;
      effectsOutput.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") audioContext.resume();
  }

  function tone(frequency, duration, type = "sine", volume = .035, delay = 0, endFrequency = null, pan = 0) {
    if (!audioContext) return;
    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume * SOUND_EFFECT_VOLUME, start + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain);
    connectAudioOutput(gain, pan);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  }

  function whoosh(startFrequency = 1200, endFrequency = 160, duration = .28, delay = 0, pan = 0, volume = .02) {
    noiseBurst(duration * .88, volume * .72, Math.max(800, startFrequency * .72), delay, pan);
    tone(startFrequency, duration, "sawtooth", volume, delay, endFrequency, pan);
    tone(startFrequency * .54, duration * .84, "triangle", volume * .62, delay + .025, Math.max(45, endFrequency * .62), -pan * .6);
  }

  function impact(heavy = false, delay = 0, pan = 0) {
    const low = heavy ? 44 : 68;
    tone(low, heavy ? .48 : .3, "sine", heavy ? .07 : .045, delay, heavy ? 30 : 38, pan);
    tone(heavy ? 190 : 290, heavy ? .2 : .14, "square", heavy ? .033 : .022, delay, heavy ? 62 : 105, -pan * .45);
    noiseBurst(heavy ? .24 : .14, heavy ? .045 : .031, heavy ? 560 : 920, delay, pan);
    tone(heavy ? 1550 : 2050, .085, "triangle", heavy ? .018 : .012, delay, heavy ? 330 : 540, -pan);
    if (heavy) tone(72, .42, "triangle", .027, delay + .075, 34, -pan * .7);
  }

  function sparkle(notes, delay = 0, volume = .015) {
    notes.forEach((frequency, index) => {
      const pan = index % 2 === 0 ? -.42 : .42;
      tone(frequency, .3, "sine", volume, delay + index * .055, frequency * 1.16, pan);
      tone(frequency * 2, .18, "triangle", volume * .38, delay + index * .055, frequency * 1.5, -pan);
    });
  }

  function crowdReaction(strength = 1) {
    const duration = strength > 1 ? 3 : 2.3;
    const crowdLevel = strength * .9;
    crowdVoices(duration, crowdLevel, strength > 1);
    crowdNoise(duration, .028 * crowdLevel, .025, -.68, strength > 1 ? 2100 : 1650);
    crowdNoise(duration * .94, .022 * crowdLevel, .055, .68, strength > 1 ? 1850 : 1450);
    [0,.085,.17,.29,.43].forEach((delay, index) => noiseBurst(.065, .012 * crowdLevel, 920 + index * 170, delay, index % 2 ? .62 : -.62));
    [176, 214, 257, 301].forEach((frequency, index) => {
      tone(frequency, duration * .72, "triangle", .0055 * crowdLevel, .055 + index * .032, frequency * 1.38, index % 2 ? .74 : -.74);
    });
  }

  function sound(kind) {
    if (!audioContext) return;
    const recipes = {
      ready: () => [330, 440].forEach((f, i) => tone(f, .12, "square", .025, i * .14)),
      fight: () => [440, 660, 880].forEach((f, i) => tone(f, .16, "square", .03, i * .08)),
      deny: () => tone(130, .13, "square", .025, 0, 85),
      techSwitch: () => { tone(660, .08, "square", .014); tone(990, .09, "sine", .014, .055); },
      swing: () => whoosh(960, 125, .28, 0, -.28, .021),
      enemySwing: () => whoosh(620, 72, .34, 0, .3, .024),
      physicalWindup: () => { tone(105, .55, "sawtooth", .018, 0, 390, -.18); tone(58, .48, "triangle", .017, .06, 190, .18); noiseBurst(.28, .008, 1350, .18); },
      tatsuoSlap: () => { whoosh(2200, 74, .18, 0, -.5, .034); tone(132, .18, "square", .021, .03, 48, .38); },
      tatsuoRestraintRush: () => { whoosh(1100, 52, .72, 0, .42, .032); tone(68, .8, "sawtooth", .026, 0, 38, -.28); noiseBurst(.46, .017, 720, .04, .34); },
      tatsuoRoarWindup: () => { tone(92, .48, "triangle", .02, 0, 61); noiseBurst(.34, .012, 240, .08, 0); },
      tatsuoRoar: () => { crowdVoice(82, 1.05, .052, 0, 0, .72); crowdVoice(109, .92, .038, .035, -.18, .63); tone(54, 1.2, "sawtooth", .045, 0, 36); tone(164, .82, "square", .025, .04, 71, .2); noiseBurst(.92, .035, 310, 0, 0); },
      tatsuoPressWindup: () => { tone(58, .42, "triangle", .026, 0, 126); noiseBurst(.28, .011, 480, .04, 0); },
      tatsuoPressRise: () => { whoosh(240, 1900, .72, 0, 0, .032); tone(61, .78, "sine", .039, 0, 220); },
      tatsuoPressDive: () => { whoosh(2600, 42, .88, 0, .18, .048); tone(460, .86, "sawtooth", .032, 0, 38, -.18); noiseBurst(.62, .03, 1550, .08, .24); },
      tatsuoPressCrash: () => { impact(true); impact(true, .11, -.42); noiseBurst(.74, .058, 360, 0, .38); tone(32, 1.05, "sine", .072, .02, 26); crowdReaction(1.42); },
      punchRush: () => { whoosh(1550, 92, .27, 0, -.66, .027); whoosh(980, 68, .22, .075, .48, .016); },
      ringWhip: () => { whoosh(1850, 150, .58, 0, -.72, .024); tone(340, .48, "triangle", .018, .045, 1120, .5); sparkle([1175,1568], .16, .009); },
      asterMigrationCharge: () => { tone(118, 1.15, "sawtooth", .024, 0, 460); tone(236, .95, "sine", .016, .08, 920); noiseBurst(.72, .011, 1080, .16); },
      asterMigrationDrain: () => { [0,.075,.15,.225,.3,.375,.45,.525].forEach((delay, index) => { tone(520 - index * 34, .18, "sawtooth", .022, delay, 180 - index * 8, index % 2 ? .58 : -.58); whoosh(1250 - index * 70, 92, .2, delay, index % 2 ? -.46 : .46, .016); }); tone(74, 1.25, "triangle", .032, 0, 41); noiseBurst(1.05, .022, 720, .02); },
      asterEvilEyeFocus: () => { tone(92, .72, "sine", .015, 0, 260); },
      asterEvilEyeGlow: () => { tone(360, .56, "sine", .029, 0, 2480); tone(720, .46, "triangle", .022, .025, 3200); sparkle([988,1480,2217], .08, .018); noiseBurst(.32, .014, 2600, .04); },
      asterDeathLaugh: () => { [.02,.22,.43].forEach((delay, index) => { crowdVoice(220 - index * 28, .22, .039, delay, index % 2 ? .3 : -.3, .72); tone(330 - index * 36, .18, "triangle", .017, delay, 190 - index * 20); }); tone(68, .82, "sawtooth", .018, 0, 42); },
      asterDeathMist: () => { whoosh(2900, 82, 2.05, 0, -.48, .047); whoosh(1740, 116, 1.7, .2, .5, .033); noiseBurst(2.28, .043, 1380, 0, .16); noiseBurst(1.72, .026, 720, .16, -.3); tone(1320, 2.16, "sawtooth", .029, 0, 92, -.36); tone(610, 2.22, "triangle", .025, .025, 78, .38); tone(62, 2.38, "sine", .044, 0, 31); [1480,1175,880].forEach((frequency, index) => tone(frequency, .66, "sine", .012, .1 + index * .19, frequency * .46, index % 2 ? .62 : -.62)); },
      novaCharge: () => { tone(54, 1.35, "sine", .042, 0, 310); tone(108, 1.2, "sawtooth", .019, .08, 920, -.28); noiseBurst(.72, .012, 1550, .3, .3); sparkle([523,784,1047], .64, .01); },
      novaRush: () => { whoosh(2400, 65, .54, 0, -.75, .038); tone(168, .48, "square", .028, .02, 58, .62); noiseBurst(.34, .025, 2100, .02, -.45); },
      novaCapture: () => { tone(286, .62, "triangle", .026, 0, 1240); tone(572, .5, "sine", .018, .04, 1716); sparkle([988,1319,1760], .1, .014); },
      novaStrike: () => { whoosh(1900, 92, .18, 0, random(-.75, .75), .024); impact(false, .045, random(-.6, .6)); tone(760, .13, "square", .015, .025, 170); },
      novaRise: () => { whoosh(440, 2100, .72, 0, 0, .025); tone(92, .82, "sine", .029, 0, 980); sparkle([784,1175,1568], .26, .011); },
      novaDive: () => { tone(980, .7, "sawtooth", .031, 0, 42); whoosh(2600, 48, .68, 0, .25, .038); noiseBurst(.5, .021, 1850, .08, -.35); },
      novaCrash: () => { impact(true); impact(true, .12, -.52); noiseBurst(.72, .052, 430, 0, .48); tone(34, 1.05, "sine", .064, .02, 27); sparkle([659,988,1319,1976], .1, .016); crowdReaction(1.5); },
      clawRush: () => { [0,.075,.15].forEach((delay,index) => whoosh(1450-index*230, 82, .24, delay, index%2 ? -.62 : .62, .019)); },
      hornRush: () => { tone(82, .9, "sawtooth", .031, 0, 38, .3); whoosh(720, 48, .72, .03, .55, .02); noiseBurst(.55, .014, 620, .08, -.45); },
      physicalContact: () => { impact(false, 0, 0); tone(510, .16, "sawtooth", .018, .02, 82, .45); },
      enemyShot: () => { tone(160, .38, "sawtooth", .02, 0, 620, .45); whoosh(820, 110, .25, .06, .62, .014); },
      sutekichiTouch: () => { sparkle([784,1175,1568], 0, .014); whoosh(1180, 260, .28, .08, .55, .012); },
      sutekichiHalo: () => { tone(440, .62, "sine", .018, 0, 1320, .45); sparkle([659,988,1480], .08, .012); whoosh(1580, 180, .52, .18, .6, .016); },
      sutekichiScan: () => { [523,659,784,988].forEach((frequency, index) => tone(frequency, .18, "triangle", .015, index * .15, frequency * 1.25, index % 2 ? .45 : -.2)); tone(1568, .65, "sine", .009, .52, 880); },
      sutekichiCometCharge: () => { tone(196, 1.55, "sine", .022, 0, 988, .3); sparkle([392,587,784,1175], .28, .011); },
      sutekichiCometFall: () => { whoosh(2200, 85, 1.2, 0, .52, .03); tone(659, 1.25, "triangle", .022, 0, 110, -.32); },
      sutekichiCometImpact: () => { impact(true); sparkle([784,1175,1568,2093], .04, .018); noiseBurst(.42, .032, 1200, 0, .38); },
      sutekichiNap: () => { [523,659,784].forEach((frequency, index) => tone(frequency, .75, "sine", .014, index * .28, frequency * .75, .35)); },
      sutekichiNapSuccess: () => { sparkle([523,659,784,1047,1319,1568], 0, .02); tone(262, 1.1, "sine", .018, 0, 1047); },
      sutekichiNapFail: () => { tone(440, .32, "triangle", .018, 0, 220); tone(294, .4, "sine", .014, .16, 147); },
      businessCardDraw: () => { whoosh(1540, 390, .24, 0, -.38, .015); tone(1180, .18, "triangle", .014, .03, 1640, .35); },
      businessCardStrike: () => { [0,.055,.11].forEach((delay, index) => whoosh(2100 - index * 240, 260, .2, delay, index % 2 ? .45 : -.45, .017)); },
      closingTimeDash: () => { tone(72, .3, "sawtooth", .025, 0, 196, .24); noiseBurst(.22, .013, 860, .03, .32); },
      closingTimeRush: () => { whoosh(2300, 72, .4, 0, .35, .035); tone(96, .42, "sawtooth", .026, .02, 42, -.3); },
      angelWink: () => { sparkle([659,880,1175], 0, .014); tone(523, .5, "sine", .014, .05, 1047); },
      angelWinkLaunch: () => { sparkle([988,1319,1760,2093], 0, .017); whoosh(1680, 480, .42, .04, .42, .012); },
      approvalMeteorCharge: () => { tone(147, 1.45, "sine", .027, 0, 784); [392,523,659].forEach((frequency, index) => tone(frequency, .5, "triangle", .011, .24 + index * .18, frequency * 1.5)); },
      approvalMeteorFall: () => { whoosh(2500, 54, 1.1, 0, .3, .036); tone(330, 1.1, "sawtooth", .026, 0, 44); },
      charmed: () => { sparkle([784,1047,1319,1760], 0, .016); tone(523, .62, "sine", .014, .04, 988); },
      zone: () => { tone(147, .9, "sine", .026, 0, 1175); tone(294, .72, "triangle", .018, .08, 1760); sparkle([659,988,1319,1976], .18, .018); },
      miss: () => { noiseBurst(.13, .024, 2600); tone(1180, .16, "sine", .025, 0, 430); tone(560, .2, "triangle", .016, .035, 1040); },
      hit: () => { impact(false); crowdReaction(); },
      push: () => { whoosh(740, 64, .23, 0, -.45, .018); impact(true, .055, .35); },
      charge: () => { tone(135, .95, "sine", .025, 0, 980, -.28); tone(285, .82, "triangle", .016, .07, 1680, .3); noiseBurst(.62, .009, 1700, .12); },
      chargePeak: () => { tone(390, 1.55, "sine", .017, 0, 1880, -.36); tone(620, 1.3, "triangle", .012, .1, 2480, .4); sparkle([1047,1319,1760], .62, .007); },
      rayCharge: () => { tone(210, .82, "sine", .021, 0, 1180, -.32); tone(460, .7, "triangle", .013, .04, 1860, .32); noiseBurst(.42, .008, 2100, .2); },
      rayLock: () => { sparkle([880,1320,1760], 0, .014); tone(120, .3, "square", .013, .08, 70); },
      rayFire: () => { whoosh(2100, 105, .42, 0, -.58, .03); tone(720, .48, "square", .024, 0, 1820, .4); noiseBurst(.31, .022, 2400, .03, .62); },
      kissWindup: () => { tone(420, .62, "sine", .018, 0, 860); tone(630, .52, "triangle", .012, .08, 1260); },
      kissSparkle: () => sparkle([880,1175,1568], 0, .016),
      kissLaunch: () => { whoosh(1420, 420, .46, 0, -.52, .015); tone(1120, .5, "sine", .021, 0, 540, .45); sparkle([1680,1976], .04, .007); },
      kissHit: () => sparkle([740,988,1319,1760], 0, .017),
      kissBreak: () => { tone(920, .24, "triangle", .018, 0, 310); tone(620, .2, "square", .012, .08, 180); },
      etoileDraw: () => { tone(330, .8, "sine", .018, 0, 780); tone(495, .62, "triangle", .012, .08, 990); },
      etoileRaise: () => { sparkle([523,659,784,1047], 0, .014); whoosh(420, 1280, .65, .03, 0, .008); },
      etoileGlow: () => { tone(392, 1.05, "sine", .02, 0, 1568); tone(784, .88, "triangle", .016, .08, 2093); },
      orbitCharge: () => { tone(105, 1.25, "sawtooth", .026, 0, 360); tone(210, 1.1, "sine", .018, .08, 630); },
      orbitLaunch: () => { [360,290,230].forEach((frequency,index) => { tone(frequency,.44,"sawtooth",.022,index*.11,82,index%2 ? -.62 : .62); whoosh(760-index*100,72,.24,index*.11,index%2 ? -.52 : .52,.012); }); },
      meteorSummon: () => { tone(72, 1.8, "sawtooth", .035, 0, 210); tone(144, 1.55, "triangle", .018, .16, 520); },
      meteorFall: () => { tone(240, 1.45, "sawtooth", .034, 0, 48); tone(480, 1.1, "square", .015, .08, 92); },
      meteorCrash: () => { impact(true); impact(true, .115, -.35); noiseBurst(.58,.046,420,0,.45); tone(35, .95, "sine", .055, .04, 30); },
      grit: () => { tone(92, .7, "sawtooth", .045, 0, 440); [330,440,660].forEach((f,i) => tone(f,.45,"square",.024,.45+i*.13)); },
      awakening: () => { tone(58, 1.35, "sawtooth", .052, 0, 232); tone(116, 1.1, "square", .032, .18, 696); [392,523,659,784,1047].forEach((frequency,index) => tone(frequency,.5,"square",.028,.7+index*.11)); noiseBurst(.44,.045,1250); },
      bigHit: () => { impact(true); whoosh(1250, 78, .32, 0, .46, .021); crowdReaction(1.12); },
      critical: () => { impact(true); impact(false, .09, -.62); noiseBurst(.32, .037, 1300, 0, .58); sparkle([784,1047,1568,2093], .055, .018); crowdReaction(1.55); },
      victoryClimax: () => { noiseBurst(.34,.026,2400); tone(64,.62,"square",.045,0,38); tone(1480,.3,"sine",.018,.05,620); },
    };
    recipes[kind]?.();
  }

  function random(min, max) { return Math.random() * (max - min) + min; }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  setup();
})();
