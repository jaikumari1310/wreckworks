// WreckWorks — 3D physics gameplay engine.
// Uses expo-gl + three.js for rendering, cannon-es for physics.
// Side-view style: physics evolves mostly in the XY plane; Z is thin
// so collisions still feel volumetric.

import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent, Text, Platform, ImageBackground } from 'react-native';
import { LevelDef, BlockDef, MATERIAL_PROFILE, BlockMaterial, getWorldByLevelId, WorldDef } from './levels';
import { theme } from './theme';
import { sfx } from './sfx';

export interface GameEvents {
  onScoreChange: (score: number) => void;
  onShotFired: (shotsUsed: number) => void;
  onChain: (count: number, sx: number, sy: number) => void;
  onLevelComplete: (result: { score: number; shotsUsed: number; destroyed: number; totalTargets: number }) => void;
  onFail: (result: { score: number; shotsUsed: number; destroyed: number; totalTargets: number }) => void;
}

interface AimState {
  active: boolean;
  angle: number; // radians, angle above horizontal
  power: number; // 0..1
  dx: number; // raw drag
  dy: number;
}

interface VisualParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  ttl: number;
  maxTtl: number;
}

interface DynamicBlock {
  def: BlockDef;
  mesh: THREE.Mesh;
  body: CANNON.Body;
  initialPos: THREE.Vector3;
  destroyed: boolean;
}

const MAX_POWER = 22; // m/s
const GRAVITY = -18;
const CANNON_POS = new THREE.Vector3(-1.0, 0.9, 0);
const BARREL_LEN = 0.9;
const FIRE_COOLDOWN_MS = 600; // Minimum time between consecutive shots

export interface GameSceneHandle {
  reset: () => void;
}

