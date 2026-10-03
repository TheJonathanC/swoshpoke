# 🃏 swoshpoke - 3D Texas Hold 'em Poker

A full 3D Texas Hold 'em Poker game rewritten with **Next.js**, **React**, **Three.js**, and a **fully independent, headless TypeScript Poker Engine**.

![Node.js](https://img.shields.io/badge/Node.js-v24+-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-v16+-black.svg)
![Three.js](https://img.shields.io/badge/Three.js-3D-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-v5-blue.svg)

---

## 🌟 Highlights

- **Exact Visual & Functional Parity**: Retains the complete 3D table, OrbitControls, procedural felt, dynamic chip stacks, realistic cards, player badges, HUD overlays, animations, and sound/log feedback from the original implementation.
- **Next.js & React Architecture**: Built with modern Next.js App Router, TypeScript, and clean component isolation.
- **100% Independent Poker Engine (`src/engine/`)**: Headless, zero-dependency poker engine that can be copied and run in **any project** (Node.js backend, CLI tool, bots, React/Vue/Svelte frontend, etc.).

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended, tested on v24)
- npm, pnpm, yarn, or bun

### Installation

```bash
git clone https://github.com/TheJonathanC/swoshpoke.git
cd swoshpoke
npm install
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

---

## 🧩 Standalone Poker Engine (`src/engine`)

The poker engine is completely decoupled from React, DOM, Three.js, and browser APIs. You can copy the `src/engine/` directory into any Node.js or frontend project and run it right away.

### Features
- Complete Texas Hold 'em game loop: Preflop, Flop, Turn, River, Showdown
- Full deck & card representations with Fisher-Yates shuffling
- Automated bot decision logic with customizable delays
- Robust 5-card & 7-card hand evaluators (Straight Flush down to High Card)
- Event-driven callback system (`log`, `stateChange`, `cardsDealt`, `communityCardsRevealed`, `playerAction`, `stageChanged`, `showdown`, `potAwarded`)
- Chip denominations and stack breakdown calculator

### Quick Standalone Node.js Example

```typescript
import { PokerEngine } from './src/engine';

// Initialize headless engine with synchronous bot turns
const engine = new PokerEngine({
    initialChips: 1000,
    smallBlind: 10,
    bigBlind: 20,
    botDelayMs: 0,
    autoStepBots: true
});

// Subscribe to game logs
engine.on('log', ({ message, highlight }) => {
    console.log((highlight ? '⭐ ' : '') + message);
});

// Subscribe to stage transitions
engine.on('stageChanged', (stage) => {
    console.log(`Current Stage: ${stage}, Pot: $${engine.pot}`);
});

// Subscribe to showdown and winner
engine.on('potAwarded', ({ winner, potAmount, reason }) => {
    console.log(`🏆 ${winner.name} wins $${potAmount}! ${reason}`);
});

// Start a hand
engine.startNewHand();

// Perform human actions (Player 0)
if (engine.currentTurnIdx === 0) {
    engine.call(0); // or engine.raise(100, 0), engine.fold(0), engine.check(0)
}
```

---

## 📁 Project Structure

```
swoshpoke/
├── main.html                 # Original single-file implementation (reference)
├── src/
│   ├── app/
│   │   ├── globals.css       # Clean global styling and resets
│   │   ├── layout.tsx        # HTML & body root layout
│   │   └── page.tsx          # Dynamic client-side game page (SSR safe)
│   ├── components/
│   │   └── poker/
│   │       ├── PokerGame.tsx # React component bridging UI & Engine
│   │       ├── poker-3d.ts   # Three.js 3D table, camera, cards & chips
│   │       └── poker.css     # HUD, badges, controls & log box styling
│   └── engine/
│       ├── types.ts          # Pure TypeScript types & interfaces
│       ├── constants.ts      # Suits, values, chip denominations & breakdown
│       ├── deck.ts           # Card & Deck classes
│       ├── hand-evaluator.ts # 5-card & 7-card Texas Hold'em evaluators
│       ├── poker-engine.ts   # Headless poker engine with full game loop
│       └── index.ts          # Main engine export entry point
├── package.json
└── tsconfig.json
```

---

## 📜 License

MIT
