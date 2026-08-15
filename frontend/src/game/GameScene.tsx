// WreckWorks — 3D physics gameplay engine.
// Uses expo-gl + three.js for rendering, cannon-es for physics.
// Side-view style: physics evolves mostly in the XY plane; Z is thin
// so collisions still feel volumetric.

import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent, Text, Platform } from 'react-native';
import { LevelDef, BlockDef, MATERIAL_PROFILE, BlockMaterial } from './levels';
import { theme } from './theme';
import { sfx } from './sfx';

export interface GameEvents {
  onScoreChange: (score: number) => void;
  onShotFired: (shotsUsed: number) => void;
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
  const ballsRef = useRef<{ mesh: THREE.Mesh; body: CANNON.Body; birth: number }[]>([]);
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
  const debrisPoolRef = useRef<{ mesh: THREE.Mesh; body: CANNON.Body; ttl: number }[]>([]);

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
    const world = worldRef.current!;
    const scene = sceneRef.current!;
    const muzzle = computeMuzzle();
    const v = computeInitialVelocity();

    // Cannonball
    const radius = 0.28;
    const geo = new THREE.SphereGeometry(radius, 20, 16);
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
    ballsRef.current.push({ mesh, body, birth: Date.now() });

    // Collision handler for impact effects
    body.addEventListener('collide', (ev: any) => {
      const impact = ev.contact.getImpactVelocityAlongNormal();
      if (impact > 3) {
        shakeRef.current = Math.min(0.4, shakeRef.current + Math.min(0.35, impact / 60));
        // Small dust burst
        spawnDust(new THREE.Vector3(body.position.x, body.position.y, body.position.z));
        sfx.play('impact');
      }
    });

