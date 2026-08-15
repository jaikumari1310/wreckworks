# WreckWorks — World 1: Construction Site

## Overview
An original 3D physics destruction puzzle game for mobile. Player aims a cannon, adjusts power via drag, fires cannonballs at construction structures, and earns stars based on shots used.

## Tech Stack
- Expo (React Native) — landscape locked
- expo-gl + expo-three (three.js) for 3D rendering
- cannon-es for rigid-body physics
- expo-router for navigation
- AsyncStorage for local progress
- expo-haptics for tactile feedback

## Screens
- `/` Main Menu — WRECKWORKS title, PLAY button, World 1 progress card (X/10)
- `/levels` Level Select — 10 chunky tiles (locked/current/completed with stars)
- `/game?levelId=N` Gameplay — 3D scene + HUD (Pause, Level, Score, Shots) + Result overlay

## Core Loop
1. Player selects level → 3D scene loads
2. Drag on screen to aim (angle + power), trajectory dots visible
3. Release to fire cannonball (real gravity + collisions)
4. Structure reacts physically → chain reactions → collapse
5. Result overlay: 1–3 stars based on shots used, RETRY / NEXT LEVEL
6. Progress auto-saved to AsyncStorage

## Level Design (all 10)
Level 1 First Impact • 2 The Stack • 3 Weak Point • 4 Mixed Materials • 5 Chain Reaction • 6 The Bridge • 7 Heavy Load • 8 Limited Shots • 9 Precision • 10 Master Builder

## Materials
wood, brick, concrete, metal, crate — each with distinct mass, color, friction, restitution.

## Scoring
- Target block destroyed = 100 pts, secondary = 25 pts
- Remaining shots bonus: 150 pts each
- Stars: derived from shots used vs per-level thresholds

## Not in Prototype
Ads, IAP, accounts, multiplayer, leaderboards, cloud save, multiple weapons, multiple worlds, backend, login. Audio placeholders only (game playable without audio).

## Polish Pass (Priorities 1–10) — Done
- **Game feel**: cannon recoil, muzzle flash, tuned camera shake, dust on impact
- **Chain popup**: animated "CHAIN xN" near destruction when 2+ blocks fall from one shot (color/size scales with N)
- **Final collapse**: ~0.6s slow-motion + slight camera zoom before the result appears
- **Result sequence**: card pop-in, score count-up, stars appear one-by-one, NEW BEST badge, dominant NEXT LEVEL
- **Star clarity**: HUD "PAR N SHOTS" indicator (3-star target)
- **Tutorial**: animated drag-hand + arrow on Level 1, disappears after first real shot
- **Physics stability**: fixed timestep 1/120 with 10 substeps (no tunneling), SAP broadphase, 14 solver iterations, low-restitution contacts, block sleep, fixed Level-10 spawn overlaps (no pre-fire collapse)
- Verified by testing agent (iteration 3): 11/11 after tutorial-hint guard fix.
