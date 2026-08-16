// Level and World definitions for WreckWorks.
// Supports multi-world configuration while keeping the core game engine unified and backward-compatible.

export type BlockMaterial = 'wood' | 'brick' | 'concrete' | 'metal' | 'crate' | 'explosive_barrel' | 'heavy_ball';

export interface BlockDef {
  x: number;
  y: number; // center Y
  z?: number;
  w: number; // width
  h: number; // height
  d?: number; // depth
  material: BlockMaterial;
  rot?: number; // rotation around z-axis (radians)
  isTarget?: boolean; // required-to-destroy target
  isSphere?: boolean; // physics sphere with rolling kinematics
  isExplosive?: boolean;
  explosionRadius?: number;
  explosionForce?: number;
}

export interface LevelDef {
  id: number;
  worldId: number;
  name: string;
  hint?: string;
  shots: number; // max shots
  blocks: BlockDef[];
  starThresholds: {
    one: number; // shots <= one => 1 star (must clear)
    two: number;
    three: number;
  };
}

export interface WorldDef {
  id: number;
  name: string;
  subtitle: string;
  themeKey: 'construction' | 'pirate';
  badgeLabel: string;
  backgroundAsset: any;
  ambientColor: number;
  ambientIntensity: number;
  sunColor: number;
  sunIntensity: number;
  skyFillColor: number;
  groundProps: 'construction' | 'pirate_harbor';
  levels: LevelDef[];
}

const MAT = {
  wood: 'wood' as BlockMaterial,
  brick: 'brick' as BlockMaterial,
  concrete: 'concrete' as BlockMaterial,
  metal: 'metal' as BlockMaterial,
  crate: 'crate' as BlockMaterial,
  explosive_barrel: 'explosive_barrel' as BlockMaterial,
  heavy_ball: 'heavy_ball' as BlockMaterial,
};

// Helper — a simple stacked tower of wood blocks (relative to ground)
function stackTower(cx: number, base: number, count: number, mat: BlockMaterial, w = 0.8, h = 0.8): BlockDef[] {
  const arr: BlockDef[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({ x: cx, y: base + h / 2 + i * h, w, h, material: mat, isTarget: true });
  }
  return arr;
}

