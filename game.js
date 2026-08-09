(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

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
    opponentOptions: $$(".opponent-option"),
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
    prebattleEnemySprite: $("#prebattle-enemy-sprite"),
    prebattleEnemyName: $("#prebattle-enemy-name"),
    prebattleEnemyAbilities: $("#prebattle-enemy-abilities"),
    prebattleStatRows: $$("[data-fighter][data-stat]"),
    gameStartButton: $("#game-start-button"),
    enemyName: $("#enemy-name"),
    enemySubtitle: $("#enemy-subtitle"),
    enemyTechniquePanel: $("#enemy-technique-panel"),
  };
  const assetUrl = (source) => window.etokichiAssetUrl?.(source) ?? source;
  const actorImage = assetUrl;

  const HERO_IMAGES = {
    idle: actorImage("assets/etokichi/idle.webp"),
    battleIdle: actorImage("assets/etokichi/walk-right-2.webp"),
    galaxyCharge: actorImage("assets/etokichi/galaxy-charge.webp"),
    cast: actorImage("assets/etokichi/cast.webp"),
    galaxyRecoil: actorImage("assets/etokichi/galaxy-recoil.webp"),
    galaxyRayCast: actorImage("assets/etokichi/galaxy-ray-cast.webp"),
    punchCast: actorImage("assets/etokichi/punch-cast.webp"),
    starRingCast: actorImage("assets/etokichi/star-ring-cast.webp"),
    pentagramNovaWindup: actorImage("assets/etokichi/pentagram-nova-windup.webp"),
    pentagramNovaRush: actorImage("assets/etokichi/pentagram-nova-rush.webp"),
    pentagramNovaDive: actorImage("assets/etokichi/pentagram-nova-dive.webp"),
    etoileDriveCast: actorImage("assets/etokichi/etoile-drive-cast.webp"),
    throwKissCast: actorImage("assets/etokichi/throw-kiss-cast.webp"),
    statusSerenity: actorImage("assets/etokichi/status-serenity.webp"),
    victoryClimax: actorImage("assets/etokichi/victory-climax.webp"),
    walk: ["walk-right-1", "walk-right-2", "walk-right-3"].map((name) => actorImage(`assets/etokichi/${name}.webp`)),
    defeat: actorImage("assets/etokichi/defeat.webp"),
  };

  const techniques = [
    { id: "punch", icon: "punch", name: "エトキチパンチ", cost: 16, power: 90, accuracy: 91, critical: 8, range: 0, duration: 2200, cameraReleaseDelay: 820, impactDelay: 1250, kind: "strike", animation: "physicalPunch", attackStat: "power", gutsDamage: 0 },
    { id: "pentagramNova", icon: "pentagramNova", name: "エトキチ・ペンタグラムノヴァ", cardName: "ペンタグラムノヴァ", cost: 62, power: 380, accuracy: 55, critical: 32, range: 0, duration: 6500, cameraReleaseDelay: 1120, impactDelay: 5200, kind: "super", animation: "pentagramNova", attackStat: "power", gutsDamage: 26, knockback: 70 },
    { id: "starRing", icon: "starRing", name: "スターリング", cost: 24, power: 124, accuracy: 81, critical: 16, range: 1, duration: 2700, cameraReleaseDelay: 880, impactDelay: 1650, kind: "strike", animation: "physicalStarRing", attackStat: "power", gutsDamage: 12 },
    { id: "etoileDrive", icon: "etoileDrive", name: "エトワール・ドライブ", cost: 32, power: 0, accuracy: 100, critical: 0, range: 1, duration: 3400, kind: "support", animation: "etoileDrive", attackStat: "intelligence", gutsDamage: 0 },
    { id: "galaxyRay", icon: "galaxyRay", name: "ギャラクシーレイ", cost: 32, power: 172, accuracy: 71, critical: 12, range: 2, duration: 2800, cameraReleaseDelay: 1210, impactDelay: 1900, kind: "shot", animation: "galaxyRay", attackStat: "intelligence", gutsDamage: 5 },
    { id: "galaxyFlash", icon: "galaxyFlash", name: "エトキチギャラクシーフラッシュ", cardName: "ギャラクシーフラッシュ", cost: 48, power: 292, accuracy: 62, critical: 24, range: 3, duration: 4600, cameraReleaseDelay: 2700, kind: "special", attackStat: "intelligence", gutsDamage: 18, knockback: 35 },
    { id: "throwKiss", icon: "throwKiss", name: "投げキッス", cost: 20, power: 46, accuracy: 93, critical: 5, range: 2, duration: 2800, cameraReleaseDelay: 950, impactDelay: 1850, kind: "shot", animation: "throwKiss", attackStat: "intelligence", gutsDamage: 32 },
  ];

  const heroTechniqueIcons = {
    punch: '<path d="M11 23v-8a4 4 0 018 0v5-9a4 4 0 018 0v9-7a4 4 0 018 0v9-5a4 4 0 018 0v12c0 10-7 16-16 16-10 0-17-7-17-16v-6a4 4 0 017-3z"/>',
    pentagramNova: '<ellipse cx="24" cy="24" rx="21" ry="8" fill="none" stroke="currentColor" stroke-width="3" transform="rotate(-17 24 24)"/><path d="M24 4l4.7 13.5H43l-11.5 8.2L36 40 24 31.4 12 40l4.5-14.3L5 17.5h14.3L24 4z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="24" r="3"/>',
    starRing: '<ellipse cx="24" cy="25" rx="19" ry="9" fill="none" stroke="currentColor" stroke-width="5" transform="rotate(-15 24 25)"/><path d="M25 5l2.4 8.1 8.1 2.4-8.1 2.4L25 26l-2.4-8.1-8.1-2.4 8.1-2.4L25 5z"/>',
    etoileDrive: '<rect x="9" y="4" width="30" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><path d="M24 9l3.2 9.8L37 22l-9.8 3.2L24 35l-3.2-9.8L11 22l9.8-3.2L24 9z"/><path d="M14 9h4M30 9h4M14 39h4M30 39h4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    galaxyRay: '<path d="M7 38L32 13l5 5-25 25z"/><path d="M35 3l2.2 7.8L45 13l-7.8 2.2L35 23l-2.2-7.8L25 13l7.8-2.2L35 3z"/>',
    galaxyFlash: '<path d="M24 3l4.2 14.8L43 22l-14.8 4.2L24 41l-4.2-14.8L5 22l14.8-4.2L24 3z"/><path d="M8 6l2.1 6.9L17 15l-6.9 2.1L8 24l-2.1-6.9L-1 15l6.9-2.1L8 6zm33 20l1.7 5.3L48 33l-5.3 1.7L41 40l-1.7-5.3L34 33l5.3-1.7L41 26z"/>',
    throwKiss: '<path d="M24 13c-5-8-16-5-16 4 0 8 9 14 16 20 7-6 16-12 16-20 0-9-11-12-16-4z"/><path d="M5 39c7-7 13-8 19-4-5 7-12 9-19 4zm0 0c7 3 13 3 19-4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  };

  const ENEMY_PROFILES = {
    kuroboshi: {
      name: "クロボシ",
      subtitle: "VOID METEOR",
      abilitiesLabel: "本気・余裕・嫉妬",
      images: {
        idle: actorImage("assets/enemies/kuroboshi/idle.webp"),
        darkOrbitCast: actorImage("assets/enemies/kuroboshi/dark-orbit-cast.webp"),
        blackMeteorCast: actorImage("assets/enemies/kuroboshi/black-meteor-cast.webp"),
        meteorClawCast: actorImage("assets/enemies/kuroboshi/meteor-claw-cast.webp"),
        crescentHornCast: actorImage("assets/enemies/kuroboshi/crescent-horn-cast.webp"),
        statusEase: actorImage("assets/enemies/kuroboshi/status-ease.webp"),
        statusInspiration: actorImage("assets/enemies/kuroboshi/status-ease.webp"),
        victoryClimax: actorImage("assets/enemies/kuroboshi/victory-climax.webp"),
      },
      introPoseKeys: ["idle", "meteorClawCast", "idle", "crescentHornCast"],
      versusPoseKey: "crescentHornCast",
      stats: { life: 625, power: 520, defense: 500, accuracy: 420, evasion: 350, intelligence: 420, gutsRegen: 2.5 },
      abilities: ["real", "ease", "jealousy"],
      techniques: [
        { name: "メテオクロー", cost: 16, power: 82, accuracy: 88, critical: 10, range: 0, duration: 2300, cameraReleaseDelay: 850, impactDelay: 1350, kind: "strike", animation: "physicalMeteorClaw", attackStat: "power", gutsDamage: 0 },
        { name: "クレセントホーン", cost: 23, power: 118, accuracy: 78, critical: 18, range: 1, duration: 2900, cameraReleaseDelay: 940, impactDelay: 1800, kind: "strike", animation: "physicalCrescentHorn", attackStat: "power", gutsDamage: 8 },
        { name: "ダークオービット", cost: 30, power: 154, accuracy: 69, critical: 14, range: 2, duration: 3200, cameraReleaseDelay: 1100, impactDelay: 2200, kind: "shot", animation: "darkOrbit", attackStat: "intelligence", gutsDamage: 14 },
        { name: "ブラックメテオ", cost: 43, power: 230, accuracy: 59, critical: 25, range: 3, duration: 4200, cameraReleaseDelay: 1200, impactDelay: 3000, kind: "shot", animation: "blackMeteor", attackStat: "intelligence", gutsDamage: 0 },
      ],
      icons: [
        '<path d="M8 11c9 8 18 9 31 8M5 23c11 7 20 7 35 4M8 36c10 4 18 2 30-2" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
        '<path d="M39 5C20 10 10 24 14 43c4-10 11-16 21-19-6-4-5-11 4-19z"/>',
        '<circle cx="24" cy="24" r="9"/><ellipse cx="24" cy="24" rx="21" ry="8" fill="none" stroke="currentColor" stroke-width="4" transform="rotate(-18 24 24)"/><circle cx="41" cy="16" r="3"/>',
        '<path d="M7 9l18 11-7 7L7 9zm3 18l12 4-5 5-7-9z"/><circle cx="32" cy="31" r="12"/>',
      ],
    },
    sutekichi: {
      name: "ステキチ",
      subtitle: "STELLAR GUIDE",
      abilitiesLabel: "ひらめき・余裕",
      images: {
        idle: actorImage("assets/enemies/sutekichi/idle.webp"),
        stellaSearchCast: actorImage("assets/enemies/sutekichi/stella-search-cast.webp"),
        discoveryCometCast: actorImage("assets/enemies/sutekichi/discovery-comet-cast.webp"),
        starTouchCast: actorImage("assets/enemies/sutekichi/star-touch-cast.webp"),
        haloSkipCast: actorImage("assets/enemies/sutekichi/halo-skip-cast.webp"),
        napCast: actorImage("assets/enemies/sutekichi/nap-cast.webp"),
        statusEase: actorImage("assets/enemies/sutekichi/status-inspiration.webp"),
        statusInspiration: actorImage("assets/enemies/sutekichi/status-inspiration.webp"),
        victoryClimax: actorImage("assets/enemies/sutekichi/victory-climax.webp"),
      },
      introPoseKeys: ["idle", "starTouchCast", "idle", "haloSkipCast"],
      versusPoseKey: "haloSkipCast",
      stats: { life: 430, power: 330, defense: 300, accuracy: 620, evasion: 780, intelligence: 620, gutsRegen: 5.4 },
      abilities: ["inspiration", "ease"],
      techniques: [
        { name: "スターダストタッチ", cost: 15, power: 68, accuracy: 94, critical: 8, range: 0, duration: 2300, cameraReleaseDelay: 850, impactDelay: 1350, kind: "strike", animation: "sutekichiStarTouch", attackStat: "power", gutsDamage: 8 },
        { name: "ハロースキップ", cost: 22, power: 108, accuracy: 84, critical: 14, range: 1, duration: 2900, cameraReleaseDelay: 940, impactDelay: 1800, kind: "strike", animation: "sutekichiHaloSkip", attackStat: "power", gutsDamage: 12 },
        { name: "ステラサーチ", cost: 29, power: 142, accuracy: 78, critical: 10, range: 2, duration: 3200, cameraReleaseDelay: 1100, impactDelay: 2200, kind: "shot", animation: "sutekichiStellaSearch", attackStat: "intelligence", gutsDamage: 20 },
        { name: "ディスカバリー・コメット", cost: 46, power: 248, accuracy: 60, critical: 22, range: 3, duration: 4200, cameraReleaseDelay: 1200, impactDelay: 3000, kind: "shot", animation: "sutekichiDiscoveryComet", attackStat: "intelligence", gutsDamage: 10 },
        { name: "おひるね", cost: 55, power: 0, accuracy: 65, critical: 0, range: 3, duration: 4500, cameraReleaseDelay: 1100, impactDelay: 3000, kind: "support", animation: "sutekichiNap", attackStat: "intelligence", healFull: true, successChance: 65 },
      ],
      icons: [
        '<path d="M24 19l2.4 6.7h7l-5.6 4.1 2.1 6.7-5.9-4-5.9 4 2.1-6.7-5.6-4.1h7L24 19z"/><circle cx="14" cy="15" r="4"/><circle cx="23" cy="11" r="4"/><circle cx="33" cy="15" r="4"/>',
        '<ellipse cx="24" cy="15" rx="18" ry="7" fill="none" stroke="currentColor" stroke-width="4" transform="rotate(-12 24 15)"/><path d="M12 34c8-10 17-12 25-8l-8 3 7 6c-9 4-17 3-24-1z"/><path d="M40 7l1.5 4.5L46 13l-4.5 1.5L40 19l-1.5-4.5L34 13l4.5-1.5L40 7z"/>',
        '<rect x="8" y="5" width="27" height="38" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="21.5" cy="24" r="8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M21.5 11v6m0 14v6M9 24h6m13 0h12M36 17l5-5m-5 19l5 5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
        '<path d="M32 5l3.4 10.6L46 19l-10.6 3.4L32 33l-3.4-10.6L18 19l10.6-3.4L32 5z"/><path d="M5 38c7-10 13-14 20-16M8 43c6-8 10-11 16-14" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
        '<path d="M27 7c-9 3-14 12-11 21 3 8 12 12 21 8-6 0-12-4-14-10-2-7 0-14 4-19z"/><path d="M7 34h27v9H7z"/><path d="M35 8h8l-8 7h8l-8 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
      ],
    },
  };

  let selectedEnemyId = "kuroboshi";
  let activeEnemy = ENEMY_PROFILES[selectedEnemyId];
  let ENEMY_IMAGES = activeEnemy.images;
  let enemyTechniques = activeEnemy.techniques;

  const fighterStats = {
    hero: { life: 500, power: 410, defense: 420, accuracy: 480, evasion: 430, intelligence: 560, gutsRegen: 2.7 },
    enemy: { ...activeEnemy.stats },
  };
  const fighterAbilities = {
    hero: ["power", "grit", "ease", "serenity", "awakening"],
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
  };
  const SPECIAL_ACTION_CLASSES = ["special-action", "special-action-power", "special-action-grit", "special-action-ease", "special-action-real", "special-action-jealousy", "special-action-serenity", "special-action-awakening", "special-action-etoile", "special-action-inspiration"];
  const SPECIAL_TRIGGER_CHANCES = { awakening: .25, grit: .5, jealousy: .5, easeSecondDodge: .5, easeThirdDodge: .75 };
  const keys = { left: false, right: false };
  const HERO_MAX_HP = fighterStats.hero.life;
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
  const entranceMusic = new Audio(assetUrl("assets/audio/arena-overture-intro.mp3"));
  entranceMusic.loop = false;
  entranceMusic.preload = "auto";
  entranceMusic.volume = 0;
  const battleMusic = new Audio(assetUrl("assets/audio/ceremonial-colosseum.mp3"));
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
      heroWalkFrame: 0,
      heroWalkFrameAt: 0,
      heroTechniqueSelection: [0, 0, 0, 0],
      enemyTechniqueSelection: [0, 0, 0, 0],
      galaxyBeamY: null,
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
      triggered: { power: false, grit: false, ease: false, real: false, jealousy: false, serenity: false, awakening: false, inspiration: false },
      awakeningChecked: false,
      hitStreak: 0,
      dodgeStreak: 0,
      observedRanges: new Set(),
      realExhausted: false,
      serenityReadySince: 0,
    };
  }

  function applyEnemyProfile(enemyId) {
    const profile = ENEMY_PROFILES[enemyId];
    if (!profile) return;
    selectedEnemyId = enemyId;
    activeEnemy = profile;
    ENEMY_IMAGES = profile.images;
    enemyTechniques = profile.techniques;
    fighterStats.enemy = { ...profile.stats };
    fighterAbilities.enemy = [...profile.abilities];
    ENEMY_MAX_HP = profile.stats.life;
    refs.arena.dataset.enemyId = enemyId;
    refs.enemyName.textContent = profile.name;
    refs.enemySubtitle.textContent = profile.subtitle;
    refs.enemyHp.textContent = profile.stats.life;
    if (state && ["title", "titleTransition", "opponentSelect", "intro", "ready"].includes(state.phase)) state.enemyHp = profile.stats.life;
    refs.enemySprite.src = profile.images.idle;
    refs.enemySprite.alt = profile.name;
    refs.enemySpecials.setAttribute("aria-label", `${profile.name}の状態変化`);
    refs.prebattleEnemySprite.src = profile.images.idle;
    refs.prebattleEnemySprite.alt = `ファイティングポーズを取る${profile.name}`;
    refs.prebattleEnemyName.textContent = profile.name;
    refs.prebattleEnemyAbilities.textContent = profile.abilitiesLabel;
    refs.enemyTechniquePanel.setAttribute("aria-label", `${profile.name}の距離別技`);
    refs.opponentOptions.forEach((option) => {
      const selected = option.dataset.enemyId === enemyId;
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-checked", String(selected));
    });
    refs.enemyTechniques.forEach((item, index) => {
      const choices = profile.techniques.filter((technique) => technique.range === index);
      const technique = choices[0];
      const stack = item.closest(".enemy-technique-stack");
      stack.hidden = !technique;
      if (!technique) return;
      item.querySelector(".technique-name").textContent = technique.name;
      const icon = item.querySelector(".technique-icon svg");
      icon.removeAttribute("fill");
      icon.innerHTML = profile.icons[profile.techniques.indexOf(technique)];
      const cycle = stack.querySelector(".enemy-technique-cycle");
      if (cycle) {
        cycle.hidden = choices.length < 2;
        stack.classList.toggle("has-multiple", choices.length > 1);
      }
    });
    refs.enemyTechniqueCycleDotGroups.forEach((group) => {
      const range = Number(group.dataset.enemyCycleRange);
      const choices = profile.techniques.filter((technique) => technique.range === range);
      group.replaceChildren(...choices.map(() => document.createElement("i")));
      group.firstElementChild?.classList.add("active");
    });
    if (state) state.enemyTechniqueSelection = [0, 0, 0, 0];
    Object.values(profile.images).forEach((src) => { const image = new Image(); image.src = src; });
    renderPrebattleStats(1);
  }

  function setup() {
    applyEnemyProfile(selectedEnemyId);
    state = freshState();
    state.phase = "title";
    const enemySources = Object.values(ENEMY_PROFILES).flatMap((profile) => Object.values(profile.images));
    [...Object.values(HERO_IMAGES).flat(), ...enemySources].forEach((src) => { const image = new Image(); image.src = src; });
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
      refs.prebattleHeroSprite.src = HERO_IMAGES.battleIdle;
      refs.prebattleEnemySprite.src = ENEMY_IMAGES[activeEnemy.versusPoseKey];
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
    const frames = side === "hero"
      ? [HERO_IMAGES.battleIdle, HERO_IMAGES.punchCast, HERO_IMAGES.battleIdle, HERO_IMAGES.starRingCast]
      : activeEnemy.introPoseKeys.map((key) => ENEMY_IMAGES[key]);
    const startedAt = performance.now();
    const changeFrame = () => {
      if (token !== prebattleIntroToken || performance.now() - startedAt >= duration) return;
      const frameIndex = Math.floor((performance.now() - startedAt) / 430) % frames.length;
      sprite.src = frames[frameIndex];
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
    refs.opponentOptions.forEach((option) => option.addEventListener("click", () => applyEnemyProfile(option.dataset.enemyId)));
    refs.opponentConfirmButton.addEventListener("click", confirmOpponentSelection);
    refs.startButton.addEventListener("click", startBattle);
    refs.retryButton.addEventListener("click", startBattle);
    refs.attackButton.addEventListener("click", useCurrentTechnique);
    refs.pushButton.addEventListener("click", pushEnemy);
    refs.techniques.forEach((button) => button.addEventListener("click", () => useTechnique(getSelectedTechnique(Number(button.dataset.range)))));
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
      if (/^Digit[1-4]$/.test(event.code)) useTechnique(getSelectedTechnique(Number(event.code.at(-1)) - 1));
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
    refs.arena.classList.remove("battle-ending", "victory-climax", "victory-hero", "victory-enemy", "camera-hero", "camera-enemy", "camera-track-release", "push-camera", "push-camera-hero", "push-camera-enemy");
    refs.arena.style.removeProperty("--victory-focus-x");
    refs.hero.className = "combatant hero";
    refs.enemy.className = "combatant enemy";
    refs.heroSprite.src = HERO_IMAGES.idle;
    refs.enemySprite.src = ENEMY_IMAGES.idle;
    refs.enemySprite.style.removeProperty("filter");
    refs.effects.replaceChildren();
    updateUI();
    announce("READY");
    sound("ready");
    setTimeout(() => {
      if (state.phase !== "countdown") return;
      state.phase = "battle";
      transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.battleIdle);
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

    const heroFree = now >= state.heroBusyUntil && now >= state.actionLockUntil;
    let heroDirection = 0;
    if (heroFree) heroDirection = Number(keys.right) - Number(keys.left);
    moveHero(heroDirection, delta);
    setMovementClass(refs.hero, heroDirection, true);

    updateAI(now, delta);

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
    if (now < state.enemyBusyUntil || now < state.actionLockUntil) {
      setMovementClass(refs.enemy, 0, false);
      return;
    }
    if (now < state.aiIdleUntil) {
      state.aiDirection = 0;
      setMovementClass(refs.enemy, 0, false);
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
        const attack = canNap && Math.random() < .68
          ? napTechnique
          : affordableAttacks[Math.floor(Math.random() * affordableAttacks.length)];
        const canAttack = Boolean(attack);
        const brave = state.enemyHp < 300 || state.time < 12;
        const attackReady = now >= state.aiAttackReadyAt && now >= state.aiAttackCooldownUntil;
        const attackChance = brave ? .58 : .32;

        if (canAttack && attackReady && Math.random() < attackChance) {
          state.aiAttackCooldownUntil = now + random(1500, 3400);
          enemyAttack(attack, now);
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
          setMovementClass(refs.enemy, 0, false);
          return;
        }

        const preferred = wantsNap ? napTechnique.range : state.enemyGuts > 52 ? (Math.random() < .48 ? 2 : 3) : (Math.random() < .65 ? 1 : 2);
        if (behaviorRoll > .84) state.aiDirection = Math.random() < .5 ? -1 : 1;
        else state.aiDirection = range < preferred ? 1 : range > preferred ? -1 : (Math.random() < .5 ? -1 : 1);
      }
    }

    if (state.aiDirection !== 0) {
      moveEnemy(state.aiDirection, delta);
      setMovementClass(refs.enemy, state.aiDirection, false);
    } else {
      setMovementClass(refs.enemy, 0, false);
    }
  }

  function setMovementClass(element, direction, isHero) {
    if (element.classList.contains("attack-light") || element.classList.contains("casting") || element.classList.contains("hurt") || element.classList.contains("dodging") || element.classList.contains("special-action")) return;
    element.classList.toggle("moving-forward", direction === (isHero ? 1 : -1));
    element.classList.toggle("moving-back", direction === (isHero ? -1 : 1));
    if (!isHero) return;
    if (direction === 0) {
      stopHeroWalk();
      return;
    }
    const now = performance.now();
    element.classList.add("hero-walking");
    element.classList.toggle("walk-facing-left", direction < 0);
    if (now >= state.heroWalkFrameAt) {
      refs.heroSprite.src = HERO_IMAGES.walk[state.heroWalkFrame];
      state.heroWalkFrame = (state.heroWalkFrame + 1) % HERO_IMAGES.walk.length;
      state.heroWalkFrameAt = now + 110;
    }
  }

  function stopHeroWalk() {
    refs.hero.classList.remove("hero-walking", "walk-facing-left", "moving-forward", "moving-back");
    state.heroWalkFrameAt = 0;
  }

  function transitionTechniqueSprite(sprite, nextSource, duration = 210) {
    if (!sprite || sprite.getAttribute("src") === nextSource) return;
    if (window.etokichiRenderer?.handlesFighters) {
      sprite.src = nextSource;
      return;
    }
    const combatant = sprite.closest(".combatant");
    if (!combatant || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sprite.src = nextSource;
      return;
    }

    combatant.querySelectorAll(".sprite-transition-ghost").forEach((ghost) => ghost.remove());
    const computed = getComputedStyle(sprite);
    const ghost = document.createElement("img");
    ghost.src = sprite.currentSrc || sprite.src;
    ghost.alt = "";
    ghost.className = "sprite-transition-ghost";
    ghost.style.transform = computed.transform === "none" ? "" : computed.transform;
    ghost.style.filter = computed.filter === "none" ? "drop-shadow(0 12px 12px rgba(0,0,0,.38))" : computed.filter;
    combatant.append(ghost);

    sprite.src = nextSource;
    sprite.animate([
      { opacity: .08, filter: "brightness(2.15) blur(5px) drop-shadow(0 0 18px rgba(255,255,255,.72))" },
      { opacity: 1, filter: "brightness(1) blur(0) drop-shadow(0 12px 12px rgba(0,0,0,.38))" },
    ], { duration, easing: "cubic-bezier(.16,.82,.22,1)" });

    const outgoing = ghost.animate([
      { opacity: .82, filter: `${ghost.style.filter} brightness(1.25)` },
      { opacity: 0, filter: "brightness(1.9) blur(7px) drop-shadow(0 0 20px rgba(255,255,255,.58))" },
    ], { duration: duration + 90, easing: "ease-out", fill: "forwards" });
    outgoing.finished.catch(() => {}).finally(() => ghost.remove());
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

  function useCurrentTechnique() { useTechnique(getSelectedTechnique(getRange())); }

  function useTechnique(technique) {
    const now = performance.now();
    if (state.phase !== "battle" || now < state.heroBusyUntil || now < state.actionLockUntil) return;
    const range = getRange();
    if (!technique || technique.range !== range) {
      popStatus(refs.hero, "間合い外");
      sound("deny");
      return;
    }
    const actionCost = getTechniqueCost(technique, "hero");
    if (state.heroGuts < actionCost) {
      popStatus(refs.hero, "ガッツ不足");
      sound("deny");
      return;
    }
    if (technique.animation === "etoileDrive") {
      useEtoileDrive(technique, now, actionCost);
      return;
    }

    const actionGuts = state.heroGuts;
    const serenityAttack = isSpecialActive("hero", "serenity");
    const impactDelay = technique.impactDelay ?? (technique.kind === "special" ? 3150 : technique.kind === "shot" ? 390 : 250);
    beginTechniqueResolution("hero", serenityAttack);
    stopHeroWalk();
    state.heroGuts -= actionCost;
    state.heroBusyUntil = now + technique.duration;
    state.actionLockUntil = now + technique.duration;
    state.actionActor = "hero";
    startCamera("hero", technique.duration, technique.cameraReleaseDelay);
    const token = ++state.heroActionToken;
    const actionStartedAt = now;
    const isPentagramNova = technique.animation === "pentagramNova";
    let pentagramWillHit = null;
    let pentagramComboAnimation = null;
    let pentagramFinisherMotion = null;
    refs.hero.classList.remove("moving-forward", "moving-back");
    if (isPentagramNova) refs.hero.classList.add("pentagram-nova-sequence", "pentagram-nova-charge");
    else if (technique.kind === "special") refs.hero.classList.add("casting");
    else if (technique.animation === "galaxyRay") refs.hero.classList.add("galaxy-ray-sequence");
    else if (technique.animation === "throwKiss") refs.hero.classList.add("throw-kiss-sequence");
    else if (technique.animation === "physicalPunch") refs.hero.classList.add("physical-punch-sequence");
    else if (technique.animation === "physicalStarRing") refs.hero.classList.add("star-ring-sequence");
    else refs.hero.classList.add("attack-light");
    announceTechnique(technique.name, technique.kind === "special" || technique.kind === "super");
    sound(isPentagramNova ? "novaCharge" : technique.kind === "special" ? "charge" : technique.animation === "galaxyRay" ? "rayCharge" : technique.animation === "throwKiss" ? "kissWindup" : technique.animation?.startsWith("physical") ? "physicalWindup" : "swing");

    if (isPentagramNova) {
      refs.arena.classList.add("pentagram-nova-mode");
      transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.pentagramNovaWindup, 280);
      createPentagramNovaCharge();
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        refs.hero.classList.remove("pentagram-nova-charge");
        refs.hero.classList.add("pentagram-nova-rush");
        transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.pentagramNovaRush, 230);
        createPentagramNovaRush();
        sound("novaRush");
      }, 1120);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        const hitChance = serenityAttack ? 99 : calculateHitChance(technique, actionGuts, true);
        pentagramWillHit = Math.random() * 100 < hitChance;
        if (!pentagramWillHit) {
          refs.hero.classList.add("pentagram-nova-miss");
          refs.arena.classList.add("pentagram-nova-missed");
          resolveHit("hero", technique, actionGuts, serenityAttack, false);
          state.heroBusyUntil = actionStartedAt + 3300;
          state.actionLockUntil = actionStartedAt + 3300;
          setTimeout(() => {
            if (token !== state.heroActionToken) return;
            refs.hero.classList.remove("pentagram-nova-sequence", "pentagram-nova-rush", "pentagram-nova-miss");
            refs.arena.classList.remove("pentagram-nova-mode", "pentagram-nova-missed", "camera-hero", "camera-track-release");
            if (state.phase === "battle") transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.battleIdle, 260);
          }, 1700);
          return;
        }
        refs.hero.classList.add("pentagram-nova-combo");
        refs.enemy.classList.add("nova-captured");
        createPentagramNovaCapture();
        pentagramComboAnimation = startPentagramNovaCombo();
        sound("novaCapture");
      }, 1600);
      [1700, 2050, 2440, 2830, 3220].forEach((delay, index) => {
        setTimeout(() => {
          if (state.phase !== "battle" || token !== state.heroActionToken || pentagramWillHit !== true) return;
          drawPentagramNovaTrailSegment(index);
        }, delay);
      });
      [2050, 2440, 2830, 3220, 3610].forEach((delay, index) => {
        setTimeout(() => {
          if (state.phase !== "battle" || token !== state.heroActionToken || pentagramWillHit !== true) return;
          createPentagramNovaStrike(index);
          sound("novaStrike");
        }, delay);
      });
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken || pentagramWillHit !== true) return;
        const comboEndPoint = getEffectPoint(refs.heroSprite, .5, .5);
        pentagramComboAnimation?.cancel();
        refs.hero.classList.remove("pentagram-nova-rush", "pentagram-nova-combo");
        refs.hero.classList.add("pentagram-nova-finisher");
        transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.pentagramNovaDive, 260);
        pentagramFinisherMotion = startPentagramNovaFinisherRise(comboEndPoint);
        createPentagramNovaUppercut(pentagramFinisherMotion);
        sound("novaRise");
      }, 4080);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken || pentagramWillHit !== true) return;
        refs.hero.classList.add("pentagram-nova-diving");
        pentagramFinisherMotion = startPentagramNovaFinisherDive(pentagramFinisherMotion);
        createPentagramNovaDive(pentagramFinisherMotion?.enemyGroundTarget);
        sound("novaDive");
      }, 4650);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken || pentagramWillHit !== true) return;
        refs.enemy.classList.remove("nova-captured");
        void refs.enemy.offsetWidth;
        const outcome = resolveHit("hero", technique, actionGuts, serenityAttack, true);
        createPentagramNovaImpact(Boolean(outcome?.critical));
      }, technique.impactDelay);
    } else if (technique.kind === "special") {
      refs.hero.classList.add("ultimate-sequence");
      transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.battleIdle);
      refs.arena.classList.add("special-mode");
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.galaxyCharge, 260);
        createGalaxyCharge();
        sound("chargePeak");
      }, 500);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.cast, 260);
      }, 1750);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        createGalaxyFlash();
      }, 2700);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.galaxyRecoil, 240);
      }, 3500);
    } else if (technique.animation === "galaxyRay") {
      transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.battleIdle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.galaxyCharge, 230);
        createGalaxyRayCharge();
      }, 260);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.galaxyRayCast, 240);
        refs.hero.classList.add("galaxy-ray-aiming");
        sound("rayLock");
      }, 820);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        createGalaxyRay();
        sound("rayFire");
      }, 1210);
      setTimeout(() => {
        if (token !== state.heroActionToken) return;
        refs.hero.classList.add("galaxy-ray-recoil");
      }, 1900);
    } else if (technique.animation === "throwKiss") {
      transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.battleIdle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.throwKissCast, 240);
      }, 300);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        createKissCharge();
        sound("kissSparkle");
      }, 560);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        createThrowingKiss();
        refs.hero.classList.add("throw-kiss-release");
        sound("kissLaunch");
      }, 950);
      setTimeout(() => {
        if (token !== state.heroActionToken) return;
        refs.hero.classList.add("throw-kiss-recovery");
      }, 2050);
      setTimeout(() => {
        if (token !== state.heroActionToken) return;
        transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.battleIdle, 240);
      }, 2320);
    } else if (technique.animation === "physicalPunch") {
      transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.battleIdle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        createPhysicalDust("hero", "gold");
      }, 240);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.punchCast, 220);
      }, 500);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        createPunchTrail();
        sound("punchRush");
      }, 820);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        createPhysicalContact(true, "punch");
        sound("physicalContact");
      }, 1180);
    } else if (technique.animation === "physicalStarRing") {
      transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.battleIdle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        createPhysicalDust("hero", "gold");
      }, 260);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.starRingCast, 230);
      }, 540);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        createStarRingSweep();
        sound("ringWhip");
      }, 880);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        createPhysicalContact(true, "ring");
        sound("physicalContact");
      }, 1560);
    }

    if (technique.kind === "shot" && !technique.animation) createProjectile(false);

    if (!isPentagramNova) {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.heroActionToken) return;
        resolveHit("hero", technique, actionGuts, serenityAttack);
      }, impactDelay);
    }

    setTimeout(() => {
      if (token !== state.heroActionToken) return;
      pentagramComboAnimation?.cancel();
      pentagramFinisherMotion?.animation?.cancel();
      refs.hero.classList.remove("attack-light", "casting", "ultimate-sequence", "galaxy-ray-sequence", "galaxy-ray-aiming", "galaxy-ray-recoil", "throw-kiss-sequence", "throw-kiss-release", "throw-kiss-recovery", "physical-punch-sequence", "star-ring-sequence", "pentagram-nova-sequence", "pentagram-nova-charge", "pentagram-nova-rush", "pentagram-nova-combo", "pentagram-nova-finisher", "pentagram-nova-diving", "pentagram-nova-miss");
      refs.enemy.classList.remove("nova-captured");
      refs.arena.classList.remove("special-mode", "pentagram-nova-mode", "pentagram-nova-missed", "nova-hit-pulse", "impact-freeze");
      if (state.phase === "battle") transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.battleIdle, 240);
    }, technique.duration);
  }

  function useEtoileDrive(technique, now, actionCost) {
    if (isSpecialActive("hero", "etoile")) {
      popStatus(refs.hero, "星纏 発動中");
      sound("deny");
      return;
    }
    stopHeroWalk();
    state.heroGuts -= actionCost;
    state.heroBusyUntil = now + technique.duration;
    state.actionLockUntil = now + technique.duration;
    state.actionActor = "hero";
    startCamera("hero", technique.duration);
    const token = ++state.heroActionToken;
    refs.hero.classList.remove("moving-forward", "moving-back");
    refs.hero.classList.add("etoile-drive-sequence");
    transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.battleIdle);
    announceTechnique(technique.name, true);
    createEtoileDriveEffect(technique.duration);
    sound("etoileDraw");

    setTimeout(() => {
      if (state.phase !== "battle" || token !== state.heroActionToken) return;
      transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.etoileDriveCast, 250);
      sound("etoileRaise");
    }, 360);
    setTimeout(() => {
      if (state.phase !== "battle" || token !== state.heroActionToken) return;
      refs.hero.classList.add("etoile-drive-peak");
      sound("etoileGlow");
    }, 2050);
    setTimeout(() => {
      if (state.phase !== "battle" || token !== state.heroActionToken) return;
      activateEtoileDrive();
      refs.hero.classList.remove("etoile-drive-sequence", "etoile-drive-peak");
      transitionTechniqueSprite(refs.heroSprite, HERO_IMAGES.battleIdle, 260);
    }, technique.duration);
  }

  function activateEtoileDrive() {
    const meta = battleSpecialMeta.etoile;
    state.specials.hero.activeUntil.etoile = performance.now() + meta.effectDuration;
    refs.hero.classList.add(meta.cssClass);
    state.actionLockUntil = Math.max(state.actionLockUntil, performance.now() + meta.animationDuration + SPECIAL_POST_PAUSE);
    startSpecialCamera("hero", "etoile", meta.animationDuration);
    showBattleSpecialBanner("hero", "etoile", meta);
  }

  function enemyAttack(technique, now) {
    const actionGuts = state.enemyGuts;
    const rangeChoices = getEnemyTechniquesAtRange(technique.range);
    const selectedIndex = rangeChoices.indexOf(technique);
    if (selectedIndex >= 0) state.enemyTechniqueSelection[technique.range] = selectedIndex;
    const serenityAttack = technique.kind !== "support" && isSpecialActive("enemy", "serenity");
    const impactDelay = technique.impactDelay ?? (technique.kind === "shot" ? 420 : 270);
    beginTechniqueResolution("enemy", serenityAttack);
    state.enemyGuts -= getTechniqueCost(technique, "enemy");
    state.enemyBusyUntil = now + technique.duration;
    state.actionLockUntil = now + technique.duration;
    state.actionActor = "enemy";
    startCamera("enemy", technique.duration, technique.cameraReleaseDelay);
    const token = ++state.enemyActionToken;
    refs.enemy.classList.remove("moving-forward", "moving-back");
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
    };
    refs.enemy.classList.add(animationClasses[technique.animation] ?? "attack-light");
    announceTechnique(technique.name, false, true);
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
    };
    sound(openingSounds[technique.animation] ?? (technique.kind === "shot" ? "enemyShot" : "enemySwing"));
    if (technique.kind === "shot" && !technique.animation) createProjectile(true);

    if (technique.animation === "darkOrbit") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.darkOrbitCast, 240);
        createDarkOrbitField();
      }, 260);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        createDarkOrbitVolley();
        sound("orbitLaunch");
      }, 1100);
      setTimeout(() => {
        if (token === state.enemyActionToken) refs.enemy.classList.add("technique-recoil");
      }, 2200);
    } else if (technique.animation === "blackMeteor") {
      refs.arena.classList.add("black-meteor-mode");
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.blackMeteorCast, 250);
        createBlackMeteorSky();
      }, 300);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        createBlackMeteor();
        sound("meteorFall");
      }, 1200);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        createBlackMeteorImpact();
        sound("meteorCrash");
      }, 2820);
      setTimeout(() => {
        if (token === state.enemyActionToken) refs.enemy.classList.add("technique-recoil");
      }, 3000);
    } else if (technique.animation === "physicalMeteorClaw") {
      transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.idle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        createPhysicalDust("enemy", "violet");
      }, 250);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.meteorClawCast, 220);
      }, 520);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        createMeteorClawTrail();
        sound("clawRush");
      }, 850);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        createPhysicalContact(false, "claw");
        sound("physicalContact");
      }, 1280);
    } else if (technique.animation === "physicalCrescentHorn") {
      transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.idle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        createPhysicalDust("enemy", "violet");
      }, 280);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.crescentHornCast, 230);
      }, 560);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        createCrescentHornRush();
        sound("hornRush");
      }, 940);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        createPhysicalContact(false, "horn");
        sound("physicalContact");
      }, 1710);
    } else if (technique.animation === "sutekichiStarTouch") {
      transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.idle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.starTouchCast, 210);
        createSutekichiStarTouchEffect();
      }, 430);
    } else if (technique.animation === "sutekichiHaloSkip") {
      transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.idle);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.haloSkipCast, 220);
        createSutekichiHaloSkipEffect();
      }, 500);
    } else if (technique.animation === "sutekichiStellaSearch") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.stellaSearchCast, 240);
        createSutekichiStellaSearchEffect();
      }, 300);
    } else if (technique.animation === "sutekichiDiscoveryComet") {
      refs.arena.classList.add("sutekichi-comet-mode");
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.discoveryCometCast, 240);
        createSutekichiCometCharge();
      }, 300);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        createSutekichiComet();
        sound("sutekichiCometFall");
      }, 1350);
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        createSutekichiCometImpact();
        sound("sutekichiCometImpact");
      }, 2850);
    } else if (technique.animation === "sutekichiNap") {
      setTimeout(() => {
        if (state.phase !== "battle" || token !== state.enemyActionToken) return;
        transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.napCast, 260);
        createSutekichiNapDream();
      }, 260);
    }

    setTimeout(() => {
      if (state.phase !== "battle" || token !== state.enemyActionToken) return;
      if (technique.animation === "sutekichiNap") resolveEnemyNap(technique, actionGuts);
      else resolveHit("enemy", technique, actionGuts, serenityAttack);
    }, impactDelay);
    setTimeout(() => {
      if (token !== state.enemyActionToken) return;
      refs.enemy.classList.remove("attack-light", "dark-orbit-sequence", "black-meteor-sequence", "meteor-claw-sequence", "crescent-horn-sequence", "sutekichi-star-touch-sequence", "sutekichi-halo-skip-sequence", "sutekichi-stella-search-sequence", "sutekichi-comet-sequence", "sutekichi-nap-sequence", "technique-recoil");
      refs.arena.classList.remove("black-meteor-mode", "sutekichi-comet-mode");
      if (state.phase === "battle") transitionTechniqueSprite(refs.enemySprite, ENEMY_IMAGES.idle, 240);
    }, technique.duration);
  }

  function resolveEnemyNap(technique, actionGuts) {
    try {
      const successChance = clamp(Math.round((technique.successChance ?? 65) + (actionGuts - 50) * .3), 25, 90);
      const success = Math.random() * 100 < successChance;
      createSutekichiNapResult(success);
      if (!success) {
        popStatus(refs.enemy, "おひるね失敗");
        sound("sutekichiNapFail");
        return;
      }
      const recovered = Math.max(0, ENEMY_MAX_HP - state.enemyHp);
      state.enemyHp = ENEMY_MAX_HP;
      popStatus(refs.enemy, `全回復 +${Math.ceil(recovered)}`);
      sound("sutekichiNapSuccess");
    } finally {
      completeTechniqueResolution();
    }
  }

  function resolveHit(attacker, technique, actionGuts, serenityAttack = false, forcedHit = null) {
    try {
    const heroAttacks = attacker === "hero";
    const defender = heroAttacks ? "enemy" : "hero";
    const target = heroAttacks ? refs.enemy : refs.hero;
    if (heroAttacks) recordEnemyObservation(technique.range);
    const hitChance = serenityAttack ? 99 : calculateHitChance(technique, actionGuts, heroAttacks);
    const hit = forcedHit ?? (Math.random() * 100 < hitChance);

    if (!hit) {
      resetHitStreak(attacker);
      recordDodge(defender);
      playDodge(target, defender);
      if (technique.animation === "throwKiss" && heroAttacks) createKissMissBreak();
      popStatus(target, "MISS");
      sound("miss");
      checkEaseTrigger(defender, "dodge");
      return { hit: false, critical: false, damage: 0, gutsDamage: 0 };
    }

    recordHit(attacker);
    resetDodgeStreak(defender);

    const attackerStats = fighterStats[heroAttacks ? "hero" : "enemy"];
    const defenderStats = fighterStats[heroAttacks ? "enemy" : "hero"];
    const attackValue = attackerStats[technique.attackStat];
    const statScale = .8 + (attackValue / (attackValue + defenderStats.defense)) * .5;
    const variance = random(.9, 1.1);
    const lowLifeBoost = (heroAttacks ? state.heroHp : state.enemyHp) < 200 ? 1.14 : 1;
    let criticalChance = technique.critical + (isSpecialActive(attacker, "jealousy") ? 10 : 0);
    if (isSpecialActive(attacker, "awakening")) criticalChance = Math.min(99, criticalChance * 1.5);
    if (isSpecialActive(attacker, "etoile")) criticalChance += 20;
    criticalChance = Math.min(99, criticalChance);
    const critical = Math.random() * 100 < criticalChance;
    const criticalMultiplier = critical ? 1.5 : 1;
    const inspirationMultiplier = technique.attackStat === "intelligence" && isSpecialActive(attacker, "inspiration") ? 1.45 : 1;
    const damage = Math.round(technique.power * statScale * variance * lowLifeBoost * getDamageMultiplier(attacker, defender) * inspirationMultiplier * criticalMultiplier);
    const rolledGutsDamage = rollGutsDamage(technique, attacker, defender);
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
    if (isSpecialActive(defender, "ease")) deactivateBattleSpecial(defender, "ease");

    showDamage(target, damage, heroAttacks, gutsDamage, critical, technique.kind === "super");
    if (technique.animation === "throwKiss" && heroAttacks) {
      createKissBurst();
      sound("kissHit");
    }
    createImpact(heroAttacks, technique.kind === "special" && heroAttacks ? state.galaxyBeamY : null);
    if (technique.knockback) applyTechniqueKnockback(heroAttacks, technique.knockback, target);
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
      checkPostHitSpecials(attacker, defender);
    }
    return { hit: true, critical, damage, gutsDamage };
    } finally {
      completeTechniqueResolution();
    }
  }

  function pushEnemy() {
    const now = performance.now();
    if (state.phase !== "battle" || now < state.heroBusyUntil || now < state.actionLockUntil) return;
    if (getRange() !== 0) {
      popStatus(refs.hero, "接近時のみ");
      sound("deny");
      return;
    }
    stopHeroWalk();
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
    if (defender === "hero") stopHeroWalk();
    if (defender === "hero") state.heroX = Math.max(STAGE_MIN_X, state.heroX - DODGE_RETREAT_DISTANCE);
    else state.enemyX = Math.min(STAGE_MAX_X, state.enemyX + DODGE_RETREAT_DISTANCE);
    target.classList.remove("dodging", "dodge-left", "dodge-right");
    target.querySelectorAll(".dodge-afterimage").forEach((afterimage) => afterimage.remove());
    void target.offsetWidth;
    const direction = defender === "hero" ? "dodge-left" : "dodge-right";
    target.classList.add("dodging", direction);
    createDodgeAfterimages(target, direction);
    setTimeout(() => {
      target.classList.remove("dodging", "dodge-left", "dodge-right");
      target.querySelectorAll(".dodge-afterimage").forEach((afterimage) => afterimage.remove());
    }, DODGE_DURATION);
  }

  function createDodgeAfterimages(target, direction) {
    if (window.etokichiRenderer?.handlesFighters) return;
    const sprite = target.querySelector(".sprite");
    for (let index = 0; index < 3; index += 1) {
      const afterimage = document.createElement("img");
      afterimage.className = `dodge-afterimage ${direction}`;
      afterimage.src = sprite.currentSrc || sprite.src;
      afterimage.alt = "";
      afterimage.style.setProperty("--afterimage-delay", `${index * 46}ms`);
      afterimage.style.setProperty("--afterimage-opacity", `${.52 - index * .11}`);
      target.append(afterimage);
    }
  }

  function enemyPush(now) {
    if (getRange() !== 0) return;
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
    refs.arena.classList.remove("camera-hero", "camera-enemy", "camera-track-release", "push-camera", "push-camera-hero", "push-camera-enemy");
    refs.arena.style.setProperty("--push-camera-duration", `${duration}ms`);
    refs.arena.style.setProperty("--push-travel-duration", `${PUSH_TRAVEL_DURATION}ms`);
    void refs.arena.offsetWidth;
    refs.arena.classList.add("push-camera", `push-camera-${side}`);
    setTimeout(() => refs.arena.classList.remove("push-camera", "push-camera-hero", "push-camera-enemy"), duration);
  }

  function startCamera(side, duration, releaseDelay = null) {
    const cameraClass = side === "hero" ? "camera-hero" : "camera-enemy";
    refs.arena.classList.remove("camera-hero", "camera-enemy", "camera-track-release");
    refs.arena.style.setProperty("--camera-duration", `${duration}ms`);
    if (Number.isFinite(releaseDelay)) refs.arena.style.setProperty("--camera-release-delay", `${releaseDelay}ms`);
    else refs.arena.style.removeProperty("--camera-release-delay");
    void refs.arena.offsetWidth;
    refs.arena.classList.add(cameraClass);
    if (Number.isFinite(releaseDelay)) refs.arena.classList.add("camera-track-release");
    setTimeout(() => refs.arena.classList.remove(cameraClass, "camera-track-release"), duration);
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

  function isSpecialPinnedForResolution(side, type) {
    return state.actionSpecialSnapshot?.active[side]?.includes(type) ?? false;
  }

  function beginTechniqueResolution(attacker, consumeSerenity) {
    const now = performance.now();
    const active = { hero: [], enemy: [] };
    for (const side of ["hero", "enemy"]) {
      for (const [type, activeUntil] of Object.entries(state.specials[side].activeUntil)) {
        if (Number.isFinite(activeUntil) && now < activeUntil) active[side].push(type);
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
    if (!meta || special.triggered[type]) return false;
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
    refs.arena.classList.remove("camera-hero", "camera-enemy", "camera-track-release", "status-camera", "status-camera-hero", "status-camera-enemy");
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
    const heroPlans = {
      power: { pose: HERO_IMAGES.galaxyCharge },
      grit: { opening: HERO_IMAGES.defeat, pose: HERO_IMAGES.cast, poseAt: .34 },
      ease: { pose: HERO_IMAGES.idle },
      serenity: { pose: HERO_IMAGES.statusSerenity },
      awakening: { opening: HERO_IMAGES.defeat, pose: HERO_IMAGES.galaxyCharge, poseAt: .34 },
      etoile: { pose: HERO_IMAGES.etoileDriveCast },
      real: { pose: HERO_IMAGES.cast },
      jealousy: { pose: HERO_IMAGES.punchCast },
    };
    const enemyPlans = selectedEnemyId === "sutekichi" ? {
      ease: { pose: ENEMY_IMAGES.statusEase },
      inspiration: { pose: ENEMY_IMAGES.statusInspiration },
      power: { pose: ENEMY_IMAGES.discoveryCometCast },
      grit: { opening: ENEMY_IMAGES.idle, pose: ENEMY_IMAGES.haloSkipCast, poseAt: .34 },
      real: { pose: ENEMY_IMAGES.discoveryCometCast },
      jealousy: { pose: ENEMY_IMAGES.starTouchCast },
      serenity: { pose: ENEMY_IMAGES.stellaSearchCast },
      awakening: { opening: ENEMY_IMAGES.idle, pose: ENEMY_IMAGES.discoveryCometCast, poseAt: .34 },
    } : {
      power: { pose: ENEMY_IMAGES.blackMeteorCast },
      grit: { opening: ENEMY_IMAGES.idle, pose: ENEMY_IMAGES.crescentHornCast, poseAt: .34 },
      ease: { pose: ENEMY_IMAGES.statusEase },
      real: { pose: ENEMY_IMAGES.blackMeteorCast },
      jealousy: { pose: ENEMY_IMAGES.meteorClawCast },
      serenity: { pose: ENEMY_IMAGES.darkOrbitCast },
      awakening: { opening: ENEMY_IMAGES.idle, pose: ENEMY_IMAGES.blackMeteorCast, poseAt: .34 },
      inspiration: { pose: ENEMY_IMAGES.statusInspiration },
    };
    const restoreSource = side === "hero" ? HERO_IMAGES.battleIdle : ENEMY_IMAGES.idle;
    return (side === "hero" ? heroPlans : enemyPlans)[type] ?? { pose: restoreSource };
  }

  function playSpecialSpriteAnimation(side, type, duration, token) {
    const sprite = side === "hero" ? refs.heroSprite : refs.enemySprite;
    const restoreSource = side === "hero" ? HERO_IMAGES.battleIdle : ENEMY_IMAGES.idle;
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
        if (Number.isFinite(deadline)) activeUntil[type] = deadline + milliseconds;
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

  function recordEnemyObservation(range) {
    const special = state.specials.enemy;
    if (!hasBattleSpecial("enemy", "inspiration") || special.triggered.inspiration || special.pending.inspiration) return;
    special.observedRanges.add(range);
    if (special.observedRanges.size >= 3) scheduleBattleSpecial("enemy", "inspiration", 900);
  }

  function getTechniqueCost(technique, side) {
    const easeMultiplier = isSpecialActive(side, "ease") ? .65625 : 1;
    return Math.max(1, Math.round(technique.cost * easeMultiplier));
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
    return multiplier;
  }

  function getMovementMultiplier(side) {
    let multiplier = 1;
    if (isSpecialActive(side, "real")) multiplier *= 1.35;
    if (state.specials[side].realExhausted) multiplier *= .55;
    if (isSpecialActive(side, "serenity")) multiplier *= 2;
    return multiplier;
  }

  function calculateHitChance(technique, guts, heroAttacks = true) {
    const gutsBonus = (guts - 50) * .24;
    const attackerStats = fighterStats[heroAttacks ? "hero" : "enemy"];
    const defenderStats = fighterStats[heroAttacks ? "enemy" : "hero"];
    const abilityBonus = (attackerStats.accuracy - defenderStats.evasion) / 18;
    let hitRate = technique.accuracy + gutsBonus + abilityBonus;
    const attacker = heroAttacks ? "hero" : "enemy";
    const defender = heroAttacks ? "enemy" : "hero";
    if (isSpecialActive(defender, "serenity")) return 1;
    if (isSpecialActive(attacker, "serenity")) return 99;
    if (isSpecialActive(defender, "ease")) hitRate = (hitRate * hitRate) / 100;
    if (isSpecialActive(attacker, "awakening")) hitRate *= 1.5;
    if (isSpecialActive(defender, "awakening")) hitRate *= .5;
    if (isSpecialActive(attacker, "etoile")) hitRate += 10;
    if (isSpecialActive(attacker, "inspiration")) hitRate += 15;
    const minimumHitRate = isSpecialActive(defender, "awakening") ? 1 : 18;
    const maximumHitRate = isSpecialActive(attacker, "awakening") ? 99 : 96;
    return clamp(Math.round(hitRate), minimumHitRate, maximumHitRate);
  }

  function getRange() {
    const distance = state.enemyX - state.heroX;
    if (distance <= 19) return 0;
    if (distance <= 33) return 1;
    if (distance <= 48) return 2;
    if (distance <= MAX_TECHNIQUE_DISTANCE) return 3;
    return null;
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
    refs.hero.classList.remove("moving-forward", "moving-back", "hero-walking", "walk-facing-left", "attack-light", "casting", "dodging", "dodge-left", "dodge-right", "ultimate-sequence", "galaxy-ray-sequence", "galaxy-ray-aiming", "galaxy-ray-recoil", "throw-kiss-sequence", "throw-kiss-release", "throw-kiss-recovery", "physical-punch-sequence", "star-ring-sequence", "pentagram-nova-sequence", "pentagram-nova-charge", "pentagram-nova-rush", "pentagram-nova-combo", "pentagram-nova-finisher", "pentagram-nova-diving", "pentagram-nova-miss", "etoile-drive-sequence", "etoile-drive-peak", "push-focus", "push-threatened", "push-travel", "push-recoil-right", "push-recoil-left", "blown-right", "blown-left", "status-power", "status-ease", "status-real", "status-jealousy", "status-serenity", "status-awakening", "status-etoile", "status-inspiration", "grit-rise", "awakening-rise", ...SPECIAL_ACTION_CLASSES);
    refs.enemy.classList.remove("moving-forward", "moving-back", "attack-light", "casting", "dodging", "dodge-left", "dodge-right", "dark-orbit-sequence", "black-meteor-sequence", "meteor-claw-sequence", "crescent-horn-sequence", "sutekichi-star-touch-sequence", "sutekichi-halo-skip-sequence", "sutekichi-stella-search-sequence", "sutekichi-comet-sequence", "sutekichi-nap-sequence", "technique-recoil", "nova-captured", "push-focus", "push-threatened", "push-travel", "push-recoil-right", "push-recoil-left", "blown-right", "blown-left", "status-power", "status-ease", "status-real", "status-jealousy", "status-serenity", "status-awakening", "status-inspiration", "grit-rise", "awakening-rise", ...SPECIAL_ACTION_CLASSES);
    refs.arena.classList.remove("sutekichi-comet-mode");
    refs.arena.classList.remove("special-mode", "pentagram-nova-mode", "pentagram-nova-missed", "nova-hit-pulse", "black-meteor-mode", "camera-hero", "camera-enemy", "camera-track-release", "push-camera", "push-camera-hero", "push-camera-enemy", "impact-freeze", "physical-hit-hero", "physical-hit-enemy", "status-camera", "status-camera-hero", "status-camera-enemy");
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
        refs.heroSprite.src = HERO_IMAGES.battleIdle;
        refs.hero.classList.add("result-winner");
        refs.enemy.classList.add("result-loser");
      } else {
        refs.heroSprite.src = HERO_IMAGES.defeat;
        refs.hero.classList.add("result-loser");
        refs.enemy.classList.add("result-winner");
      }
      createVictoryCelebration(heroWon ? "hero" : "enemy");
    }, 420);
    setTimeout(() => {
      if (state.phase !== "finishing") return;
      const winner = heroWon ? refs.hero : refs.enemy;
      const winnerSprite = heroWon ? refs.heroSprite : refs.enemySprite;
      winnerSprite.src = heroWon ? HERO_IMAGES.victoryClimax : ENEMY_IMAGES.victoryClimax;
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
    const usesPixiParticles = spawnPixiEffect("victoryCelebration", { side: winner });
    const celebration = document.createElement("div");
    celebration.className = `victory-celebration victory-${winner}`;
    celebration.style.setProperty("--winner-x", `${winnerX}%`);
    refs.arena.style.setProperty("--victory-focus-x", `${winnerX}%`);
    const title = document.createElement("div");
    title.className = "victory-title";
    const label = document.createElement("span");
    label.textContent = "WINNER";
    const name = document.createElement("strong");
    name.textContent = winner === "hero" ? "エトキチ" : activeEnemy.name;
    title.append(label, name);
    celebration.append(title);
    if (!usesPixiParticles) {
      for (let index = 0; index < 26; index += 1) {
        const angle = index * (360 / 26);
        const particle = document.createElement("i");
        particle.textContent = index % 3 === 0 ? "✦" : "◆";
        particle.style.setProperty("--victory-angle", `${angle}deg`);
        particle.style.setProperty("--victory-counter-angle", `${-angle}deg`);
        particle.style.setProperty("--victory-distance", `${random(140, 410)}px`);
        particle.style.setProperty("--victory-delay", `${1.7 + (index % 7) * .09}s`);
        particle.style.setProperty("--victory-size", `${random(10, 25)}px`);
        celebration.append(particle);
      }
    }
    refs.effects.append(celebration);
    setTimeout(() => celebration.remove(), RESULT_EFFECT_CLEANUP_DELAY);
  }

  function updateUI() {
    const projection = getStageProjection();
    window.etokichiRenderer?.setProjection({
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
    const outsideTechniqueRange = range === null;
    const distancePosition = getDistanceCursorPosition(state.enemyX - state.heroX);
    refs.heroDistanceRuler.style.setProperty("--distance-position", `${100 - distancePosition}%`);
    refs.enemyDistanceRuler.style.setProperty("--distance-position", `${distancePosition}%`);
    refs.hitRate.textContent = current ? current.kind === "support" ? "自己強化" : `${calculateHitChance(current, state.heroGuts)}%` : "圏外";
    refs.enemyHitRate.textContent = enemyCurrent ? enemyCurrent.kind === "support" ? "回復技" : `${calculateHitChance(enemyCurrent, state.enemyGuts, false)}%` : "圏外";
    refs.heroDistanceRuler.classList.toggle("out-of-technique-range", outsideTechniqueRange);
    refs.enemyDistanceRuler.classList.toggle("out-of-technique-range", outsideTechniqueRange);

    refs.techniques.forEach((button) => {
      const buttonRange = Number(button.dataset.range);
      const technique = getSelectedTechnique(buttonRange);
      const cost = getTechniqueCost(technique, "hero");
      button.classList.toggle("active", buttonRange === range);
      button.classList.toggle("unaffordable", state.heroGuts < cost);
      button.classList.toggle("power-tech", technique.attackStat === "power");
      button.classList.toggle("intelligence-tech", technique.attackStat === "intelligence");
      button.classList.toggle("special-tech", technique.kind === "special" || technique.kind === "super");
      if (button.dataset.techniqueId !== technique.id) {
        button.dataset.techniqueId = technique.id;
        button.querySelector(".technique-name").textContent = technique.cardName ?? technique.name;
        button.querySelector(".technique-icon svg").innerHTML = heroTechniqueIcons[technique.icon];
      }
      button.querySelector(".technique-cost b").textContent = cost;
      button.disabled = state.phase !== "battle";
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
        icon.innerHTML = activeEnemy.icons[enemyTechniques.indexOf(technique)];
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
    renderSpecialBadges("hero", refs.heroSpecials);
    renderSpecialBadges("enemy", refs.enemySpecials);
    renderCombatStatus("hero", refs.heroCombatStatus);
    renderCombatStatus("enemy", refs.enemyCombatStatus);
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
        debugTime.textContent = `DEBUG 残り ${Number.isFinite(remaining) ? `${remaining.toFixed(1)}s` : "∞"}`;
        entry.append(debugTime);
      }
      container.append(entry);
    }
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
    const targetPoint = getEffectPoint(element.querySelector(".sprite"), .5, .36);
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
    void pop.offsetWidth;
    pop.classList.add("show");
    const displayDuration = critical ? 1950 : superHit ? 1750 : 1450;
    setTimeout(() => pop.remove(), displayDuration);
    if (critical) createCriticalScreenBurst(element);
    if (damage >= 240) {
      refs.arena.classList.remove("shake");
      void refs.arena.offsetWidth;
      refs.arena.classList.add("shake");
    }
    if (!heroAttacks) navigator.vibrate?.(35);
  }

  function spawnPixiEffect(type, options = {}) {
    return window.etokichiRenderer?.spawnEffect?.(type, options) === true;
  }

  function createCriticalScreenBurst(target) {
    if (spawnPixiEffect("criticalScreenBurst", { side: target === refs.hero ? "hero" : "enemy" })) return;
    const projection = getStageProjection();
    const burst = document.createElement("i");
    burst.className = "critical-screen-burst";
    burst.style.left = target === refs.hero ? `${projection.heroX}%` : `${projection.enemyX}%`;
    refs.effects.append(burst);
    setTimeout(() => burst.remove(), 900);
  }

  function createImpact(heroAttacks, y = null) {
    if (spawnPixiEffect("impact", { heroAttacks, y })) return;
    const projection = getStageProjection();
    const impact = document.createElement("i");
    impact.className = `impact ${heroAttacks ? "" : "purple"}`;
    impact.style.left = heroAttacks ? `${projection.enemyX}%` : `${projection.heroX}%`;
    impact.style.top = y === null ? "55%" : `${y}px`;
    refs.effects.append(impact);
    setTimeout(() => impact.remove(), 460);
  }

  function createEtoileDriveEffect(duration) {
    if (spawnPixiEffect("etoileDrive", { duration })) return;
    const origin = getEffectPoint(refs.heroSprite, .5, .5);
    const effect = document.createElement("div");
    effect.className = "etoile-drive-effect";
    effect.style.left = `${origin.x}px`;
    effect.style.top = `${origin.y}px`;
    const crest = document.createElement("b");
    crest.textContent = "✦";
    const pillar = document.createElement("span");
    effect.append(pillar, crest);
    for (let index = 0; index < 14; index += 1) {
      const sparkle = document.createElement("i");
      sparkle.textContent = index % 3 ? "✦" : "◆";
      sparkle.style.setProperty("--etoile-angle", `${index * 25.7}deg`);
      sparkle.style.setProperty("--etoile-distance", `${random(105, 210)}px`);
      sparkle.style.setProperty("--etoile-delay", `${index * -95}ms`);
      effect.append(sparkle);
    }
    refs.effects.append(effect);
    setTimeout(() => effect.remove(), duration + 180);
  }

  function applyTechniqueKnockback(heroAttacks, distance, target) {
    target.classList.remove("flash-knockback");
    void target.offsetWidth;
    target.classList.add("flash-knockback");
    if (heroAttacks) state.enemyX = Math.min(STAGE_MAX_X, state.enemyX + distance);
    else state.heroX = Math.max(STAGE_MIN_X, state.heroX - distance);
    setTimeout(() => target.classList.remove("flash-knockback"), 1100);
  }

  function createProjectile(enemy) {
    if (spawnPixiEffect("projectile", { enemy })) return;
    const projectile = document.createElement("i");
    projectile.className = `projectile ${enemy ? "enemy-shot" : ""}`;
    refs.effects.append(projectile);
    setTimeout(() => projectile.remove(), 520);
  }

  function getEffectPoint(sprite, xRatio, yRatio) {
    const arenaRect = refs.arena.getBoundingClientRect();
    const spriteRect = sprite.getBoundingClientRect();
    return {
      x: spriteRect.left - arenaRect.left + spriteRect.width * xRatio,
      y: spriteRect.top - arenaRect.top + spriteRect.height * yRatio,
    };
  }

  function getRenderedScale(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: element.offsetWidth ? rect.width / element.offsetWidth : 1,
      y: element.offsetHeight ? rect.height / element.offsetHeight : 1,
    };
  }

  function createPhysicalDust(side, color) {
    if (spawnPixiEffect("dust", { side, color })) return;
    const sprite = side === "hero" ? refs.heroSprite : refs.enemySprite;
    const origin = getEffectPoint(sprite, .5, .86);
    const dust = document.createElement("div");
    dust.className = `physical-dust ${color}`;
    dust.style.left = `${origin.x}px`;
    dust.style.top = `${origin.y}px`;
    for (let index = 0; index < 7; index += 1) {
      const mote = document.createElement("i");
      mote.style.setProperty("--dust-x", `${random(-78, 78)}px`);
      mote.style.setProperty("--dust-y", `${random(-48, -14)}px`);
      mote.style.setProperty("--dust-delay", `${index * 38}ms`);
      dust.append(mote);
    }
    refs.effects.append(dust);
    setTimeout(() => dust.remove(), 900);
  }

  function createPunchTrail() {
    if (spawnPixiEffect("punchTrail")) return;
    const origin = getEffectPoint(refs.heroSprite, .68, .5);
    const target = getEffectPoint(refs.enemySprite, .45, .52);
    const trail = document.createElement("div");
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    trail.className = "punch-trail";
    trail.style.left = `${origin.x}px`;
    trail.style.top = `${origin.y}px`;
    trail.style.width = `${Math.max(120, Math.hypot(dx, dy))}px`;
    trail.style.rotate = `${Math.atan2(dy, dx)}rad`;
    refs.effects.append(trail);
    setTimeout(() => trail.remove(), 720);
  }

  function createStarRingSweep() {
    if (spawnPixiEffect("starRing")) return;
    const origin = getEffectPoint(refs.heroSprite, .53, .56);
    const target = getEffectPoint(refs.enemySprite, .43, .54);
    const sweep = document.createElement("div");
    sweep.className = "star-ring-sweep";
    sweep.style.left = `${origin.x}px`;
    sweep.style.top = `${origin.y}px`;
    sweep.style.setProperty("--ring-travel-x", `${target.x - origin.x}px`);
    sweep.style.setProperty("--ring-travel-y", `${target.y - origin.y}px`);
    for (let index = 0; index < 5; index += 1) {
      const spark = document.createElement("i");
      spark.style.setProperty("--ring-spark-angle", `${index * 72}deg`);
      sweep.append(spark);
    }
    refs.effects.append(sweep);
    setTimeout(() => sweep.remove(), 1050);
  }

  function createMeteorClawTrail() {
    if (spawnPixiEffect("meteorClaw")) return;
    const target = getEffectPoint(refs.heroSprite, .52, .52);
    const slashes = document.createElement("div");
    slashes.className = "meteor-claw-trail";
    slashes.style.left = `${target.x}px`;
    slashes.style.top = `${target.y}px`;
    for (let index = 0; index < 3; index += 1) {
      const slash = document.createElement("i");
      slash.style.setProperty("--claw-offset", `${(index - 1) * 32}px`);
      slash.style.setProperty("--claw-delay", `${index * 65}ms`);
      slashes.append(slash);
    }
    refs.effects.append(slashes);
    setTimeout(() => slashes.remove(), 820);
  }

  function createCrescentHornRush() {
    if (spawnPixiEffect("crescentRush")) return;
    const origin = getEffectPoint(refs.enemySprite, .34, .58);
    const target = getEffectPoint(refs.heroSprite, .58, .58);
    const rush = document.createElement("div");
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    rush.className = "crescent-horn-rush";
    rush.style.left = `${origin.x}px`;
    rush.style.top = `${origin.y}px`;
    rush.style.width = `${Math.max(150, Math.hypot(dx, dy))}px`;
    rush.style.rotate = `${Math.atan2(dy, dx)}rad`;
    for (let index = 0; index < 5; index += 1) rush.append(document.createElement("i"));
    refs.effects.append(rush);
    setTimeout(() => rush.remove(), 1050);
  }

  function createPhysicalContact(heroAttacks, variant) {
    if (spawnPixiEffect("physicalContact", { heroAttacks, variant })) return;
    const target = getEffectPoint(heroAttacks ? refs.enemySprite : refs.heroSprite, .5, .54);
    const contact = document.createElement("div");
    contact.className = `physical-contact ${variant}`;
    contact.style.left = `${target.x}px`;
    contact.style.top = `${target.y}px`;
    for (let index = 0; index < 8; index += 1) {
      const ray = document.createElement("i");
      ray.style.setProperty("--contact-angle", `${index * 45}deg`);
      contact.append(ray);
    }
    refs.effects.append(contact);
    setTimeout(() => contact.remove(), 760);
  }

  function createPentagramNovaCharge() {
    if (spawnPixiEffect("novaCharge")) return;
    const origin = getEffectPoint(refs.heroSprite, .5, .54);
    const charge = document.createElement("div");
    charge.className = "pentagram-nova-charge-effect";
    charge.style.left = `${origin.x}px`;
    charge.style.top = `${origin.y}px`;
    const crest = document.createElement("b");
    const orbit = document.createElement("span");
    charge.append(orbit, crest);
    for (let index = 0; index < 12; index += 1) {
      const mote = document.createElement("i");
      mote.style.setProperty("--nova-angle", `${index * 30}deg`);
      mote.style.setProperty("--nova-delay", `${index * -75}ms`);
      charge.append(mote);
    }
    refs.effects.append(charge);
    setTimeout(() => charge.remove(), 1750);
  }

  function createPentagramNovaRush() {
    if (spawnPixiEffect("novaRush")) return;
    const origin = getEffectPoint(refs.heroSprite, .64, .52);
    const target = getEffectPoint(refs.enemySprite, .46, .52);
    const rush = document.createElement("div");
    rush.className = "pentagram-nova-rush-effect";
    rush.style.left = `${origin.x}px`;
    rush.style.top = `${origin.y}px`;
    rush.style.width = `${Math.max(180, Math.hypot(target.x - origin.x, target.y - origin.y))}px`;
    rush.style.rotate = `${Math.atan2(target.y - origin.y, target.x - origin.x)}rad`;
    rush.append(document.createElement("b"));
    for (let index = 0; index < 7; index += 1) rush.append(document.createElement("i"));
    refs.effects.append(rush);
    setTimeout(() => rush.remove(), 900);
  }

  function createPentagramNovaCapture() {
    const target = getEffectPoint(refs.enemySprite, .5, .52);
    const captureLift = -clamp(refs.arena.getBoundingClientRect().height * .38, 180, 300);
    refs.enemy.style.setProperty("--nova-capture-lift-mid", `${captureLift * .7}px`);
    refs.enemy.style.setProperty("--nova-capture-lift", `${captureLift}px`);
    if (spawnPixiEffect("novaCapture")) return;
    const capture = document.createElement("div");
    capture.className = "pentagram-nova-capture";
    capture.style.left = `${target.x}px`;
    capture.style.top = `${target.y}px`;
    capture.style.setProperty("--capture-lift-mid", `${captureLift * .7}px`);
    capture.style.setProperty("--capture-lift", `${captureLift}px`);
    capture.append(document.createElement("b"), document.createElement("span"));
    for (let index = 0; index < 10; index += 1) {
      const ray = document.createElement("i");
      ray.style.setProperty("--capture-angle", `${index * 36}deg`);
      capture.append(ray);
    }
    refs.effects.append(capture);
    setTimeout(() => capture.remove(), 3650);
  }

  function startPentagramNovaCombo() {
    refs.effects.querySelector(".pentagram-nova-path")?.remove();
    const arenaRect = refs.arena.getBoundingClientRect();
    const origin = getEffectPoint(refs.heroSprite, .5, .5);
    const target = getEffectPoint(refs.enemySprite, .5, .5);
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
    const usesPixiPath = spawnPixiEffect("novaPath", { points });
    window.etokichiRenderer?.startFighterMotion?.("hero", "novaCombo", { points, duration: 2480 });
    if (!usesPixiPath) {
      const svgNamespace = "http://www.w3.org/2000/svg";
      const path = document.createElementNS(svgNamespace, "svg");
      path.classList.add("pentagram-nova-path");
      path.setAttribute("viewBox", `0 0 ${arenaRect.width} ${arenaRect.height}`);
      path.setAttribute("preserveAspectRatio", "none");
      points.slice(0, -1).forEach((point, index) => {
        const line = document.createElementNS(svgNamespace, "line");
        line.setAttribute("x1", point.x);
        line.setAttribute("y1", point.y);
        line.setAttribute("x2", points[index + 1].x);
        line.setAttribute("y2", points[index + 1].y);
        line.setAttribute("pathLength", "1");
        path.append(line);
      });
      refs.effects.append(path);
      setTimeout(() => path.remove(), 4000);
    }

    const transformAt = (point, rotation, scale = 1) =>
      `translate(${point.x - origin.x}px, ${point.y - origin.y}px) rotate(${rotation}deg) scale(${scale})`;
    return refs.heroSprite.animate([
      { transform: "translate(0,0) rotate(0) scale(1)", offset: 0 },
      { transform: transformAt(points[0], -18, .9), offset: .04 },
      { transform: transformAt(points[1], 16, 1.08), offset: .181 },
      { transform: transformAt(points[2], -20, 1.08), offset: .339 },
      { transform: transformAt(points[3], 15, 1.1), offset: .496 },
      { transform: transformAt(points[4], -16, 1.08), offset: .653 },
      { transform: transformAt(points[5], 12, 1.1), offset: .81 },
      { transform: transformAt(points[5], 0, 1), offset: 1 },
    ], { duration: 2480, easing: "linear" });
  }

  function drawPentagramNovaTrailSegment(index) {
    const segment = refs.effects.querySelectorAll(".pentagram-nova-path line")[index];
    if (segment) segment.classList.add("drawn");
  }

  function startPentagramNovaFinisherRise(comboEndPoint) {
    const arenaRect = refs.arena.getBoundingClientRect();
    const heroCenter = getEffectPoint(refs.heroSprite, .5, .5);
    const heroAttackPoint = getEffectPoint(refs.heroSprite, .77, .78);
    const heroScale = getRenderedScale(refs.heroSprite);
    const enemyGroundTarget = getEffectPoint(refs.enemySprite, .5, .56);
    const lift = clamp(arenaRect.height * .38, 180, 300);
    const airTarget = { x: enemyGroundTarget.x, y: enemyGroundTarget.y - lift };
    const start = {
      x: (comboEndPoint.x - heroCenter.x) / heroScale.x,
      y: (comboEndPoint.y - heroCenter.y) / heroScale.y,
    };
    const launchContact = {
      x: (enemyGroundTarget.x - heroAttackPoint.x) / heroScale.x,
      y: (enemyGroundTarget.y - heroAttackPoint.y) / heroScale.y,
    };
    const airContact = {
      x: (airTarget.x - heroAttackPoint.x) / heroScale.x,
      y: (airTarget.y - heroAttackPoint.y) / heroScale.y,
    };
    const animation = refs.heroSprite.animate([
      { transform: `translate(${start.x}px,${start.y}px) rotate(10deg) scale(1.08)`, offset: 0 },
      { transform: `translate(${launchContact.x}px,${launchContact.y + 24}px) rotate(-16deg) scale(.96,1.12)`, offset: .3 },
      { transform: `translate(${launchContact.x}px,${launchContact.y - 18}px) rotate(-24deg) scale(1.12,.92)`, offset: .48 },
      { transform: `translate(${airContact.x}px,${airContact.y + 12}px) rotate(-8deg) scale(1.04)`, offset: .88 },
      { transform: `translate(${airContact.x}px,${airContact.y}px) rotate(0) scale(1)`, offset: 1 },
    ], { duration: 570, easing: "cubic-bezier(.16,.78,.18,1)", fill: "forwards" });
    window.etokichiRenderer?.startFighterMotion?.("hero", "novaRise", {
      enemyGroundTarget,
      airTarget,
      duration: 570,
    });
    return { animation, enemyGroundTarget, airTarget };
  }

  function startPentagramNovaFinisherDive(motion) {
    if (!motion) return null;
    const currentCenter = getEffectPoint(refs.heroSprite, .5, .5);
    motion.animation?.cancel();
    const heroCenter = getEffectPoint(refs.heroSprite, .5, .5);
    const heroAttackPoint = getEffectPoint(refs.heroSprite, .77, .78);
    const heroScale = getRenderedScale(refs.heroSprite);
    const start = {
      x: (currentCenter.x - heroCenter.x) / heroScale.x,
      y: (currentCenter.y - heroCenter.y) / heroScale.y,
    };
    const impact = {
      x: (motion.enemyGroundTarget.x - heroAttackPoint.x) / heroScale.x,
      y: (motion.enemyGroundTarget.y - heroAttackPoint.y) / heroScale.y,
    };
    const animation = refs.heroSprite.animate([
      { transform: `translate(${start.x}px,${start.y}px) rotate(0) scale(1)`, offset: 0 },
      { transform: `translate(${start.x + 10}px,${start.y - 20}px) rotate(7deg) scale(.96)`, offset: .18 },
      { transform: `translate(${impact.x - 14}px,${impact.y - 35}px) rotate(-14deg) scale(1.18,.84)`, offset: .76 },
      { transform: `translate(${impact.x}px,${impact.y}px) rotate(-5deg) scale(1.08,.9)`, offset: 1 },
    ], { duration: 550, easing: "cubic-bezier(.12,.82,.16,1)", fill: "forwards" });
    window.etokichiRenderer?.startFighterMotion?.("hero", "novaDive", {
      enemyGroundTarget: motion.enemyGroundTarget,
      duration: 550,
    });
    return { ...motion, animation };
  }

  function createPentagramNovaStrike(index) {
    const usesPixiEffect = spawnPixiEffect("novaStrike", { index });
    const target = getEffectPoint(refs.enemySprite, .5, .5);
    let strike;
    if (!usesPixiEffect) {
      const angles = [-72, 144, 0, -144, 72];
      strike = document.createElement("div");
      strike.className = "pentagram-nova-strike";
      strike.style.left = `${target.x}px`;
      strike.style.top = `${target.y}px`;
      strike.style.setProperty("--strike-angle", `${angles[index]}deg`);
      strike.append(document.createElement("b"), document.createElement("span"));
      for (let rayIndex = 0; rayIndex < 6; rayIndex += 1) {
        const ray = document.createElement("i");
        ray.style.setProperty("--ray-angle", `${rayIndex * 60}deg`);
        strike.append(ray);
      }
      refs.effects.append(strike);
    }
    refs.arena.classList.remove("nova-hit-pulse");
    void refs.arena.offsetWidth;
    refs.arena.classList.add("nova-hit-pulse");
    if (strike) setTimeout(() => strike.remove(), 620);
  }

  function createPentagramNovaUppercut(motion) {
    if (!motion) return;
    if (spawnPixiEffect("novaUppercut", {
      enemyGroundTarget: motion.enemyGroundTarget,
      airTarget: motion.airTarget,
    })) return;
  }

  function createPentagramNovaDive(targetPoint) {
    if (spawnPixiEffect("novaDive", { targetPoint })) return;
    const target = targetPoint || getEffectPoint(refs.enemySprite, .5, .62);
    const dive = document.createElement("div");
    dive.className = "pentagram-nova-dive-effect";
    dive.style.left = `${target.x}px`;
    dive.style.top = `${target.y}px`;
    dive.append(document.createElement("b"), document.createElement("span"));
    for (let index = 0; index < 9; index += 1) {
      const line = document.createElement("i");
      line.style.setProperty("--dive-offset", `${(index - 4) * 14}px`);
      dive.append(line);
    }
    refs.effects.append(dive);
    setTimeout(() => dive.remove(), 1500);
  }

  function createPentagramNovaImpact(critical) {
    const usesPixiEffect = spawnPixiEffect("novaImpact", { critical });
    let impactEffect;
    if (!usesPixiEffect) {
      const target = getEffectPoint(refs.enemySprite, .5, .68);
      impactEffect = document.createElement("div");
      impactEffect.className = `pentagram-nova-impact${critical ? " critical" : ""}`;
      impactEffect.style.left = `${target.x}px`;
      impactEffect.style.top = `${target.y}px`;
      impactEffect.append(document.createElement("b"), document.createElement("span"));
      for (let index = 0; index < 14; index += 1) {
        const shard = document.createElement("i");
        shard.style.setProperty("--nova-impact-angle", `${index * 25.7}deg`);
        shard.style.setProperty("--nova-impact-distance", `${random(110, 245)}px`);
        impactEffect.append(shard);
      }
      refs.effects.append(impactEffect);
    }
    refs.arena.classList.remove("shake");
    void refs.arena.offsetWidth;
    refs.arena.classList.add("shake");
    if (impactEffect) setTimeout(() => impactEffect.remove(), critical ? 1750 : 1450);
  }

  function createGalaxyRayCharge() {
    if (spawnPixiEffect("galaxyRayCharge")) return;
    const origin = getEffectPoint(refs.heroSprite, .79, .5);
    const charge = document.createElement("div");
    charge.className = "galaxy-ray-charge";
    charge.style.left = `${origin.x}px`;
    charge.style.top = `${origin.y}px`;
    for (let index = 0; index < 7; index += 1) {
      const spark = document.createElement("i");
      spark.style.setProperty("--spark-angle", `${index * 51}deg`);
      spark.style.setProperty("--spark-delay", `${index * -70}ms`);
      charge.append(spark);
    }
    refs.effects.append(charge);
    setTimeout(() => charge.remove(), 1250);
  }

  function createGalaxyRay() {
    if (spawnPixiEffect("galaxyRay")) return;
    const origin = getEffectPoint(refs.heroSprite, .88, .48);
    const target = getEffectPoint(refs.enemySprite, .48, .5);
    const shot = document.createElement("div");
    shot.className = "galaxy-ray-shot";
    shot.style.left = `${origin.x}px`;
    shot.style.top = `${origin.y}px`;
    shot.style.setProperty("--travel-x", `${target.x - origin.x}px`);
    shot.style.setProperty("--travel-y", `${target.y - origin.y}px`);
    const core = document.createElement("i");
    core.className = "galaxy-ray-core";
    const trail = document.createElement("i");
    trail.className = "galaxy-ray-trail";
    const particles = document.createElement("span");
    for (let index = 0; index < 8; index += 1) {
      const particle = document.createElement("i");
      particle.style.setProperty("--ray-particle-y", `${random(-25, 25)}px`);
      particle.style.setProperty("--ray-particle-delay", `${index * 48}ms`);
      particles.append(particle);
    }
    shot.append(trail, core, particles);
    refs.effects.append(shot);
    setTimeout(() => shot.remove(), 900);
  }

  function createKissCharge() {
    if (spawnPixiEffect("kissCharge")) return;
    const origin = getEffectPoint(refs.heroSprite, .73, .42);
    const charge = document.createElement("div");
    charge.className = "kiss-charge";
    charge.style.left = `${origin.x}px`;
    charge.style.top = `${origin.y}px`;
    const heart = document.createElement("b");
    heart.textContent = "♥";
    charge.append(heart);
    for (let index = 0; index < 7; index += 1) {
      const sparkle = document.createElement("i");
      sparkle.textContent = index % 2 ? "✦" : "♥";
      sparkle.style.setProperty("--kiss-spark-angle", `${index * 51}deg`);
      sparkle.style.setProperty("--kiss-spark-delay", `${index * -75}ms`);
      charge.append(sparkle);
    }
    refs.effects.append(charge);
    setTimeout(() => charge.remove(), 1050);
  }

  function createThrowingKiss() {
    if (spawnPixiEffect("throwingKiss")) return;
    const origin = getEffectPoint(refs.heroSprite, .76, .42);
    const target = getEffectPoint(refs.enemySprite, .48, .48);
    const projectile = document.createElement("div");
    projectile.className = "throwing-kiss";
    projectile.style.left = `${origin.x}px`;
    projectile.style.top = `${origin.y}px`;
    projectile.style.setProperty("--kiss-travel-x", `${target.x - origin.x}px`);
    projectile.style.setProperty("--kiss-travel-y", `${target.y - origin.y}px`);
    const heart = document.createElement("b");
    heart.textContent = "♥";
    const trail = document.createElement("span");
    for (let index = 0; index < 8; index += 1) {
      const mote = document.createElement("i");
      mote.textContent = index % 3 ? "♥" : "✦";
      mote.style.setProperty("--kiss-trail-delay", `${index * 72}ms`);
      mote.style.setProperty("--kiss-trail-y", `${random(-24, 24)}px`);
      trail.append(mote);
    }
    projectile.append(trail, heart);
    refs.effects.append(projectile);
    setTimeout(() => projectile.remove(), 980);
  }

  function createKissBurst() {
    if (spawnPixiEffect("kissBurst")) return;
    const target = getEffectPoint(refs.enemySprite, .48, .48);
    const burst = document.createElement("div");
    burst.className = "kiss-burst";
    burst.style.left = `${target.x}px`;
    burst.style.top = `${target.y}px`;
    const heart = document.createElement("b");
    heart.textContent = "♥";
    burst.append(heart);
    for (let index = 0; index < 12; index += 1) {
      const shard = document.createElement("i");
      shard.textContent = index % 3 ? "♥" : "✦";
      shard.style.setProperty("--kiss-burst-angle", `${index * 30}deg`);
      shard.style.setProperty("--kiss-burst-distance", `${random(70, 145)}px`);
      burst.append(shard);
    }
    refs.effects.append(burst);
    setTimeout(() => burst.remove(), 1100);
  }

  function createKissMissBreak() {
    if (spawnPixiEffect("kissMiss")) {
      sound("kissBreak");
      return;
    }
    const target = getEffectPoint(refs.enemySprite, .48, .48);
    const broken = document.createElement("div");
    broken.className = "kiss-miss-break";
    broken.style.left = `${target.x}px`;
    broken.style.top = `${target.y}px`;
    const outline = document.createElement("b");
    outline.textContent = "♡";
    broken.append(outline);
    for (let index = 0; index < 8; index += 1) {
      const fragment = document.createElement("i");
      fragment.textContent = index % 2 ? "·" : "♥";
      fragment.style.setProperty("--kiss-break-x", `${random(-105, 105)}px`);
      fragment.style.setProperty("--kiss-break-y", `${random(-85, 55)}px`);
      broken.append(fragment);
    }
    refs.effects.append(broken);
    sound("kissBreak");
    setTimeout(() => broken.remove(), 920);
  }

  function createDarkOrbitField() {
    if (spawnPixiEffect("darkOrbitField")) return;
    const origin = getEffectPoint(refs.enemySprite, .5, .52);
    const field = document.createElement("div");
    field.className = "dark-orbit-field";
    field.style.left = `${origin.x}px`;
    field.style.top = `${origin.y}px`;
    for (let index = 0; index < 3; index += 1) {
      const orb = document.createElement("i");
      orb.style.setProperty("--orbit-index", index);
      orb.style.setProperty("--orbit-delay", `${index * -430}ms`);
      field.append(orb);
    }
    refs.effects.append(field);
    setTimeout(() => field.remove(), 2050);
  }

  function createDarkOrbitVolley() {
    if (spawnPixiEffect("darkOrbitVolley")) return;
    const origin = getEffectPoint(refs.enemySprite, .38, .48);
    const target = getEffectPoint(refs.heroSprite, .5, .5);
    const volley = document.createElement("div");
    volley.className = "dark-orbit-volley";
    for (let index = 0; index < 3; index += 1) {
      const orb = document.createElement("i");
      const offsetY = (index - 1) * 34;
      orb.style.left = `${origin.x}px`;
      orb.style.top = `${origin.y + offsetY}px`;
      orb.style.setProperty("--orbit-travel-x", `${target.x - origin.x}px`);
      orb.style.setProperty("--orbit-travel-y", `${target.y - origin.y - offsetY + (index - 1) * 12}px`);
      orb.style.setProperty("--volley-delay", `${index * 120}ms`);
      volley.append(orb);
    }
    refs.effects.append(volley);
    setTimeout(() => volley.remove(), 1300);
  }

  function createBlackMeteorSky() {
    if (spawnPixiEffect("blackMeteorSky")) return;
    const target = getEffectPoint(refs.heroSprite, .5, .45);
    const sky = document.createElement("div");
    sky.className = "black-meteor-sky";
    sky.style.left = `${target.x}px`;
    for (let index = 0; index < 9; index += 1) {
      const mote = document.createElement("i");
      mote.style.setProperty("--mote-angle", `${index * 40}deg`);
      mote.style.setProperty("--mote-delay", `${index * -90}ms`);
      sky.append(mote);
    }
    refs.effects.append(sky);
    setTimeout(() => sky.remove(), 3100);
  }

  function createBlackMeteor() {
    if (spawnPixiEffect("blackMeteor")) return;
    const target = getEffectPoint(refs.heroSprite, .5, .58);
    const meteor = document.createElement("div");
    meteor.className = "black-meteor";
    meteor.style.left = `${target.x}px`;
    meteor.style.setProperty("--meteor-fall", `${target.y + 210}px`);
    const tail = document.createElement("i");
    tail.className = "black-meteor-tail";
    const rock = document.createElement("i");
    rock.className = "black-meteor-rock";
    for (let index = 0; index < 5; index += 1) {
      const crater = document.createElement("b");
      crater.style.setProperty("--crater-angle", `${index * 72}deg`);
      rock.append(crater);
    }
    meteor.append(tail, rock);
    refs.effects.append(meteor);
    setTimeout(() => meteor.remove(), 1950);
  }

  function createBlackMeteorImpact() {
    const usesPixiEffect = spawnPixiEffect("blackMeteorImpact");
    let impact;
    if (!usesPixiEffect) {
      const target = getEffectPoint(refs.heroSprite, .5, .68);
      impact = document.createElement("div");
      impact.className = "black-meteor-impact";
      impact.style.left = `${target.x}px`;
      impact.style.top = `${target.y}px`;
      for (let index = 0; index < 10; index += 1) {
        const debris = document.createElement("i");
        debris.style.setProperty("--debris-angle", `${index * 36}deg`);
        debris.style.setProperty("--debris-distance", `${random(85, 175)}px`);
        impact.append(debris);
      }
      refs.effects.append(impact);
    }
    refs.arena.classList.remove("shake");
    void refs.arena.offsetWidth;
    refs.arena.classList.add("shake");
    if (impact) setTimeout(() => impact.remove(), 1200);
  }

  function createSutekichiStarTouchEffect() {
    if (spawnPixiEffect("sutekichiStarTouch")) return;
    const target = getEffectPoint(refs.heroSprite, .55, .48);
    const effect = document.createElement("div");
    effect.className = "sutekichi-star-touch-effect";
    effect.style.left = `${target.x}px`;
    effect.style.top = `${target.y}px`;
    const mark = document.createElement("b");
    mark.textContent = "✦";
    effect.append(mark);
    for (let index = 0; index < 9; index += 1) {
      const mote = document.createElement("i");
      mote.textContent = index % 3 ? "✦" : "●";
      mote.style.setProperty("--sutekichi-angle", `${index * 40}deg`);
      effect.append(mote);
    }
    refs.effects.append(effect);
    setTimeout(() => effect.remove(), 950);
  }

  function createSutekichiHaloSkipEffect() {
    if (spawnPixiEffect("sutekichiHaloSkip")) return;
    const origin = getEffectPoint(refs.enemySprite, .45, .42);
    const target = getEffectPoint(refs.heroSprite, .55, .5);
    const effect = document.createElement("div");
    effect.className = "sutekichi-halo-skip-effect";
    effect.style.left = `${origin.x}px`;
    effect.style.top = `${origin.y}px`;
    effect.style.setProperty("--sutekichi-travel-x", `${target.x - origin.x}px`);
    effect.style.setProperty("--sutekichi-travel-y", `${target.y - origin.y}px`);
    effect.append(document.createElement("b"));
    for (let index = 0; index < 6; index += 1) effect.append(document.createElement("i"));
    refs.effects.append(effect);
    setTimeout(() => effect.remove(), 1450);
  }

  function createSutekichiStellaSearchEffect() {
    if (spawnPixiEffect("sutekichiStellaSearch")) return;
    const target = getEffectPoint(refs.heroSprite, .5, .46);
    const effect = document.createElement("div");
    effect.className = "sutekichi-stella-search-effect";
    effect.style.left = `${target.x}px`;
    effect.style.top = `${target.y}px`;
    effect.append(document.createElement("b"), document.createElement("span"));
    for (let index = 0; index < 8; index += 1) {
      const marker = document.createElement("i");
      marker.style.setProperty("--search-angle", `${index * 45}deg`);
      effect.append(marker);
    }
    refs.effects.append(effect);
    setTimeout(() => effect.remove(), 1900);
  }

  function createSutekichiCometCharge() {
    if (spawnPixiEffect("sutekichiCometCharge")) return;
    const origin = getEffectPoint(refs.enemySprite, .5, .38);
    const effect = document.createElement("div");
    effect.className = "sutekichi-comet-charge-effect";
    effect.style.left = `${origin.x}px`;
    effect.style.top = `${origin.y}px`;
    effect.innerHTML = "<b>✦</b><i></i><i></i><i></i>";
    refs.effects.append(effect);
    setTimeout(() => effect.remove(), 1750);
  }

  function createSutekichiComet() {
    if (spawnPixiEffect("sutekichiComet")) return;
    const target = getEffectPoint(refs.heroSprite, .5, .5);
    const effect = document.createElement("div");
    effect.className = "sutekichi-comet-effect";
    effect.style.left = `${target.x}px`;
    effect.style.top = `${target.y}px`;
    effect.innerHTML = "<span></span><b>✦</b>";
    refs.effects.append(effect);
    setTimeout(() => effect.remove(), 1700);
  }

  function createSutekichiCometImpact() {
    if (spawnPixiEffect("sutekichiCometImpact")) return;
    const target = getEffectPoint(refs.heroSprite, .5, .58);
    const effect = document.createElement("div");
    effect.className = "sutekichi-comet-impact-effect";
    effect.style.left = `${target.x}px`;
    effect.style.top = `${target.y}px`;
    for (let index = 0; index < 14; index += 1) {
      const ray = document.createElement("i");
      ray.style.setProperty("--comet-ray", `${index * 25.7}deg`);
      effect.append(ray);
    }
    refs.effects.append(effect);
    setTimeout(() => effect.remove(), 1250);
  }

  function createSutekichiNapDream() {
    if (spawnPixiEffect("sutekichiNapDream")) return;
    const origin = getEffectPoint(refs.enemySprite, .52, .38);
    const effect = document.createElement("div");
    effect.className = "sutekichi-nap-dream-effect";
    effect.style.left = `${origin.x}px`;
    effect.style.top = `${origin.y}px`;
    ["z", "Z", "✦", "○", "Z"].forEach((text, index) => {
      const dream = document.createElement("i");
      dream.textContent = text;
      dream.style.setProperty("--dream-index", index);
      dream.style.setProperty("--dream-delay", `${index * 230}ms`);
      effect.append(dream);
    });
    refs.effects.append(effect);
    setTimeout(() => effect.remove(), 3600);
  }

  function createSutekichiNapResult(success) {
    if (spawnPixiEffect("sutekichiNapResult", { success })) return;
    const origin = getEffectPoint(refs.enemySprite, .5, .5);
    const effect = document.createElement("div");
    effect.className = `sutekichi-nap-result ${success ? "success" : "failure"}`;
    effect.style.left = `${origin.x}px`;
    effect.style.top = `${origin.y}px`;
    for (let index = 0; index < (success ? 16 : 5); index += 1) {
      const mote = document.createElement("i");
      mote.textContent = success ? "✦" : "·";
      mote.style.setProperty("--nap-result-angle", `${index * (360 / (success ? 16 : 5))}deg`);
      effect.append(mote);
    }
    refs.effects.append(effect);
    setTimeout(() => effect.remove(), 1500);
  }

  function createGalaxyCharge() {
    if (spawnPixiEffect("galaxyCharge")) return;
    const origin = getEffectPoint(refs.heroSprite, .72, .53);
    const field = document.createElement("div");
    field.className = "galaxy-charge-field";
    field.style.left = `${origin.x}px`;
    field.style.top = `${origin.y}px`;
    const core = document.createElement("b");
    for (let index = 0; index < 12; index += 1) {
      const particle = document.createElement("i");
      particle.style.setProperty("--charge-particle-angle", `${index * 30}deg`);
      particle.style.setProperty("--charge-particle-delay", `${index * -90}ms`);
      field.append(particle);
    }
    field.append(core);
    refs.effects.append(field);
    setTimeout(() => field.remove(), 1950);
  }

  function createGalaxyFlash() {
    if (state.phase !== "battle") return;
    const arenaRect = refs.arena.getBoundingClientRect();
    const heroRect = refs.heroSprite.getBoundingClientRect();
    const enemyRect = refs.enemySprite.getBoundingClientRect();
    const originX = heroRect.left - arenaRect.left + heroRect.width * .735;
    const originY = heroRect.top - arenaRect.top + heroRect.height * .535;
    const targetX = enemyRect.left - arenaRect.left + enemyRect.width * .52;
    const beamLength = clamp(targetX - originX, 260, arenaRect.width - originX + 70);
    state.galaxyBeamY = originY;
    if (spawnPixiEffect("galaxyFlash")) return;

    const beam = document.createElement("div");
    beam.className = "galaxy-flash";
    beam.style.left = `${originX}px`;
    beam.style.top = `${originY}px`;
    beam.style.setProperty("--beam-length", `${beamLength}px`);
    const source = document.createElement("i");
    source.className = "galaxy-beam-source";
    const stream = document.createElement("i");
    stream.className = "galaxy-beam-stream";
    const head = document.createElement("i");
    head.className = "galaxy-beam-head";
    const particles = document.createElement("span");
    particles.className = "galaxy-beam-particles";
    for (let index = 0; index < 10; index += 1) {
      const particle = document.createElement("i");
      particle.style.setProperty("--particle-y", `${random(-46, 46)}px`);
      particle.style.setProperty("--particle-delay", `${-index * 73}ms`);
      particle.style.setProperty("--particle-scale", random(.55, 1.35).toFixed(2));
      particles.append(particle);
    }
    beam.append(source, stream, head, particles);
    const flash = document.createElement("i");
    flash.className = "screen-flash";
    refs.effects.append(beam, flash);
    setTimeout(() => { beam.remove(); flash.remove(); }, 1250);
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
      punchRush: () => { whoosh(1550, 92, .27, 0, -.66, .027); whoosh(980, 68, .22, .075, .48, .016); },
      ringWhip: () => { whoosh(1850, 150, .58, 0, -.72, .024); tone(340, .48, "triangle", .018, .045, 1120, .5); sparkle([1175,1568], .16, .009); },
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
