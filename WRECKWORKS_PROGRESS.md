# WreckWorks — Progress Report

> **One shot. Total destruction.**
> World 1: Construction Site — Playable Physics Destruction Prototype

_Last updated: build with SFX + Sound Toggle + Combo + Ambient_

---

## 1. Overview

WreckWorks is an original, physics-based destruction puzzle game built as a **mobile-first Expo (React Native)** app, locked to **landscape**. The core loop is fully playable:

> **Aim → choose power → fire → destroy the structure → trigger chain reactions → earn stars → progress to the next level.**

All physics are **genuinely simulated** (real gravity, collisions, rigid-body toppling) — no fake CSS animations. Two different shots (angle + power + impact point) produce different physical outcomes, which is the heart of the game.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| App framework | Expo + React Native (SDK 54) |
| Navigation | expo-router (stack) |
| 3D rendering | expo-gl + expo-three (three.js) |
| Physics | cannon-es (rigid-body 3D physics) |
| Orientation | expo-screen-orientation (landscape lock) |
| Local save | AsyncStorage (via `@/src/utils` conventions) |
| Audio | expo-audio (bundled WAV SFX + ambient loop) |
| Haptics | expo-haptics |
| No backend | Runs 100% offline, no login required |

---

## 3. Screens Completed

### Main Menu (`app/index.tsx`)
- Bold **WRECKWORKS** title with tagline "One shot. Total destruction."
- Sky background + construction warning-stripe motif
- **PLAY** button (chunky, tactile) → Level Select
- **World 1: Construction Site** progress card showing `X / 10 Levels Complete` with a live progress bar
- **Sound toggle** speaker button (top-right)

### Level Select (`app/levels.tsx`)
- Horizontal scroll of **10 chunky level tiles**
- Three visual states:
  - **Locked** — grey tile with padlock
  - **Current / Unlocked** — orange tile
  - **Completed** — yellow tile with earned **stars (0–3)**
- Header shows total stars collected `X / 30`
- Per-tile shot count displayed

### Gameplay (`app/game.tsx` + `src/game/GameScene.tsx`)
- Live 3D construction-site scene (cannon, structures, ground, skyline, crane, barrels, signs)
- **HUD**: Level pill (top-left), Score (top-center), animated Shot dots (top-right), Pause button
- **Drag-to-aim** with a live **trajectory prediction** dotted arc
- Level-1 onboarding hint: **"DRAG TO AIM • RELEASE TO FIRE"** (disappears after first shot)
- **Pause overlay**: Resume / Retry / Quit + Sound toggle
- **Result overlay**: Level Complete / Failed, animated stars, Score, Objects Destroyed, Shots Used, Best Score, and Retry / Next Level buttons

---

## 4. Core Gameplay Systems

### Aiming
- Press & drag anywhere to set **angle** (drag direction) and **power** (drag distance)
- Angle clamped to a sensible 5°–85° range; power capped at a sensible maximum
- Trajectory dots update live as you drag; releasing a short drag cancels (no accidental fire)

### Projectile — Standard Cannonball
- Heavy sphere with real gravity, collision, and slight bounce
- Impact **dust particles**, **camera shake** scaled to impact strength
- Auto-cleaned after it leaves play (keeps active body count low)
- The weapon system is architected so **new projectile types can be added later** (data-driven)

### Destructible Physics — 5 Materials
| Material | Mass | Feel |
|---|---|---|
| Crate | Light | Easy to knock over |
| Wood | Medium | Balanced |
| Brick | Heavy | Sturdy |
| Concrete | Very heavy | Hard to shift |
| Metal | Very heavy | Difficult to move |

Each has its own mass, friction, restitution, and color/edge styling. A good hit produces:
**impact → block movement → instability → chain reaction → collapse.**

### Destruction Feedback
- Blocks are counted "destroyed" when displaced far enough or knocked off the platform
- Dust bursts, camera shake, mesh fade-out for pieces that fall away
- Performance-conscious: limited simultaneous rigid bodies, simple materials

---

## 5. The 10 Levels (World 1)

Each level teaches or tests a mechanic and has its own star thresholds.