// -------------------------------------------------------------
// WORLD 1: CONSTRUCTION SITE (Levels 1 – 10)
// -------------------------------------------------------------
const WORLD_1_LEVELS: LevelDef[] = [
  // L1 - First Impact
  {
    id: 1,
    worldId: 1,
    name: 'First Impact',
    hint: 'DRAG TO AIM   •   RELEASE TO FIRE',
    shots: 5,
    blocks: stackTower(3, 0, 3, MAT.wood),
    starThresholds: { one: 5, two: 3, three: 2 },
  },
  // L2 - The Stack
  {
    id: 2,
    worldId: 1,
    name: 'The Stack',
    shots: 5,
    blocks: [
      { x: 3, y: 0.4, w: 0.8, h: 0.8, material: MAT.crate, isTarget: true },
      { x: 3, y: 1.2, w: 0.8, h: 0.8, material: MAT.wood, isTarget: true },
      { x: 3, y: 2.0, w: 0.8, h: 0.8, material: MAT.crate, isTarget: true },
      { x: 3, y: 2.8, w: 0.8, h: 0.8, material: MAT.wood, isTarget: true },
    ],
    starThresholds: { one: 5, two: 3, three: 2 },
  },
  // L3 - Weak Point
  {
    id: 3,
    worldId: 1,
    name: 'Weak Point',
    shots: 4,
    blocks: [
      { x: 3, y: 0.4, w: 0.6, h: 0.8, material: MAT.wood, isTarget: true },
      { x: 3, y: 1.2, w: 0.6, h: 0.8, material: MAT.wood, isTarget: true },
      { x: 3, y: 2.0, w: 0.6, h: 0.8, material: MAT.wood, isTarget: true },
      { x: 3, y: 2.9, w: 1.6, h: 1.0, material: MAT.wood, isTarget: true },
    ],
    starThresholds: { one: 4, two: 2, three: 1 },
  },
  // L4 - Mixed Materials
  {
    id: 4,
    worldId: 1,
    name: 'Mixed Materials',
    shots: 4,
    blocks: [
      { x: 2.3, y: 0.5, w: 0.5, h: 1.0, material: MAT.wood },
      { x: 3.7, y: 0.5, w: 0.5, h: 1.0, material: MAT.wood },
      { x: 3, y: 1.25, w: 2.0, h: 0.5, material: MAT.brick, isTarget: true },
      { x: 3, y: 2.0, w: 0.8, h: 1.0, material: MAT.brick, isTarget: true },
    ],
    starThresholds: { one: 4, two: 2, three: 1 },
  },
  // L5 - Chain Reaction
  {
    id: 5,
    worldId: 1,
    name: 'Chain Reaction',
    shots: 3,
    blocks: [
      { x: 2.5, y: 0.5, w: 0.4, h: 1.0, material: MAT.wood, isTarget: true },
      { x: 3.2, y: 0.5, w: 0.4, h: 1.0, material: MAT.wood, isTarget: true },
      { x: 3.9, y: 0.5, w: 0.4, h: 1.0, material: MAT.wood, isTarget: true },
      { x: 4.6, y: 0.5, w: 0.4, h: 1.0, material: MAT.wood, isTarget: true },
      { x: 5.3, y: 0.5, w: 0.4, h: 1.0, material: MAT.wood, isTarget: true },
      { x: 3.9, y: 1.3, w: 0.8, h: 0.6, material: MAT.crate, isTarget: true },
    ],
    starThresholds: { one: 3, two: 2, three: 1 },
  },
  // L6 - The Bridge
  {
    id: 6,
    worldId: 1,
    name: 'The Bridge',
    shots: 4,
    blocks: [
      { x: 2.3, y: 0.6, w: 0.5, h: 1.2, material: MAT.brick },
      { x: 4.5, y: 0.6, w: 0.5, h: 1.2, material: MAT.brick },
      { x: 3.4, y: 1.35, w: 2.6, h: 0.3, material: MAT.wood, isTarget: true },
      { x: 3.0, y: 1.75, w: 0.6, h: 0.5, material: MAT.crate, isTarget: true },
      { x: 3.8, y: 1.75, w: 0.6, h: 0.5, material: MAT.crate, isTarget: true },
    ],
    starThresholds: { one: 4, two: 2, three: 1 },
  },
  // L7 - Heavy Load
  {
    id: 7,
    worldId: 1,
    name: 'Heavy Load',
    shots: 5,
    blocks: [
      { x: 3, y: 0.5, w: 1.4, h: 1.0, material: MAT.concrete, isTarget: true },
      { x: 3, y: 1.5, w: 1.0, h: 1.0, material: MAT.concrete, isTarget: true },
      { x: 3, y: 2.5, w: 0.6, h: 1.0, material: MAT.brick, isTarget: true },
      { x: 3, y: 3.4, w: 0.8, h: 0.8, material: MAT.crate, isTarget: true },
    ],
    starThresholds: { one: 5, two: 3, three: 2 },
  },
  // L8 - Limited Shots
  {
    id: 8,
    worldId: 1,
    name: 'Limited Shots',
    shots: 3,
    blocks: [
      { x: 3, y: 0.5, w: 0.6, h: 1.0, material: MAT.wood, isTarget: true },
      { x: 3, y: 1.5, w: 0.6, h: 1.0, material: MAT.wood, isTarget: true },
      { x: 3, y: 2.5, w: 0.6, h: 1.0, material: MAT.wood, isTarget: true },
      { x: 4.5, y: 0.5, w: 0.6, h: 1.0, material: MAT.wood, isTarget: true },
      { x: 4.5, y: 1.5, w: 0.6, h: 1.0, material: MAT.wood, isTarget: true },
    ],
    starThresholds: { one: 3, two: 2, three: 1 },
  },
  // L9 - Precision
  {
    id: 9,
    worldId: 1,
    name: 'Precision',
    shots: 4,
    blocks: [
      { x: 2.3, y: 1.0, w: 0.5, h: 2.0, material: MAT.concrete },
      { x: 4.7, y: 1.0, w: 0.5, h: 2.0, material: MAT.concrete },
      { x: 3.5, y: 0.35, w: 0.6, h: 0.7, material: MAT.wood, isTarget: true },
      { x: 3.5, y: 1.0, w: 0.6, h: 0.6, material: MAT.brick, isTarget: true },
      { x: 3.5, y: 1.7, w: 0.6, h: 0.7, material: MAT.wood, isTarget: true },
    ],
    starThresholds: { one: 4, two: 2, three: 1 },
  },
  // L10 - Master Builder
  {
    id: 10,
    worldId: 1,
    name: 'Master Builder',
    shots: 6,
    blocks: [
      { x: 2.5, y: 0.5, w: 0.6, h: 1.0, material: MAT.concrete },
      { x: 4.5, y: 0.5, w: 0.6, h: 1.0, material: MAT.concrete },
      { x: 3.5, y: 1.15, w: 2.4, h: 0.3, material: MAT.wood, isTarget: true },
      { x: 2.8, y: 1.75, w: 0.5, h: 0.9, material: MAT.brick, isTarget: true },
      { x: 4.2, y: 1.75, w: 0.5, h: 0.9, material: MAT.brick, isTarget: true },
      { x: 3.5, y: 2.35, w: 2.0, h: 0.3, material: MAT.wood, isTarget: true },
      { x: 3.5, y: 2.9, w: 0.9, h: 0.8, material: MAT.crate, isTarget: true },
      { x: 3.0, y: 3.55, w: 0.5, h: 0.5, material: MAT.wood, isTarget: true },
      { x: 4.0, y: 3.55, w: 0.5, h: 0.5, material: MAT.wood, isTarget: true },
    ],
    starThresholds: { one: 6, two: 4, three: 2 },
  },
];

