# Super Star Trek (Web Version)

A Next.js implementation of the classic Super Star Trek BASIC game.

## How to Run

1.  Navigate to the directory:
    ```bash
    cd web-startrek
    ```
2.  Install dependencies (if not already):
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Commands

-   **NAV**: Set Course (1-9) and Warp Factor (0-8).
    -   Course: 1=East, 3=North, 5=West, 7=South.
-   **SRS**: Short Range Sensor Scan (Display current quadrant).
-   **LRS**: Long Range Sensor Scan (Display surrounding quadrants).
-   **PHA**: Fire Phasers.
-   **TOR**: Fire Photon Torpedoes (Course 1-9).
-   **SHE**: Manage Shields (Transfer energy).
-   **DAM**: Damage Control Report.
-   **COM**: Library Computer (Maps and Status).
-   **XXX**: Resign.

## Goal

Destroy all Klingons before the Stardate limit expires. Use Starbases ( `>!<` ) to refuel/repair.

---

# Design Document & Code Map

## Architecture Overview

The application is built using **Next.js 14+ (App Router)** and **TypeScript**. It follows a strict separation of concerns between the retro simulation logic and the modern web presentation layer.

### 1. Game Engine (`lib/startrek.ts`)
The core logic is encapsulated in the `StarTrekGame` class. This class acts as a self-contained state machine, modeled after the original BASIC program but refactored into structured TypeScript.

*   **State Management**: Instead of global variables, the class manages private properties for:
    *   **Ship Status**: Energy, Shields, Torpedoes, Dock Status.
    *   **Navigation**: Quadrant (Galaxy) coordinates and Sector (Local) coordinates.
    *   **Galaxy Map**: An 8x8 integer grid encoding the contents of each quadrant (Klingons, Starbases, Stars).
    *   **Local Sector**: Arrays tracking entities (`localKlingons`, `localStarbases`) within the current quadrant for collision and combat.
    *   **Damage Control**: An array tracking the functional status of 8 distinct ship systems.

*   **I/O Abstraction**: The engine is decoupled from the DOM.
    *   **Output**: It pushes text lines to an internal `outputBuffer`.
    *   **Input**: It exposes a `processInput(string)` method.
    *   **Callbacks**: It supports callback-based prompts (e.g., asking for course input after a 'NAV' command).

### 2. User Interface (`components/GameTerminal.tsx`)
This is a Client Component responsible for rendering the visual "terminal".

*   **React State**: Manages the history of text lines displayed to the user.
*   **Terminal Simulation**:
    *   Captures user input via a hidden or styled HTML form.
    *   Passes commands to the `StarTrekGame` instance.
    *   Retrieves buffered output from the game instance and appends it to the display.
    *   Handles auto-scrolling to ensure the latest command is visible.

## Code Map

```text
web-startrek/
├── app/
│   ├── globals.css      # Global Styles
│   │                    # - Forces black background / green text
│   │                    # - Sets global monospace font
│   ├── layout.tsx       # Root Layout (Next.js boilerplate)
│   └── page.tsx         # Main Entry Point
│                        # - Renders the <GameTerminal />
├── components/
│   └── GameTerminal.tsx # TERMINAL UI COMPONENT
│                        # - Instantiates the StarTrekGame class
│                        # - Handles input/output loop
│                        # - Renders ASCII art and text
├── lib/
│   └── startrek.ts      # CORE GAME ENGINE
│                        # - Contains 'class StarTrekGame'
│                        # - Handles all logic (Combat, Nav, AI)
└── README.md            # This document
```

## Key Methods & Logic Flow

### `StarTrekGame` Class

*   **`init()`**:
    *   Randomly seeds the galaxy with Klingons, Stars, and Starbases.
    *   Sets random start/end Stardates.
    *   Places the Enterprise in a random quadrant.

*   **`processInput(input)`**:
    *   The main entry point for commands.
    *   Routes commands like 'NAV', 'PHA' to their respective private methods.

*   **`commandNav()`**:
    *   Calculates vector movement based on Course (1-9) and Warp (0-8).
    *   Consumes energy based on distance.
    *   Updates Stardate and triggers `klingonsMoveAndFire()`.
    *   Handles Quadrant transitions (updating the local sector map).

*   **`klingonsMoveAndFire()`**:
    *   The "AI" logic.
    *   Klingons fire on the Enterprise based on distance and random chance.
    *   Depletes Shields or Energy.

*   **`shortRangeScan()`**:
    *   Generates the 8x8 ASCII grid for the current sector.
    *   Checks for adjacency to Starbases to handle docking (refuel/repair).