    shotsUsedRef.current += 1;
    destroyedThisShotRef.current = 0;
    comboFiredRef.current = false;
    sfx.play('fire');
    events.onShotFired(shotsUsedRef.current);
    aimRef.current.active = false;
    hideTrajectory();
  };

  const spawnDust = (at: THREE.Vector3) => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (let i = 0; i < 6; i++) {
      const g = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 6, 4);
      const m = new THREE.MeshBasicMaterial({ color: 0xd6c39a, transparent: true, opacity: 0.85 });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(at.x + (Math.random() - 0.5) * 0.3, at.y + Math.random() * 0.2, at.z + (Math.random() - 0.5) * 0.3);
      scene.add(mesh);
      const vx = (Math.random() - 0.5) * 2.5;
      const vy = 1 + Math.random() * 2;
      // fake body: reuse debris list with ttl for animation via cannon body
      const body = new CANNON.Body({ mass: 0.05, shape: new CANNON.Sphere(0.06), position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z) });
      body.velocity.set(vx, vy, 0);
      body.collisionResponse = false;
      worldRef.current!.addBody(body);
      debrisPoolRef.current.push({ mesh, body, ttl: 0.9 });
    }
  };

  // --- Build/rebuild scene ---------------------------------------
  const buildLevel = () => {
    if (!sceneRef.current || !worldRef.current) return;
    const scene = sceneRef.current;
    const world = worldRef.current;

    // Remove old blocks
    blocksRef.current.forEach(b => { scene.remove(b.mesh); world.removeBody(b.body); });
    blocksRef.current = [];
    ballsRef.current.forEach(b => { scene.remove(b.mesh); world.removeBody(b.body); });
    ballsRef.current = [];
    debrisPoolRef.current.forEach(d => { scene.remove(d.mesh); world.removeBody(d.body); });
    debrisPoolRef.current = [];

    shotsUsedRef.current = 0;
    scoreRef.current = 0;
    completedRef.current = false;
    events.onScoreChange(0);
    events.onShotFired(0);

    // Create blocks from level def
    level.blocks.forEach((def) => {
      const prof = MATERIAL_PROFILE[def.material];
      const w = def.w;
      const h = def.h;
      const d = def.d ?? 0.8;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({ color: prof.color, roughness: 0.75, metalness: def.material === 'metal' ? 0.6 : 0.05 });
      const mesh = new THREE.Mesh(geo, mat);
      // Add edge highlight
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: prof.edge }));
      mesh.add(edges);
      mesh.position.set(def.x, def.y, def.z ?? 0);
      if (def.rot) mesh.rotation.z = def.rot;
      scene.add(mesh);

      const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
      const body = new CANNON.Body({
        mass: prof.mass,
        shape,
        position: new CANNON.Vec3(def.x, def.y, def.z ?? 0),
        material: new CANNON.Material({ friction: prof.friction, restitution: prof.restitution }),
        linearDamping: 0.06,
        angularDamping: 0.12,
      });
      if (def.rot) {
        const q = new CANNON.Quaternion();
        q.setFromEuler(0, 0, def.rot);
        body.quaternion.copy(q);
      }
      world.addBody(body);
      blocksRef.current.push({ def, mesh, body, initialPos: new THREE.Vector3(def.x, def.y, def.z ?? 0), destroyed: false });
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
    renderer.setClearColor(0x7ec8f0, 1);
    rendererRef.current = renderer;

    // Scene + Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x7ec8f0, 12, 28);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    camera.position.set(3.2, 3.4, 10.5);
    camera.lookAt(3.2, 1.5, 0);
    cameraRef.current = camera;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xfff2c8, 1.05);
    dir.position.set(4, 8, 6);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x9ec8ff, 0.4);
    dir2.position.set(-4, 4, -4);
    scene.add(dir2);

    // Skydome (simple gradient plane far behind)
    const skyGeo = new THREE.PlaneGeometry(50, 20);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0xa8dcff });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.set(3, 5, -8);
    scene.add(sky);

    // Distant construction silhouette
    const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x4b6a86 });
    for (let i = 0; i < 5; i++) {
      const bw = 1.5 + Math.random() * 1.2;
      const bh = 2 + Math.random() * 2.4;
      const geo = new THREE.BoxGeometry(bw, bh, 0.2);
      const m = new THREE.Mesh(geo, silhouetteMat);
      m.position.set(-2 + i * 2.2, bh / 2, -5.5);
      scene.add(m);
      // crane
      if (i === 2) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4, 0.12), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
        pole.position.set(-2 + i * 2.2, 3, -5.4);
        scene.add(pole);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
        arm.position.set(-2 + i * 2.2 + 1.2, 4.7, -5.4);
        scene.add(arm);
      }
    }

    // Ground: dirt with darker strip
    const groundGeo = new THREE.PlaneGeometry(40, 12);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xc49a6b, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    // Warning stripe strip along front
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.35), new THREE.MeshBasicMaterial({ color: 0xffc107 }));
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.01, 2.5);
    scene.add(stripe);

    // Barrels props
    for (let i = 0; i < 3; i++) {
      const bg = new THREE.CylinderGeometry(0.28, 0.28, 0.7, 12);
      const bm = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xef4444 : 0xf59e0b, roughness: 0.6 });
      const b = new THREE.Mesh(bg, bm);
      b.position.set(-3.5 + i * 0.5, 0.35, -2 - i * 0.4);
      scene.add(b);
    }

    // Warning sign
    const sign = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), new THREE.MeshBasicMaterial({ color: 0x374151 }));
    post.position.y = 0.6;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.05), new THREE.MeshBasicMaterial({ color: 0xffc107 }));
    board.position.y = 1.3;
    sign.add(post); sign.add(board);
    sign.position.set(7.5, 0, -0.5);
    scene.add(sign);

    // Cannon (group with barrel + base)
    const cannonGroup = new THREE.Group();
    cannonGroup.position.copy(CANNON_POS);

    // barrel
    const barrelGeo = new THREE.CylinderGeometry(0.18, 0.22, BARREL_LEN, 16);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.7 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.z = -Math.PI / 2;
    barrel.position.x = BARREL_LEN / 2;
    cannonGroup.add(barrel);

    // muzzle ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 16), new THREE.MeshStandardMaterial({ color: 0xff5a00, roughness: 0.3 }));
    ring.rotation.y = Math.PI / 2;
    ring.position.x = BARREL_LEN;
    cannonGroup.add(ring);

    scene.add(cannonGroup);
    cannonMeshRef.current = cannonGroup;

    // Cannon base (static)
    const baseGeo = new THREE.BoxGeometry(0.9, 0.6, 0.9);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.7 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(CANNON_POS.x - 0.15, 0.3, 0);
    scene.add(base);
    // wheels
    for (const zoff of [-0.55, 0.55]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 14), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 }));
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

    // Physics world
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) });
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    world.allowSleep = true;
    worldRef.current = world;

    // Ground physics
    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: new CANNON.Material({ friction: 0.7, restitution: 0.02 }) });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    buildLevel();
    startLoop();
  };

  const startLoop = () => {
    const clock = new THREE.Clock();
    const render = () => {
      if (!glRef.current) return;
      const delta = Math.min(0.05, clock.getDelta());
      if (!pausedRef.current) step(delta);
      const renderer = rendererRef.current;
      const scene = sceneRef.current!;
      const camera = cameraRef.current!;
      // apply camera shake
      if (shakeRef.current > 0.001) {
        const s = shakeRef.current;
        camera.position.x = 3.2 + (Math.random() - 0.5) * s;
        camera.position.y = 3.4 + (Math.random() - 0.5) * s;
        camera.lookAt(3.2, 1.5, 0);
        shakeRef.current *= 0.85;
      } else {
        camera.position.set(3.2, 3.4, 10.5);
        camera.lookAt(3.2, 1.5, 0);
      }
      renderer.render(scene, camera);
      glRef.current.endFrameEXP();
      rafRef.current = requestAnimationFrame(render);
    };
    render();
  };

  const step = (delta: number) => {
    const world = worldRef.current!;
    world.step(1 / 60, delta, 4);

    // Sync blocks
    let destroyed = 0;
    let newlyDestroyed = 0;
    blocksRef.current.forEach(b => {
      b.mesh.position.set(b.body.position.x, b.body.position.y, b.body.position.z);
      b.mesh.quaternion.set(b.body.quaternion.x, b.body.quaternion.y, b.body.quaternion.z, b.body.quaternion.w);
      // "destroyed" when displaced significantly OR fallen off
      const dx = b.body.position.x - b.initialPos.x;
      const dy = b.body.position.y - b.initialPos.y;
      const disp = Math.sqrt(dx * dx + dy * dy);
      const fell = b.body.position.y < -1;
      const wasDestroyed = b.destroyed;
      if (!b.destroyed && (fell || disp > 1.4)) {
        b.destroyed = true;
        newlyDestroyed += 1;
        if (b.def.isTarget) {
          scoreRef.current += 100;
        } else {
          scoreRef.current += 25;
        }
        if (!wasDestroyed) {
          events.onScoreChange(scoreRef.current);
        }
      }
      if (b.def.isTarget && b.destroyed) destroyed += 1;

      // Fade mesh when far under
      if (b.body.position.y < -3) {
        b.mesh.visible = false;
      }
    });

    // Destruction audio + combo tracking
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
    }

    // Sync balls
    ballsRef.current.forEach(ball => {
      ball.mesh.position.set(ball.body.position.x, ball.body.position.y, ball.body.position.z);
      ball.mesh.quaternion.set(ball.body.quaternion.x, ball.body.quaternion.y, ball.body.quaternion.z, ball.body.quaternion.w);
    });
    // Cleanup old balls
    ballsRef.current = ballsRef.current.filter(ball => {
      const age = Date.now() - ball.birth;
      if (age > 5000 || ball.body.position.y < -6 || ball.body.position.x > 20) {
        sceneRef.current!.remove(ball.mesh);
        worldRef.current!.removeBody(ball.body);
        return false;
      }
      return true;
    });
    // Debris
    debrisPoolRef.current.forEach(d => {
      d.ttl -= delta;
      d.mesh.position.set(d.body.position.x, d.body.position.y, d.body.position.z);
      const mat = d.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, d.ttl);
    });
    debrisPoolRef.current = debrisPoolRef.current.filter(d => {
      if (d.ttl <= 0) {
        sceneRef.current!.remove(d.mesh);
        worldRef.current!.removeBody(d.body);
        return false;
      }
      return true;
    });

    // Level complete when all targets destroyed
    if (!completedRef.current) {
      if (destroyed >= totalTargets && totalTargets > 0) {
        // Wait until scene has settled a bit (no active shot flying)
        const activeBall = ballsRef.current.some(b => b.body.position.y > -1);
        if (!activeBall || shotsUsedRef.current >= level.shots) {
          completedRef.current = true;
          // Bonus for remaining shots
          const remaining = Math.max(0, level.shots - shotsUsedRef.current);
          scoreRef.current += remaining * 150;
          events.onScoreChange(scoreRef.current);
          setTimeout(() => {
            events.onLevelComplete({
              score: scoreRef.current,
              shotsUsed: shotsUsedRef.current,
              destroyed,
              totalTargets,
            });
          }, 900);
        }
      } else if (shotsUsedRef.current >= level.shots) {
        // Wait until all balls at rest before failing
        const settled = ballsRef.current.every(b => Math.abs(b.body.velocity.length()) < 0.4);
        if (settled) {
          if (destroyed >= totalTargets) {
            // covered above
          } else {
            completedRef.current = true;
            setTimeout(() => {
              events.onFail({
                score: scoreRef.current,
                shotsUsed: shotsUsedRef.current,
                destroyed,
                totalTargets,
              });
            }, 900);
          }
        }
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
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.sky, overflow: 'hidden' },
});