// -------------------------------------------------------------
// WORLD 2: PIRATE HARBOR (Levels 11 – 20) — HEAVY ROLLING HAZARDS
// -------------------------------------------------------------
const WORLD_2_LEVELS: LevelDef[] = [
  // L1 (Global 11) - The Rolling Keg
  {
    id: 11,
    worldId: 2,
    name: 'The Rolling Keg',
    hint: 'SHOOT THE RAMP SUPPORT TO RELEASE THE HEAVY BALL',
    shots: 3,
    blocks: [
      { x: 4.7, y: 0.7, w: 0.4, h: 1.4, material: MAT.wood },
      { x: 4.7, y: 1.5, w: 0.8, h: 0.25, material: MAT.wood }, // Flat resting shelf
      { x: 4.7, y: 1.95, w: 0.7, h: 0.7, material: MAT.heavy_ball, isSphere: true },
      { x: 5.7, y: 0.95, w: 1.8, h: 0.22, material: MAT.wood, rot: -0.28 }, // Down-ramp
      // Target dock crates
      { x: 7.2, y: 0.4, w: 0.8, h: 0.8, material: MAT.crate, isTarget: true },
      { x: 7.2, y: 1.2, w: 0.8, h: 0.8, material: MAT.crate, isTarget: true },
      { x: 7.2, y: 1.9, w: 0.8, h: 0.6, material: MAT.wood, isTarget: true },
    ],
    starThresholds: { one: 3, two: 2, three: 1 },
  },

  // L2 (Global 12) - The Ramp & Pillar
  {
    id: 12,
    worldId: 2,
    name: 'The Ramp & Pillar',
    shots: 3,
    blocks: [
      { x: 4.5, y: 0.9, w: 0.5, h: 1.8, material: MAT.concrete },
      { x: 4.5, y: 1.9, w: 0.8, h: 0.25, material: MAT.wood }, // Flat resting shelf
      { x: 4.5, y: 2.35, w: 0.75, h: 0.75, material: MAT.heavy_ball, isSphere: true },
      { x: 5.6, y: 1.35, w: 2.0, h: 0.22, material: MAT.wood, rot: -0.3 }, // Down-ramp
      // Target tower
      { x: 6.8, y: 0.55, w: 0.4, h: 1.1, material: MAT.wood, isTarget: true },
      { x: 7.8, y: 0.75, w: 0.4, h: 1.5, material: MAT.brick },
      { x: 7.3, y: 1.35, w: 1.8, h: 0.25, material: MAT.wood, isTarget: true },
      { x: 7.0, y: 1.85, w: 0.7, h: 0.7, material: MAT.crate, isTarget: true },
      { x: 7.6, y: 1.85, w: 0.7, h: 0.7, material: MAT.crate, isTarget: true },
    ],
    starThresholds: { one: 3, two: 2, three: 1 },
  },

  // L3 (Global 13) - Double Ramp Cascade
  {
    id: 13,
    worldId: 2,
    name: 'Double Cascade',
    shots: 3,
    blocks: [
      { x: 4.8, y: 1.2, w: 0.4, h: 2.4, material: MAT.wood },
      { x: 4.8, y: 2.5, w: 0.8, h: 0.25, material: MAT.wood }, // Flat resting shelf
      { x: 4.8, y: 2.95, w: 0.7, h: 0.7, material: MAT.heavy_ball, isSphere: true },
      { x: 5.8, y: 2.0, w: 1.8, h: 0.22, material: MAT.wood, rot: -0.25 }, // High ramp
      { x: 6.6, y: 1.15, w: 1.8, h: 0.22, material: MAT.wood, rot: -0.25 }, // Mid ramp
      // Target warehouse
      { x: 7.6, y: 0.45, w: 0.4, h: 0.9, material: MAT.wood, isTarget: true },
      { x: 8.6, y: 0.45, w: 0.4, h: 0.9, material: MAT.wood, isTarget: true },
      { x: 8.1, y: 1.05, w: 1.8, h: 0.3, material: MAT.brick, isTarget: true },
      { x: 8.1, y: 1.55, w: 0.7, h: 0.7, material: MAT.crate, isTarget: true },
      { x: 8.1, y: 2.2, w: 0.6, h: 0.6, material: MAT.crate, isTarget: true },
    ],
    starThresholds: { one: 3, two: 2, three: 1 },
  },

  // L4 (Global 14) - Cantilever Teeter
  {
    id: 14,
    worldId: 2,
    name: 'Cantilever Teeter',
    hint: 'BREAK THE SAFETY PROP TO TIP THE SEESAW',
    shots: 4,
    blocks: [
      { x: 6.2, y: 0.5, w: 0.5, h: 1.0, material: MAT.concrete },
      { x: 4.8, y: 0.5, w: 0.35, h: 1.0, material: MAT.wood }, // Safety prop
      { x: 6.2, y: 1.15, w: 3.8, h: 0.3, material: MAT.wood, isTarget: true },
      { x: 4.8, y: 1.7, w: 0.8, h: 0.8, material: MAT.heavy_ball, isSphere: true },
      // Counterweight stack
      { x: 7.4, y: 1.7, w: 0.75, h: 0.8, material: MAT.crate, isTarget: true },
      { x: 7.4, y: 2.45, w: 0.75, h: 0.7, material: MAT.crate, isTarget: true },
      { x: 7.4, y: 3.1, w: 0.6, h: 0.6, material: MAT.wood, isTarget: true },
    ],
    starThresholds: { one: 4, two: 2, three: 1 },
  },

  // L5 (Global 15) - Twin Fortresses
  {
    id: 15,
    worldId: 2,
    name: 'Twin Fortresses',
    shots: 4,
    blocks: [
      // Left Fort
      { x: 4.6, y: 0.6, w: 0.45, h: 1.2, material: MAT.brick },
      { x: 5.6, y: 0.6, w: 0.45, h: 1.2, material: MAT.brick },
      { x: 5.1, y: 1.35, w: 1.6, h: 0.3, material: MAT.wood, isTarget: true },
      { x: 5.0, y: 1.9, w: 0.75, h: 0.75, material: MAT.heavy_ball, isSphere: true },
      // Sky Bridge
      { x: 6.4, y: 1.35, w: 1.4, h: 0.2, material: MAT.wood, isTarget: true },
      // Right Fort
      { x: 7.2, y: 0.6, w: 0.45, h: 1.2, material: MAT.concrete },
      { x: 8.2, y: 0.6, w: 0.45, h: 1.2, material: MAT.concrete },
      { x: 7.7, y: 1.35, w: 1.6, h: 0.3, material: MAT.brick, isTarget: true },
      { x: 7.7, y: 1.85, w: 0.7, h: 0.7, material: MAT.crate, isTarget: true },
      { x: 7.7, y: 2.5, w: 0.7, h: 0.6, material: MAT.wood, isTarget: true },
    ],
    starThresholds: { one: 4, two: 2, three: 1 },
  },

  // L6 (Global 16) - The Drawbridge
  {
    id: 16,
    worldId: 2,
    name: 'The Drawbridge',
    shots: 4,
    blocks: [
      { x: 4.6, y: 0.75, w: 0.6, h: 1.5, material: MAT.brick },
      { x: 8.0, y: 0.75, w: 0.6, h: 1.5, material: MAT.brick },
      { x: 6.3, y: 0.55, w: 0.35, h: 1.1, material: MAT.wood },
      { x: 6.3, y: 1.65, w: 4.2, h: 0.3, material: MAT.wood, isTarget: true },
      { x: 5.5, y: 2.2, w: 0.75, h: 0.75, material: MAT.heavy_ball, isSphere: true },
      { x: 6.3, y: 2.15, w: 0.7, h: 0.7, material: MAT.crate, isTarget: true },
      { x: 7.1, y: 2.2, w: 0.75, h: 0.75, material: MAT.heavy_ball, isSphere: true },
      { x: 6.3, y: 2.8, w: 0.65, h: 0.6, material: MAT.wood, isTarget: true },
    ],
    starThresholds: { one: 4, two: 2, three: 1 },
  },

  // L7 (Global 17) - Galleon Rigging
  {
    id: 17,
    worldId: 2,
    name: 'Galleon Rigging',
    shots: 4,
    blocks: [
      { x: 6.2, y: 0.4, w: 3.2, h: 0.8, material: MAT.wood },
      { x: 4.8, y: 1.0, w: 0.5, h: 0.8, material: MAT.wood },
      { x: 7.6, y: 1.0, w: 0.5, h: 0.8, material: MAT.wood },
      { x: 6.2, y: 1.55, w: 3.8, h: 0.3, material: MAT.wood, isTarget: true },
      { x: 5.2, y: 2.05, w: 0.7, h: 0.7, material: MAT.crate, isTarget: true },
      { x: 7.2, y: 2.05, w: 0.7, h: 0.7, material: MAT.crate, isTarget: true },
      { x: 6.2, y: 2.2, w: 0.4, h: 1.0, material: MAT.wood },
      { x: 6.2, y: 2.85, w: 2.0, h: 0.25, material: MAT.wood, isTarget: true },
      { x: 6.2, y: 3.4, w: 0.8, h: 0.8, material: MAT.heavy_ball, isSphere: true },
      { x: 6.2, y: 4.05, w: 0.6, h: 0.5, material: MAT.crate, isTarget: true },
    ],
    starThresholds: { one: 4, two: 2, three: 1 },
  },

  // L8 (Global 18) - Harbor Gauntlet
  {
    id: 18,
    worldId: 2,
    name: 'Harbor Gauntlet',
    hint: '3 SHOTS — USE HIGH-ARC TRAJECTORY',
    shots: 3,
    blocks: [
      { x: 4.8, y: 0.9, w: 0.45, h: 1.8, material: MAT.metal },
      { x: 8.0, y: 0.9, w: 0.5, h: 1.8, material: MAT.concrete },
      { x: 6.4, y: 2.0, w: 2.6, h: 0.25, material: MAT.wood, rot: -0.22 },
      { x: 5.6, y: 2.55, w: 0.75, h: 0.75, material: MAT.heavy_ball, isSphere: true },
      // Internal Vault
      { x: 6.4, y: 0.45, w: 0.7, h: 0.9, material: MAT.wood, isTarget: true },
      { x: 7.2, y: 0.45, w: 0.7, h: 0.9, material: MAT.crate, isTarget: true },
      { x: 6.8, y: 1.15, w: 1.8, h: 0.3, material: MAT.brick, isTarget: true },
      { x: 6.8, y: 1.7, w: 0.7, h: 0.7, material: MAT.crate, isTarget: true },
    ],
    starThresholds: { one: 3, two: 2, three: 1 },
  },

  // L9 (Global 19) - Admiral's Bastion
  {
    id: 19,
    worldId: 2,
    name: "Admiral's Bastion",
    shots: 4,
    blocks: [
      { x: 4.8, y: 0.55, w: 0.5, h: 1.1, material: MAT.brick },
      { x: 6.2, y: 0.55, w: 0.5, h: 1.1, material: MAT.concrete },
      { x: 7.6, y: 0.55, w: 0.5, h: 1.1, material: MAT.brick },
      { x: 6.2, y: 1.25, w: 3.6, h: 0.35, material: MAT.brick, isTarget: true },
      { x: 5.2, y: 1.8, w: 0.75, h: 0.75, material: MAT.heavy_ball, isSphere: true },
      { x: 7.2, y: 1.8, w: 0.7, h: 0.75, material: MAT.crate, isTarget: true },
      { x: 5.8, y: 2.1, w: 0.4, h: 0.9, material: MAT.wood, isTarget: true },
      { x: 6.8, y: 2.1, w: 0.4, h: 0.9, material: MAT.wood, isTarget: true },
      { x: 6.3, y: 2.7, w: 2.2, h: 0.3, material: MAT.wood, isTarget: true },
      { x: 6.3, y: 3.25, w: 0.75, h: 0.75, material: MAT.heavy_ball, isSphere: true },
      { x: 6.3, y: 3.85, w: 0.6, h: 0.5, material: MAT.crate, isTarget: true },
    ],
    starThresholds: { one: 4, two: 2, three: 1 },
  },

  // L10 (Global 20) - Sink the Harbor
  {
    id: 20,
    worldId: 2,
    name: 'Sink the Harbor',
    hint: 'TOTAL HARBOR DESTRUCTION',
    shots: 5,
    blocks: [
      // Galleon Base (Left)
      { x: 4.2, y: 0.45, w: 1.0, h: 0.9, material: MAT.wood },
      { x: 5.4, y: 0.45, w: 1.0, h: 0.9, material: MAT.wood },
      { x: 4.8, y: 1.1, w: 2.2, h: 0.3, material: MAT.wood, isTarget: true },
      { x: 4.8, y: 1.7, w: 0.35, h: 0.9, material: MAT.wood },
      { x: 4.8, y: 2.3, w: 1.8, h: 0.25, material: MAT.wood, rot: -0.2 },
      { x: 4.4, y: 2.8, w: 0.75, h: 0.75, material: MAT.heavy_ball, isSphere: true },
      { x: 5.3, y: 1.6, w: 0.65, h: 0.7, material: MAT.crate, isTarget: true },
      // Dock Bridge
      { x: 6.3, y: 1.1, w: 1.6, h: 0.25, material: MAT.wood, isTarget: true },
      { x: 6.3, y: 1.6, w: 0.65, h: 0.7, material: MAT.crate, isTarget: true },
      // Watchtower (Right)
      { x: 7.2, y: 0.55, w: 0.5, h: 1.1, material: MAT.brick },
      { x: 8.4, y: 0.55, w: 0.5, h: 1.1, material: MAT.concrete },
      { x: 7.8, y: 1.25, w: 2.0, h: 0.3, material: MAT.brick, isTarget: true },
      { x: 7.4, y: 1.8, w: 0.4, h: 0.8, material: MAT.wood, isTarget: true },
      { x: 8.2, y: 1.8, w: 0.4, h: 0.8, material: MAT.wood, isTarget: true },
      { x: 7.8, y: 2.35, w: 1.8, h: 0.3, material: MAT.wood, isTarget: true },
      { x: 7.8, y: 2.9, w: 0.75, h: 0.75, material: MAT.heavy_ball, isSphere: true },
      { x: 7.8, y: 3.5, w: 0.7, h: 0.6, material: MAT.crate, isTarget: true },
    ],
    starThresholds: { one: 5, two: 3, three: 1 },
  },
];

