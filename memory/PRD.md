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