| # | Name | Teaches |
|---|---|---|
| 1 | First Impact | Basic aim & fire (few wood blocks) |
| 2 | The Stack | Knock out lower blocks to collapse |
| 3 | Weak Point | Hit the right spot, not the biggest object |
| 4 | Mixed Materials | Wood vs. brick behavior |
| 5 | Chain Reaction | One shot → multiple secondary collisions |
| 6 | The Bridge | Structural support |
| 7 | Heavy Load | Intimidating concrete, solvable with aim |
| 8 | Limited Shots | Efficiency under a tight shot budget |
| 9 | Precision | Brute force is inefficient; find the point |
| 10 | Master Builder | Culmination: wood + brick + concrete + crates + supports |

---

## 6. Scoring & Stars

- **Points**: target objects destroyed (100), secondary objects (25), plus a **remaining-shots bonus** (150 each)
- **Stars** are level-specific, based on shots used vs. the level's thresholds:
  - ⭐ Structure destroyed
  - ⭐⭐ Destroyed efficiently
  - ⭐⭐⭐ Excellent shot count
- Results shown immediately on the Level Complete overlay
- Message the player instantly understands: *"more destruction with fewer shots = better score."*

---

## 7. Audio (all original, procedurally generated WAVs)

| Sound | Trigger |
|---|---|
| **Fire** | Cannon shot |
| **Impact** | Cannonball hits something hard |
| **Break** | 1–2 blocks knocked out |
| **Collapse** | 3+ blocks fall at once (deep rumble) |
| **Combo** | Rising jingle when **4+ blocks fall from one shot** |
| **Star** | Level cleared |
| **Click** | Button presses |
| **Ambient** | Looping construction-site hum during play |

- **Ambient ducking**: the background hum dips during big collapses so the crash punches through, then eases back.
- **Sound toggle**: speaker on the Main Menu and a "SOUND: ON/OFF" row on the Pause screen. Preference is **saved locally** and shared across the whole game.
- The game remains fully playable if audio is disabled or fails to load (all audio calls fail safe).

---

## 8. Progress Persistence (local, no login)

Saved to device storage (`wreckworks.progress.v1`) and restored on reopen:
- Levels unlocked
- Stars earned per level
- Best score per level
- Best (fewest) shot count per level

Sound preference is saved separately (`wreckworks.sound.enabled`).

---

## 9. Game Feel & Camera

- Cinematic but functional fixed camera: cannon, trajectory, structure, and ground always visible
- **Camera shake** on strong impacts (never nauseating)
- Haptic feedback on fire and on win/lose
- Tactile, "chunky" UI (raised buttons via bottom borders) for a premium mobile-game feel

---

## 10. Acceptance Criteria — Status

- [x] Polished main menu
- [x] World 1 selectable
- [x] Level 1 startable
- [x] Touch aiming
- [x] Trajectory prediction
- [x] Power adjustment
- [x] Projectile launches correctly
- [x] Gravity + collision on projectile
- [x] Structures react with real physics
- [x] Objects knock other objects over
- [x] Chain-reaction collapses
- [x] Impact effects visible
- [x] Sound feedback exists
- [x] Level completion detected
- [x] Score calculated
- [x] Star rating displayed
- [x] Next level unlocks
- [x] Progress saved locally
- [x] All 10 levels playable
- [x] Works on a mobile screen
- [x] No backend or login required

---

## 11. Deliberately NOT Built Yet (per brief)

Ads, in-app purchases, accounts, multiplayer, online leaderboards, cloud saves, daily challenges, multiple weapons, multiple worlds, complex analytics, backend, login.

---

## 12. Project Structure (key files)

```
app/
  _layout.tsx          # landscape lock, root stack
  index.tsx            # Main Menu
  levels.tsx           # Level Select
  game.tsx             # Gameplay screen + HUD + overlays
src/game/
  GameScene.tsx        # 3D scene + cannon-es physics engine
  levels.ts            # 10 level definitions + material profiles
  progress.ts          # AsyncStorage save/load
  sfx.ts               # audio engine (pools, ambient, ducking, toggle)
  useSound.ts          # React hook for the sound toggle
  theme.ts             # colors, spacing, radii
assets/sfx/            # fire/impact/break/collapse/combo/star/click/ambient.wav
```

---

## 13. Ideas for Next

- **Debris shards** — break blocks into flying pieces on hard impact
- **Combo popup** — on-screen "CHAIN x4!" banner synced to the combo jingle
- **Slow-mo finish** — brief time-slow + zoom when the final target topples
- **Music track** — light loopable theme, toggled separately from SFX
- **More projectiles** — the weapon system is already architected for this
