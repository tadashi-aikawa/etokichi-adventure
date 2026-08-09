export type Side = "hero" | "enemy";
export type Facing = "left" | "right";
export type CharacterId = "etokichi" | "kuroboshi" | "sutekichi" | "salarymanEtokichi";
export type AttackStat = "power" | "intelligence";
export type TechniqueKind = "strike" | "shot" | "special" | "super" | "support";

export type AnimationId =
  | "physicalPunch"
  | "pentagramNova"
  | "physicalStarRing"
  | "etoileDrive"
  | "galaxyRay"
  | "galaxyFlash"
  | "throwKiss"
  | "physicalMeteorClaw"
  | "physicalCrescentHorn"
  | "darkOrbit"
  | "blackMeteor"
  | "sutekichiStarTouch"
  | "sutekichiHaloSkip"
  | "sutekichiStellaSearch"
  | "sutekichiDiscoveryComet"
  | "sutekichiNap"
  | "businessCardStrike"
  | "closingTimeDash"
  | "angelWink"
  | "approvalMeteor";

export interface FighterStats {
  life: number;
  power: number;
  defense: number;
  accuracy: number;
  evasion: number;
  intelligence: number;
  gutsRegen: number;
}

export interface TechniqueDefinition {
  id: string;
  name: string;
  cardName?: string;
  iconSvg: string;
  cost: number;
  power: number;
  accuracy: number;
  critical: number;
  range: 0 | 1 | 2 | 3;
  duration: number;
  cameraReleaseDelay?: number;
  impactDelay?: number;
  kind: TechniqueKind;
  animation: AnimationId;
  attackStat: AttackStat;
  gutsDamage: number;
  knockback?: number;
  healFull?: boolean;
  successChance?: number;
  charmChance?: number;
  closesDistance?: boolean;
}

export interface CharacterImages {
  idle: string;
  battleIdle: string;
  walk?: readonly string[];
  [key: string]: string | readonly string[] | undefined;
}

export interface CharacterProfile {
  id: CharacterId;
  baseFacing: Facing;
  imageFacings?: Readonly<Record<string, Facing>>;
  visualScale?: number;
  name: string;
  subtitle: string;
  abilitiesLabel: string;
  images: CharacterImages;
  introPoseKeys: readonly string[];
  versusPoseKey: string;
  stats: FighterStats;
  abilities: readonly string[];
  techniques: readonly TechniqueDefinition[];
}

export interface BattleActor {
  side: Side;
  profile: CharacterProfile;
}