export function GameScene({
  level,
  events,
  paused,
}: {
  level: LevelDef;
  events: GameEvents;
  paused: boolean;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const worldRef = useRef<CANNON.World | null>(null);
  const blocksRef = useRef<DynamicBlock[]>([]);
  const ballsRef = useRef<{ mesh: THREE.Mesh; body: CANNON.Body; birth: number; lastImpact: number }[]>([]);
  const trajectoryDotsRef = useRef<THREE.Mesh[]>([]);
  const cannonMeshRef = useRef<THREE.Group | null>(null);
  const shakeRef = useRef(0);
  const shotsUsedRef = useRef(0);
  const scoreRef = useRef(0);
  const completedRef = useRef(false);
  const destroyedThisShotRef = useRef(0);
  const comboFiredRef = useRef(false);
  const aimRef = useRef<AimState>({ active: false, angle: Math.PI / 4, power: 0.5, dx: 0, dy: 0 });
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const particlesRef = useRef<VisualParticle[]>([]);
  const lastFireTimeRef = useRef(0);
  const dustGeoRef = useRef<THREE.DodecahedronGeometry | null>(null);
  // Game-feel + flow refs
  const recoilRef = useRef(0);
  const muzzleFlashRef = useRef<THREE.Mesh | null>(null);
  const flashTtlRef = useRef(0);
  const slowmoUntilRef = useRef(0);
  const completeSentRef = useRef(false);
  const pendingResultRef = useRef<{ cleared: boolean; data: any } | null>(null);
  const zoomRef = useRef(0); // eased 0..1
  const zoomActiveRef = useRef(false);
  const zoomTargetRef = useRef(new THREE.Vector3(3.2, 1.5, 0));
  const lastReportedChainRef = useRef(0);

  pausedRef.current = paused;

  const totalTargets = useMemo(() => level.blocks.filter(b => b.isTarget).length, [level]);

  // --- Aim helpers ------------------------------------------------
  const setAimFromDrag = (dx: number, dy: number) => {
    // Player drags AWAY from cannon: down-right drag => fire up-left.
    // Cannon fires to the RIGHT, so we invert dx sign.
    const invX = -dx;
    const invY = -dy;
    let angle = Math.atan2(invY, invX);
    // Clamp angle between 5° and 85°
    const minA = 5 * Math.PI / 180;
    const maxA = 85 * Math.PI / 180;
    if (angle < minA) angle = minA;
    if (angle > maxA) angle = maxA;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const power = Math.max(0.15, Math.min(1, dist / 220));

    aimRef.current = { active: true, angle, power, dx, dy };
    updateBarrelRotation();
    updateTrajectory();
  };

  const updateBarrelRotation = () => {
    if (!cannonMeshRef.current) return;
    cannonMeshRef.current.rotation.z = aimRef.current.angle;
  };

  const computeMuzzle = () => {
    const a = aimRef.current.angle;
    return new THREE.Vector3(
      CANNON_POS.x + Math.cos(a) * BARREL_LEN,
      CANNON_POS.y + Math.sin(a) * BARREL_LEN,
      0,
    );
  };

  const computeInitialVelocity = () => {
    const a = aimRef.current.angle;
    const speed = MAX_POWER * aimRef.current.power;
    return new CANNON.Vec3(Math.cos(a) * speed, Math.sin(a) * speed, 0);
  };

  const updateTrajectory = () => {
    const dots = trajectoryDotsRef.current;
    const muzzle = computeMuzzle();
    const v = computeInitialVelocity();
    const dt = 0.06;
    for (let i = 0; i < dots.length; i++) {
      const t = i * dt;
      const x = muzzle.x + v.x * t;
      const y = muzzle.y + v.y * t + 0.5 * GRAVITY * t * t;
      dots[i].position.set(x, y, 0.05);
      const visible = aimRef.current.active && y > -0.4 && x < 12;
      dots[i].visible = visible;
      // Fade
      const mat = dots[i].material as THREE.MeshBasicMaterial;
      mat.opacity = visible ? Math.max(0.15, 1 - i / dots.length) : 0;
    }
  };

  const hideTrajectory = () => {
    trajectoryDotsRef.current.forEach(d => (d.visible = false));
  };

  const fire = () => {
    if (completedRef.current) return;
    if (shotsUsedRef.current >= level.shots) return;

    // 1. Firing cooldown check (prevents accidental rapid fire / overlapping balls)
    const now = Date.now();
    if (now - lastFireTimeRef.current < FIRE_COOLDOWN_MS) return;

    // 2. In-flight ball limit (max 2 active moving cannonballs at once)
    const activeInFlight = ballsRef.current.filter(b => b.body.position.y > -1 && b.body.velocity.length() > 1.2).length;
    if (activeInFlight >= 2) return;

    lastFireTimeRef.current = now;

    const world = worldRef.current!;
    const scene = sceneRef.current!;
    const muzzle = computeMuzzle();
    const v = computeInitialVelocity();

    // Cannonball
    const radius = 0.28;
    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.35, metalness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(muzzle);
    scene.add(mesh);

    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({ mass: 6, shape, position: new CANNON.Vec3(muzzle.x, muzzle.y, 0) });
    body.velocity.copy(v);
    body.linearDamping = 0.01;
    body.angularDamping = 0.1;
    body.material = new CANNON.Material({ friction: 0.35, restitution: 0.25 });
    world.addBody(body);

    const ballEntry = { mesh, body, birth: Date.now(), lastImpact: 0 };
    ballsRef.current.push(ballEntry);

    // Collision handler with debouncing and lightweight visual particles
    body.addEventListener('collide', (ev: any) => {
      const impactTime = Date.now();
      if (impactTime - ballEntry.lastImpact < 80) return; // Debounce impacts
      const impact = ev.contact.getImpactVelocityAlongNormal();
      if (impact > 3.0) {
        ballEntry.lastImpact = impactTime;
        shakeRef.current = Math.min(0.35, shakeRef.current + Math.min(0.25, impact / 60));
        spawnDust(new THREE.Vector3(body.position.x, body.position.y, body.position.z));
        sfx.play('impact');
      }
    });

    shotsUsedRef.current += 1;
    destroyedThisShotRef.current = 0;
    comboFiredRef.current = false;
    lastReportedChainRef.current = 0;
    // Punchy launch feedback: cannon recoil + muzzle flash
    recoilRef.current = 1;
    flashTtlRef.current = 0.09;
    if (muzzleFlashRef.current) {
      muzzleFlashRef.current.position.copy(muzzle);
      muzzleFlashRef.current.visible = true;
      const fm = muzzleFlashRef.current.material as THREE.MeshBasicMaterial;
      fm.opacity = 1;
    }
    shakeRef.current = Math.min(0.35, shakeRef.current + 0.1);
    sfx.play('fire');
    events.onShotFired(shotsUsedRef.current);
    aimRef.current.active = false;
    hideTrajectory();
  };

  const currentWorld = useMemo(() => getWorldByLevelId(level.id), [level.id]);

  // Purely visual dust particles (Zero CANNON bodies, lightweight kinematics)
  const spawnDust = (at: THREE.Vector3) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!dustGeoRef.current) {
      dustGeoRef.current = new THREE.DodecahedronGeometry(0.06, 0);
    }
    const geo = dustGeoRef.current;
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xd6c39a, transparent: true, opacity: 0.85 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        at.x + (Math.random() - 0.5) * 0.25,
        at.y + Math.random() * 0.2,
        at.z + (Math.random() - 0.5) * 0.25
      );
      scene.add(mesh);
      const vx = (Math.random() - 0.5) * 2.2;
      const vy = 1.0 + Math.random() * 1.8;
      const vz = (Math.random() - 0.5) * 1.0;
      particlesRef.current.push({ mesh, vx, vy, vz, ttl: 0.65, maxTtl: 0.65 });
    }
  };

  // Spectacular visual fire & smoke explosion particles (Zero CANNON bodies)
  const spawnExplosionFX = (at: THREE.Vector3) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!dustGeoRef.current) {
      dustGeoRef.current = new THREE.DodecahedronGeometry(0.06, 0);
    }
    const colors = [0xff3b30, 0xff9500, 0xffcc00, 0xef4444, 0x475569, 0x1e293b];
    for (let i = 0; i < 16; i++) {
      const isSmoke = i % 2 === 0;
      const col = colors[i % colors.length];
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(dustGeoRef.current, mat);
      const scale = isSmoke ? (1.5 + Math.random() * 1.0) : (1.0 + Math.random() * 0.7);
      mesh.scale.set(scale, scale, scale);
      mesh.position.set(
        at.x + (Math.random() - 0.5) * 0.35,
        at.y + (Math.random() - 0.5) * 0.35,
        at.z + (Math.random() - 0.5) * 0.35
      );
      scene.add(mesh);
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 4.2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed * 0.75 + 3.0; // explosive upward burst
      const vz = (Math.random() - 0.5) * 2.0;
      particlesRef.current.push({ mesh, vx, vy, vz, ttl: 0.85, maxTtl: 0.85 });
    }
  };

  // World 2 Explosive Barrel detonation mechanic: true rigid-body kinetic shockwave
  const detonateBarrel = (barrel: DynamicBlock) => {
    if (barrel.destroyed) return;
    barrel.destroyed = true;
    barrel.mesh.visible = false;

    const bPos = new THREE.Vector3(barrel.body.position.x, barrel.body.position.y, barrel.body.position.z);
    const radius = barrel.def.explosionRadius ?? 3.4;
    const force = barrel.def.explosionForce ?? 55;

    // Apply radial explosion shockwave to all physical blocks
    blocksRef.current.forEach(b => {
      if (b === barrel || b.destroyed) return;
      const dx = b.body.position.x - bPos.x;
      const dy = b.body.position.y - bPos.y;
      const dz = b.body.position.z - bPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= radius) {
        b.body.wakeUp();
        const nx = dx / Math.max(0.12, dist);
        const ny = dy / Math.max(0.12, dist);
        const nz = dz / Math.max(0.12, dist);
        const impulseMag = (force / (dist + 0.35)) * b.body.mass * 0.28;
        const impulse = new CANNON.Vec3(
          nx * impulseMag,
          Math.max(ny * impulseMag, 4) + 7.0, // strong upward kinetic launch
          nz * impulseMag
        );
        b.body.applyImpulse(impulse, b.body.position);
      }
    });

    // Also blast cannonballs in flight
    ballsRef.current.forEach(ball => {
      const dx = ball.body.position.x - bPos.x;
      const dy = ball.body.position.y - bPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        ball.body.wakeUp();
        const nx = dx / Math.max(0.12, dist);
        const ny = dy / Math.max(0.12, dist);
        const impulseMag = (force / (dist + 0.35)) * ball.body.mass * 0.25;
        ball.body.applyImpulse(new CANNON.Vec3(nx * impulseMag, ny * impulseMag + 5, 0), ball.body.position);
      }
    });

    // Visual FX + punchy camera shake + explosion audio
    spawnExplosionFX(bPos);
    shakeRef.current = Math.min(0.5, shakeRef.current + 0.38);
    sfx.collapse();

    // Scoring & Target tracking
    scoreRef.current += 150;
    events.onScoreChange(scoreRef.current);
    destroyedThisShotRef.current += 1;
  };

  // --- Build/rebuild scene ---------------------------------------
  const buildLevel = () => {
    if (!sceneRef.current || !worldRef.current) return;
    const scene = sceneRef.current;
    const world = worldRef.current;

    // Remove old blocks
    blocksRef.current.forEach(b => { scene.remove(b.mesh); world.removeBody(b.body); });
    blocksRef.current = [];
    ballsRef.current.forEach(b => {
      scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
      world.removeBody(b.body);
    });
    ballsRef.current = [];
    particlesRef.current.forEach(p => {
      scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    });
    particlesRef.current = [];

    shotsUsedRef.current = 0;
    scoreRef.current = 0;
    completedRef.current = false;
    completeSentRef.current = false;
    pendingResultRef.current = null;
    slowmoUntilRef.current = 0;
    zoomActiveRef.current = false;
    zoomRef.current = 0;
    destroyedThisShotRef.current = 0;
    comboFiredRef.current = false;
    lastReportedChainRef.current = 0;
    shakeRef.current = 0;
    recoilRef.current = 0;
    if (muzzleFlashRef.current) muzzleFlashRef.current.visible = false;
    events.onScoreChange(0);
    events.onShotFired(0);

    // Create blocks from level def
    level.blocks.forEach((def) => {
      const prof = MATERIAL_PROFILE[def.material];
      const w = def.w;
      const h = def.h;
      const d = def.d ?? 0.8;
      const isExplosive = def.isExplosive || prof.isExplosive;

      let mesh: THREE.Mesh;
      if (def.material === 'explosive_barrel') {
        // Distinctive red explosive powder barrel with dark steel hoops
        const barrelGeo = new THREE.CylinderGeometry(w / 2, w / 2, h, 16);
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45, metalness: 0.3 });
        mesh = new THREE.Mesh(barrelGeo, barrelMat);

        // Black/Yellow hazard ring in the middle
        const hoop = new THREE.Mesh(
          new THREE.TorusGeometry(w / 2 + 0.015, 0.035, 8, 16),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.5 })
        );
        hoop.rotation.x = Math.PI / 2;
        mesh.add(hoop);
      } else {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({
          color: prof.color,
          roughness: 0.75,
          metalness: def.material === 'metal' ? 0.6 : 0.05,
        });
        mesh = new THREE.Mesh(geo, mat);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: prof.edge }));
        mesh.add(edges);
      }

      mesh.position.set(def.x, def.y, def.z ?? 0);
      if (def.rot) mesh.rotation.z = def.rot;
      scene.add(mesh);

      const shape = def.material === 'explosive_barrel'
        ? new CANNON.Cylinder(w / 2, w / 2, h, 14)
        : new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));

      const body = new CANNON.Body({
        mass: prof.mass,
        shape,
        position: new CANNON.Vec3(def.x, def.y, def.z ?? 0),
        material: new CANNON.Material({ friction: prof.friction, restitution: prof.restitution }),
        linearDamping: 0.08,
        angularDamping: 0.16,
      });

      body.allowSleep = true;
      body.sleepSpeedLimit = 0.18;
      body.sleepTimeLimit = 0.4;
      if (def.rot) {
        const q = new CANNON.Quaternion();
        q.setFromEuler(0, 0, def.rot);
        body.quaternion.copy(q);
      }
      world.addBody(body);

      const blockEntry: DynamicBlock = { def, mesh, body, initialPos: new THREE.Vector3(def.x, def.y, def.z ?? 0), destroyed: false };
      blocksRef.current.push(blockEntry);

      // Attach collision listener for explosive barrels
      if (isExplosive) {
        body.addEventListener('collide', (ev: any) => {
          const impact = ev.contact.getImpactVelocityAlongNormal();
          if (impact > 1.6 && !blockEntry.destroyed) {
            detonateBarrel(blockEntry);
          }
        });
      }
    });

    // reset aim
    aimRef.current = { active: false, angle: Math.PI / 4, power: 0.55, dx: 0, dy: 0 };
    updateBarrelRotation();
    hideTrajectory();
  };

  // --- GL context setup ------------------------------------------
  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    glRef.current = gl;
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    // Transparent WebGL canvas so the rich background artwork shows through smoothly
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    // Scene + Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera adjusted so y=0 (ground) projects firmly onto the road/pier in the lower third of the screen
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    camera.position.set(3.2, 2.3, 9.2);
    camera.lookAt(3.2, 2.3, 0);
    cameraRef.current = camera;

    // Environment lighting matching the active world theme
    const ambient = new THREE.AmbientLight(currentWorld.ambientColor, currentWorld.ambientIntensity);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(currentWorld.sunColor, currentWorld.sunIntensity);
    dir.position.set(5, 9, 6.5);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(currentWorld.skyFillColor, 0.35);
    dir2.position.set(-5, 4, -3);
    scene.add(dir2);

    // Ground details: 3D pebbles & props sitting on the terrain
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x765f49, roughness: 0.95 });
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x8e9299, roughness: 0.88 });
    for (let i = 0; i < 22; i++) {
      const isRubble = i % 3 === 0;
      const sz = isRubble ? (0.05 + Math.random() * 0.06) : (0.025 + Math.random() * 0.03);
      const geo = new THREE.DodecahedronGeometry(sz, 0);
      const pMesh = new THREE.Mesh(geo, isRubble ? rubbleMat : pebbleMat);
      const px = -2.5 + Math.random() * 10.5;
      const pz = -0.6 + Math.random() * 2.8;
      pMesh.position.set(px, sz * 0.5, pz);
      pMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      scene.add(pMesh);
    }

    if (currentWorld.groundProps === 'construction') {
      // Construction World barrels
      for (let i = 0; i < 3; i++) {
        const bg = new THREE.CylinderGeometry(0.28, 0.28, 0.7, 12);
        const bm = new THREE.MeshStandardMaterial({ color: i === 1 ? 0xf59e0b : 0xef4444, roughness: 0.5, metalness: 0.2 });
        const b = new THREE.Mesh(bg, bm);
        b.position.set(-2.8 + i * 0.45, 0.35, -1.2 - i * 0.3);
        scene.add(b);
      }

      // Industrial yellow hazard sign ("W")
      const sign = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), new THREE.MeshBasicMaterial({ color: 0x4b5563 }));
      post.position.y = 0.55;
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.04), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }));
      board.position.y = 1.15;
      sign.add(post);
      sign.add(board);
      sign.position.set(6.8, 0, -0.6);
      scene.add(sign);
    } else {
      // Pirate Harbor World decorative pier bollards & nautical barrels
      for (let i = 0; i < 2; i++) {
        const bg = new THREE.CylinderGeometry(0.26, 0.26, 0.65, 12);
        const bm = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
        const b = new THREE.Mesh(bg, bm);
        b.position.set(-2.8 + i * 0.5, 0.32, -1.1);
        scene.add(b);
      }

      // Wooden dock mooring bollard
      const bollard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 0.6, 10),
        new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 })
      );
      bollard.position.set(6.8, 0.3, -0.5);
      scene.add(bollard);
    }

    // Cannon (group with barrel + base)
    const cannonGroup = new THREE.Group();
    cannonGroup.position.copy(CANNON_POS);

    // Barrel: heavy cast iron with muzzle rim
    const barrelGeo = new THREE.CylinderGeometry(0.18, 0.23, BARREL_LEN, 18);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.35, metalness: 0.75 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.z = -Math.PI / 2;
    barrel.position.x = BARREL_LEN / 2;
    cannonGroup.add(barrel);

    // Muzzle ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.04, 8, 18), new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.3, metalness: 0.8 }));
    ring.rotation.y = Math.PI / 2;
    ring.position.x = BARREL_LEN;
    cannonGroup.add(ring);

    scene.add(cannonGroup);
    cannonMeshRef.current = cannonGroup;

    // Cannon wooden carriage base
    const baseGeo = new THREE.BoxGeometry(0.9, 0.55, 0.85);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x54361e, roughness: 0.85 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(CANNON_POS.x - 0.15, 0.28, 0);
    scene.add(base);

    // Cast iron wheels with bolts
    for (const zoff of [-0.52, 0.52]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0x1e2229, roughness: 0.65, metalness: 0.6 }));
      w.rotation.x = Math.PI / 2;
      w.position.set(CANNON_POS.x - 0.15, 0.32, zoff);
      scene.add(w);
    }

    // Trajectory dots
    for (let i = 0; i < 24; i++) {
      const g = new THREE.SphereGeometry(0.07, 8, 6);
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
      const dot = new THREE.Mesh(g, m);
      dot.visible = false;
      scene.add(dot);
      trajectoryDotsRef.current.push(dot);
    }

    // Muzzle flash (billboard-ish glow shown briefly on fire)
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0 }),
    );
    flash.visible = false;
    scene.add(flash);
    muzzleFlashRef.current = flash;

    // Physics world
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.solver.iterations = 14;
    world.allowSleep = true;
    world.defaultContactMaterial.friction = 0.5;
    world.defaultContactMaterial.restitution = 0.03;
    world.defaultContactMaterial.contactEquationStiffness = 1e7;
    world.defaultContactMaterial.contactEquationRelaxation = 4;
    worldRef.current = world;

    // Ground physics plane at y=0
    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: new CANNON.Material({ friction: 0.7, restitution: 0.02 }) });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    buildLevel();
    startLoop();
  };

  const startLoop = () => {
    const clock = new THREE.Clock();
    const baseCam = { x: 3.2, y: 2.3, z: 9.2 };
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const render = () => {
      if (!glRef.current) return;
      const delta = Math.min(0.05, clock.getDelta());
      if (!pausedRef.current) step(delta);
      const renderer = rendererRef.current;
      const scene = sceneRef.current!;
      const camera = cameraRef.current!;

      // Cannon recoil (barrel kicks back along -aim, eases home)
      if (cannonMeshRef.current) {
        recoilRef.current *= 0.82;
        const a = aimRef.current.angle;
        const kick = recoilRef.current * 0.28;
        cannonMeshRef.current.position.set(
          CANNON_POS.x - Math.cos(a) * kick,
          CANNON_POS.y - Math.sin(a) * kick,
          0,
        );
      }
      // Muzzle flash decay
      if (flashTtlRef.current > 0 && muzzleFlashRef.current) {
        flashTtlRef.current -= delta;
        const fm = muzzleFlashRef.current.material as THREE.MeshBasicMaterial;
        fm.opacity = Math.max(0, flashTtlRef.current / 0.09);
        const s = 1 + (1 - fm.opacity) * 0.8;
        muzzleFlashRef.current.scale.set(s, s, s);
        if (flashTtlRef.current <= 0) muzzleFlashRef.current.visible = false;
      }

      // Ease zoom toward target (used during final-collapse slow-mo)
      const zTarget = zoomActiveRef.current ? 1 : 0;
      zoomRef.current += (zTarget - zoomRef.current) * 0.12;
      const z = zoomRef.current;

      let camX = baseCam.x, camY = baseCam.y, camZ = baseCam.z;
      let lookX = 3.2, lookY = 2.3, lookZ = 0;
      if (z > 0.001) {
        const t = zoomTargetRef.current;
        camX = lerp(baseCam.x, t.x, 0.4 * z);
        camY = lerp(baseCam.y, t.y + 1.4, 0.4 * z);
        camZ = lerp(baseCam.z, 6.8, z);
        lookX = lerp(3.2, t.x, z);
        lookY = lerp(2.3, t.y + 0.5, z);
      }
      // Camera shake (additive)
      if (shakeRef.current > 0.001) {
        const s = shakeRef.current;
        camX += (Math.random() - 0.5) * s;
        camY += (Math.random() - 0.5) * s;
        shakeRef.current *= 0.85;
      }
      camera.position.set(camX, camY, camZ);
      camera.lookAt(lookX, lookY, lookZ);

      renderer.render(scene, camera);
      glRef.current.endFrameEXP();
      rafRef.current = requestAnimationFrame(render);
    };
    render();
  };

  const step = (delta: number) => {
    const world = worldRef.current!;
    const camera = cameraRef.current!;
    // Slow-mo during the winning collapse for extra drama.
    const inSlowmo = completedRef.current && pendingResultRef.current?.cleared && Date.now() < slowmoUntilRef.current;
    const factor = inSlowmo ? 0.32 : 1;
    // Fine fixed timestep + strictly capped substeps (never stalls the JS event loop)
    world.step(1 / 60, Math.min(0.04, delta * factor), 3);

    // Sync blocks
    let destroyed = 0;
    let newlyDestroyed = 0;
    let cx = 0, cy = 0;
    blocksRef.current.forEach(b => {
      b.mesh.position.set(b.body.position.x, b.body.position.y, b.body.position.z);
      b.mesh.quaternion.set(b.body.quaternion.x, b.body.quaternion.y, b.body.quaternion.z, b.body.quaternion.w);
      // "destroyed" when displaced significantly OR fallen off
      const dx = b.body.position.x - b.initialPos.x;
      const dy = b.body.position.y - b.initialPos.y;
      const disp = Math.sqrt(dx * dx + dy * dy);
      const fell = b.body.position.y < -1;
      if (!b.destroyed && (fell || disp > 1.4)) {
        b.destroyed = true;
        newlyDestroyed += 1;
        cx += b.body.position.x;
        cy += b.body.position.y;
        if (b.def.isTarget) {
          scoreRef.current += 100;
        } else {
          scoreRef.current += 25;
        }
        events.onScoreChange(scoreRef.current);
      }
      if (b.def.isTarget && b.destroyed) destroyed += 1;

      // Fade mesh when far under
      if (b.body.position.y < -3) {
        b.mesh.visible = false;
      }
    });

    // Destruction audio + combo + CHAIN popup
    if (newlyDestroyed > 0) {
      destroyedThisShotRef.current += newlyDestroyed;
      if (newlyDestroyed >= 3) {
        sfx.collapse();
      } else {
        sfx.play('break');
      }
      // Chain-reaction jingle: 4+ blocks from a single shot
      if (!comboFiredRef.current && destroyedThisShotRef.current >= 4) {
        comboFiredRef.current = true;
        sfx.play('combo');
      }
      // Emit a CHAIN xN popup once the count is worth celebrating (2+)
      if (destroyedThisShotRef.current >= 2 && destroyedThisShotRef.current > lastReportedChainRef.current) {
        lastReportedChainRef.current = destroyedThisShotRef.current;
        const acx = cx / newlyDestroyed;
        const acy = cy / newlyDestroyed;
        const v = new THREE.Vector3(acx, acy, 0).project(camera);
        const sx = Math.min(0.9, Math.max(0.1, (v.x + 1) / 2));
        const sy = Math.min(0.85, Math.max(0.12, (1 - v.y) / 2));
        events.onChain(destroyedThisShotRef.current, sx, sy);
      }
    }

    // Sync balls
    ballsRef.current.forEach(ball => {
      ball.mesh.position.set(ball.body.position.x, ball.body.position.y, ball.body.position.z);
      ball.mesh.quaternion.set(ball.body.quaternion.x, ball.body.quaternion.y, ball.body.quaternion.z, ball.body.quaternion.w);
    });
    // Cleanup old balls
    ballsRef.current = ballsRef.current.filter(ball => {
      const age = Date.now() - ball.birth;
      if (age > 4500 || ball.body.position.y < -5 || ball.body.position.x > 18) {
        sceneRef.current?.remove(ball.mesh);
        ball.mesh.geometry.dispose();
        (ball.mesh.material as THREE.Material).dispose();
        worldRef.current?.removeBody(ball.body);
        return false;
      }
      return true;
    });

    // Visual particles update (Zero physics bodies, instant CPU calculation)
    particlesRef.current.forEach(p => {
      p.ttl -= delta;
      p.vy -= 14 * delta;
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (p.ttl / p.maxTtl) * 0.85);
    });
    particlesRef.current = particlesRef.current.filter(p => {
      if (p.ttl <= 0 || p.mesh.position.y < -1) {
        sceneRef.current?.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        return false;
      }
      return true;
    });

    // --- Completion / fail flow --------------------------------
    const ballActive = (b: { body: CANNON.Body }) =>
      b.body.position.y > -1 && b.body.velocity.length() > 1.2;

    if (!completedRef.current) {
      if (destroyed >= totalTargets && totalTargets > 0) {
        // Trigger once the winning shot has landed (no fast-moving ball) OR shots are spent.
        const anyActive = ballsRef.current.some(ballActive);
        if (!anyActive || shotsUsedRef.current >= level.shots) {
          completedRef.current = true;
          const remaining = Math.max(0, level.shots - shotsUsedRef.current);
          scoreRef.current += remaining * 150;
          events.onScoreChange(scoreRef.current);
          // Slow-mo + camera focus on the collapse, then transition.
          const acx = cx > 0 && newlyDestroyed > 0 ? cx / newlyDestroyed : 3.4;
          zoomTargetRef.current.set(isFinite(acx) ? acx : 3.4, 1.4, 0);
          zoomActiveRef.current = true;
          slowmoUntilRef.current = Date.now() + 600;
          pendingResultRef.current = {
            cleared: true,
            data: { score: scoreRef.current, shotsUsed: shotsUsedRef.current, destroyed, totalTargets },
          };
        }
      } else if (shotsUsedRef.current >= level.shots) {
        // Fail only after everything has come to rest.
        const settled = ballsRef.current.every(b => b.body.velocity.length() < 0.6);
        if (settled) {
          completedRef.current = true;
          slowmoUntilRef.current = Date.now() + 500;
          pendingResultRef.current = {
            cleared: false,
            data: { score: scoreRef.current, shotsUsed: shotsUsedRef.current, destroyed, totalTargets },
          };
        }
      }
    }

    // Fire the pending result once slow-mo has played out.
    if (completedRef.current && pendingResultRef.current && !completeSentRef.current) {
      if (Date.now() >= slowmoUntilRef.current) {
        completeSentRef.current = true;
        const r = pendingResultRef.current;
        zoomActiveRef.current = false;
        if (r.cleared) events.onLevelComplete(r.data);
        else events.onFail(r.data);
      }
    }
  };

  // --- Pan responder ---------------------------------------------
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !paused,
    onMoveShouldSetPanResponder: () => !paused,
    onPanResponderGrant: (_, g) => {
      aimRef.current.active = true;
      setAimFromDrag(0, 0);
    },
    onPanResponderMove: (_, g) => {
      setAimFromDrag(g.dx, g.dy);
    },
    onPanResponderRelease: (_, g) => {
      // Only fire if drag distance significant
      const d = Math.sqrt(g.dx * g.dx + g.dy * g.dy);
      if (d > 18) {
        fire();
      } else {
        aimRef.current.active = false;
        hideTrajectory();
      }
    },
    onPanResponderTerminate: () => {
      aimRef.current.active = false;
      hideTrajectory();
    },
  }), [paused]);

  useEffect(() => {
    sfx.startAmbient();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      sfx.stopAmbient();
    };
  }, []);

  // Rebuild when level changes
  useEffect(() => {
    if (sceneRef.current && worldRef.current) {
      buildLevel();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
    if (rendererRef.current && cameraRef.current && glRef.current) {
      rendererRef.current.setSize(glRef.current.drawingBufferWidth, glRef.current.drawingBufferHeight);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    }
  };

  return (
    <View style={styles.root} onLayout={onLayout} {...panResponder.panHandlers} testID="game-canvas">
      <ImageBackground
        source={currentWorld.backgroundAsset}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#7ec8f0', overflow: 'hidden' },
});