// -------------------------------------------------------------
// WORLDS REGISTRY
// -------------------------------------------------------------
export const WORLDS: WorldDef[] = [
  {
    id: 1,
    name: 'Construction Site',
    subtitle: 'World 1',
    themeKey: 'construction',
    badgeLabel: 'PHYSICS PUZZLE',
    backgroundAsset: require('../../assets/images/industrial_bg.jpg'),
    ambientColor: 0xffffff,
    ambientIntensity: 0.72,
    sunColor: 0xfff4db,
    sunIntensity: 1.3,
    skyFillColor: 0x8bc0ec,
    groundProps: 'construction',
    levels: WORLD_1_LEVELS,
  },
  {
    id: 2,
    name: 'Pirate Harbor',
    subtitle: 'World 2',
    themeKey: 'pirate',
    badgeLabel: 'ROLLING HAZARDS',
    backgroundAsset: require('../../assets/images/pirate_harbor_bg.jpg'),
    ambientColor: 0xf0f9ff,
    ambientIntensity: 0.82,
    sunColor: 0xfff0c2,
    sunIntensity: 1.35,
    skyFillColor: 0x38bdf8,
    groundProps: 'pirate_harbor',
    levels: WORLD_2_LEVELS,
  },
];

// Backward-compatible flat array of all levels across worlds
export const LEVELS: LevelDef[] = WORLDS.flatMap(w => w.levels);

