// Level definitions for WreckWorks — World 1: Construction Site.
// Each block is expressed in world units. Ground is at y=0.
// Physics world uses simple boxes.

export type BlockMaterial = 'wood' | 'brick' | 'concrete' | 'metal' | 'crate';

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
}

export interface LevelDef {
  id: number;
  name: string;
  hint?: string;
  shots: number; // max shots
  blocks: BlockDef[];
  // Star thresholds (shots used)
  starThresholds: {
    one: number; // shots <= one => 1 star (must clear)
    two: number;
    three: number;
  };
}

const MAT = {
  wood: 'wood' as BlockMaterial,
  brick: 'brick' as BlockMaterial,
  concrete: 'concrete' as BlockMaterial,
  metal: 'metal' as BlockMaterial,
  crate: 'crate' as BlockMaterial,
};

// Helper — a simple stacked tower of wood blocks (relative to ground)
function stackTower(cx: number, base: number, count: number, mat: BlockMaterial, w = 0.8, h = 0.8): BlockDef[] {
  const arr: BlockDef[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({ x: cx, y: base + h / 2 + i * h, w, h, material: mat, isTarget: true });
  }
  return arr;
}

export const LEVELS: LevelDef[] = [
  // L1 - First Impact - one tiny tower of 3 wood blocks
  {
    id: 1,
    name: 'First Impact',
    hint: 'DRAG TO AIM   •   RELEASE TO FIRE',
    shots: 5,
    blocks: stackTower(3, 0, 3, MAT.wood),
    starThresholds: { one: 5, two: 3, three: 2 },
  },
  // L2 - The Stack - crates + wood
  {
    id: 2,
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
  // L3 - Weak Point - tall pillar with wide top; hit lower to topple
  {
    id: 3,
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
  // L4 - Mixed Materials - wood pillars supporting a brick beam
  {
    id: 4,
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
  // L5 - Chain Reaction - a row of pieces to topple
  {
    id: 5,
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
  // L7 - Heavy Load - concrete
  {
    id: 7,
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
  // L8 - Limited Shots - only 3
  {
    id: 8,
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
  // L9 - Precision - protect walls, hit gap
  {
    id: 9,
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
  // L10 - Master Builder — everything!
  {
    id: 10,
    name: 'Master Builder',
    shots: 6,
    blocks: [
      // Base
      { x: 2.5, y: 0.5, w: 0.6, h: 1.0, material: MAT.concrete },
      { x: 4.5, y: 0.5, w: 0.6, h: 1.0, material: MAT.concrete },
      { x: 3.5, y: 1.15, w: 2.4, h: 0.3, material: MAT.wood, isTarget: true },
      // Middle floor
      { x: 2.8, y: 1.75, w: 0.5, h: 0.9, material: MAT.brick, isTarget: true },
      { x: 4.2, y: 1.75, w: 0.5, h: 0.9, material: MAT.brick, isTarget: true },
      { x: 3.5, y: 2.35, w: 2.0, h: 0.3, material: MAT.wood, isTarget: true },
      // Top
      { x: 3.5, y: 2.9, w: 0.9, h: 0.8, material: MAT.crate, isTarget: true },
      { x: 3.0, y: 3.55, w: 0.5, h: 0.5, material: MAT.wood, isTarget: true },
      { x: 4.0, y: 3.55, w: 0.5, h: 0.5, material: MAT.wood, isTarget: true },
    ],
    starThresholds: { one: 6, two: 4, three: 2 },
  },
];

// Material physics profile
export const MATERIAL_PROFILE: Record<BlockMaterial, {
  mass: number;
  color: string;
  edge: string;
  hp: number; // hits to break (visual only)
  restitution: number;
  friction: number;
}> = {
  wood:     { mass: 1.2, color: '#C88A4A', edge: '#7A4B1F', hp: 2, restitution: 0.15, friction: 0.6 },
  brick:    { mass: 3.0, color: '#B84A2A', edge: '#5A1F10', hp: 3, restitution: 0.05, friction: 0.7 },
  concrete: { mass: 5.0, color: '#9CA3AF', edge: '#374151', hp: 4, restitution: 0.02, friction: 0.8 },
  metal:    { mass: 6.0, color: '#6B7280', edge: '#1F2937', hp: 6, restitution: 0.1,  friction: 0.5 },
  crate:    { mass: 0.6, color: '#D5A15A', edge: '#7A4B1F', hp: 1, restitution: 0.25, friction: 0.55 },
};
