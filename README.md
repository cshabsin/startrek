# Super Star Trek (Web Version)

A Next.js implementation of the classic Super Star Trek BASIC game, featuring both **Classic Terminal** and **Modern GUI** interfaces.

## How to Run

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Run the development server**:
    ```bash
    npm run dev
    ```
3.  **Open [http://localhost:3000](http://localhost:3000)** in your browser.

## Game Modes

### Classic Mode
A high-fidelity port of the original 1978 BASIC experience. Commands are typed manually (e.g., `NAV`, `PHA`, `TOR`), and output is rendered in authentic ASCII art.

### Modern Mode
A graphical "tactical console" interface featuring:
- **Interactive Grid:** Click sectors to auto-plot courses or target torpedoes.
- **Tactical Computer:** A "Plot then Engage" workflow that calculates vectors for you while allowing manual override.
- **Visual Scanners:** Dedicated overlays for Long Range Scans (LRS) and an interactive Galaxy Map.
- **Smooth Animations:** Real-time visual ship movement across the sector grid.
- **Enhanced Controls:** Interactive sliders and quick-set buttons for Shield and Phaser management.
- **Persistent Dashboard:** Real-time mission status, stardate tracking, and damage control reports always visible.

---

# Design Document & Code Map

## Architecture Overview

The application is built using **Next.js 15+ (App Router)** and **TypeScript**. It follows a strict separation of concerns between the simulation engine and the presentation layers.

### 1. Game Engine (`lib/startrek.ts`)
The `StarTrekGame` class is a self-contained state machine. It handles the mathematical simulation of the galaxy, combat physics, and ship systems.

*   **State Management:** Manages private ship status, galaxy generation, and local sector entities.
*   **Coordinate System:** Uses an 8x8 Quadrant grid (Galaxy) and an 8x8 Sector grid (Local).
*   **Collision Logic:** Features sector-level collision detection; warping through stars or starbases causes emergency engine shutdowns.
*   **Damage Simulation:** Systems malfunction spontaneously (random failure) or due to enemy fire. Repairs happen during movement or via authorized Starbase technicians (at a time cost).
*   **I/O Abstraction:** Supports both a text-based prompt system (for Terminal) and programmatic execution methods (for GUI).

### 2. User Interfaces
- **Terminal (`components/GameTerminal.tsx`):** A retro-scrolling log that parses text commands and renders ASCII maps.
- **GUI (`components/ModernInterface.tsx`):** A modern React interface utilizing state-driven overlays and interactive SVG/CSS elements.

## Code Map

```text
.
├── app/
│   ├── globals.css      # Terminal-themed global styles
│   └── page.tsx         # Main Entry Point (Mode Toggle & Shared State)
├── components/
│   ├── GameTerminal.tsx # CLASSIC Terminal UI
│   └── ModernInterface.tsx # MODERN GUI UI
├── docs/
│   └── superstartrek.bas # Original 1978 BASIC source code
├── lib/
│   └── startrek.ts      # CORE GAME ENGINE (TypeScript Class)
├── public/              # Static assets
├── next.config.ts       # Export configuration (Portable Static Build)
└── README.md            # This document
```

## Key Mechanics

- **Navigation:** Vectors are calculated based on Course (1-9) and Warp Factor. Warp 1.0 equals exactly one quadrant distance.
- **Combat:** 
    - **Phasers:** Directed energy discharge; power drops with distance.
    - **Torpedoes:** Linear projectiles that follow course vectors and can be blocked by stars.
- **Docking:** Docking at a Starbase (`>!<`) instantly refills energy and torpedoes. Subsystem repairs require manual authorization and spend game time (Stardates).
- **Library Computer:** Provides LRS data, status reports, galactic records, and a direction/distance calculator.

## Deployment

To generate a static bundle for hosting (e.g., in a `public_html` directory):
```bash
npm run build
```
The resulting `out/` directory uses relative asset paths and can be hosted in any subdirectory.

---

## Assets & Credits

- **Game Engine:** Ported from the original 1978 "Super Star Trek" BASIC source code by Mike Mayfield, Dave Ahl, and Bob Leedom.
- **Tactical Icons:** Custom SVG assets designed specifically for this project's Modern Mode.
- **Classic Themes:** Retro styling inspired by the TI-99/4A, Commodore 64, and Apple II computing eras.