export function getWorldByLevelId(levelId: number): WorldDef {
  const found = WORLDS.find(w => w.levels.some(l => l.id === levelId));
  return found || WORLDS[0];
}

export function getWorldById(worldId: number): WorldDef {
  return WORLDS.find(w => w.id === worldId) || WORLDS[0];
}

// -------------------------------------------------------------
// MATERIAL PROFILES
// -------------------------------------------------------------
export const MATERIAL_PROFILE: Record<BlockMaterial, {
  mass: number;
  color: string;
  edge: string;
  hp: number; // hits to break (visual only)
  restitution: number;
  friction: number;
  isSphere?: boolean;
  isExplosive?: boolean;
  explosionRadius?: number;
  explosionForce?: number;
}> = {
  wood:             { mass: 1.2, color: '#C88A4A', edge: '#7A4B1F', hp: 2, restitution: 0.15, friction: 0.6 },
  brick:            { mass: 3.0, color: '#B84A2A', edge: '#5A1F10', hp: 3, restitution: 0.05, friction: 0.7 },
  concrete:         { mass: 5.0, color: '#9CA3AF', edge: '#374151', hp: 4, restitution: 0.02, friction: 0.8 },
  metal:            { mass: 6.0, color: '#6B7280', edge: '#1F2937', hp: 6, restitution: 0.1,  friction: 0.5 },
  crate:            { mass: 0.6, color: '#D5A15A', edge: '#7A4B1F', hp: 1, restitution: 0.25, friction: 0.55 },
  heavy_ball:       { mass: 8.5, color: '#1e293b', edge: '#0f172a', hp: 10, restitution: 0.35, friction: 0.18, isSphere: true },
  explosive_barrel: {
    mass: 1.0,
    color: '#DC2626',
    edge: '#7F1D1D',
    hp: 1,
    restitution: 0.2,
    friction: 0.6,
    isExplosive: true,
    explosionRadius: 2.2,
    explosionForce: 30,
  },
};
