# Oddest1Out

A puzzle game where you identify outliers within outliers. Built with React, TypeScript, and Vite.

## Gameplay

### Objective

Find the **Ultimate Oddest1Out** — a word that doesn't fit the hidden meta-pattern among the row outliers.

### How It Works

The game presents a 4x4 grid of words organized into 4 rows. Each row contains:
- **3 words** that belong to a specific category
- **1 outlier** that doesn't fit the row's category

The twist: among the 4 row outliers, 3 share a hidden "meta category" while 1 is the **Ultimate Oddest1Out**.

### Two-Phase Gameplay

**Phase 1 - Selection:** Click one word in each row that you believe is the outlier for that row. Selected cards turn yellow.

**Phase 2 - Verification:** Once all 4 rows have a selection, click a yellow card to lock in your guess:
- **Green (Win):** You found the Ultimate Oddest1Out
- **Blue (Partial):** Correct row outlier, but not the Ultimate Oddest1Out (+1 strike)
- **Red (Wrong):** Not an outlier at all (+1 strike)

### Strikes

You have 3 strikes before game over. Both blue (partial correct) and red (wrong) guesses count as strikes.

### Victory Condition

Win by identifying the Ultimate Oddest1Out — the row outlier that doesn't belong to the meta category shared by the other 3 outliers.

### Example Puzzle

| Row | Words | Category | Outlier |
|-----|-------|----------|---------|
| 1 | Mars, Venus, Jupiter, **Apollo** | Planets | Apollo (NASA program) |
| 2 | Zeus, Athena, **Gemini**, Poseidon | Greek Gods | Gemini (zodiac) |
| 3 | Poker, Blackjack, **Solitaire**, Bridge | Card Games | Solitaire (single-player) |
| 4 | Aries, Leo, **Mercury**, Scorpio | Zodiac Signs | Mercury (planet) |

**Meta Category:** NASA Space Programs (Apollo, Gemini, Mercury)
**Ultimate Oddest1Out:** Solitaire — it's a card game with no space connection

## Code Structure

```
├── index.tsx              # React app entry point
├── App.tsx                # Main game component with state management
├── types.ts               # TypeScript interfaces and enums
├── components/
│   ├── Card.tsx           # Individual word card with state-based styling
│   └── Modals.tsx         # Game over modal component
├── data/
│   └── puzzles.ts         # Static puzzle definitions
└── services/
    └── geminiService.ts   # AI puzzle generation (Gemini API)
```

### Key Components

**App.tsx** - The main game orchestrator containing:
- Game state management (selections, strikes, row states)
- Two-phase game logic (selection → verification)
- Animation sequences for win/loss/partial reveals
- Row reordering and meta category overlay display

**Card.tsx** - Stateless card component with 6 visual states:
- `IDLE` - Default white card
- `SELECTED` - Yellow highlight (Phase 1 selection)
- `WIN` - Green (Ultimate Oddest1Out found)
- `CORRECT_ROW_WRONG_GAME` - Blue (correct outlier, wrong meta)
- `WRONG` - Red with shake animation
- `INACTIVE_ROW` - Grayed out

**types.ts** - Core data structures:
- `GameData` - Full puzzle with rows, meta category, and ultimate outlier
- `GameRow` - Row with category, words, and outlier index
- `CardState` - Visual state enum
- `GamePhase` - Animation control states

### Animation System

The game features smooth CSS animations:
- Card sliding to reveal category groupings
- Row reordering to position the winner at bottom
- Meta category overlay fade-in connecting the 3 related outliers

### Puzzle Sources

Puzzles can come from:
1. **Static data** (`data/puzzles.ts`) - Handcrafted puzzles
2. **AI generation** (`services/geminiService.ts`) - Dynamic puzzles via Gemini 2.5 Flash

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```

2. (Optional) Set `GEMINI_API_KEY` in `.env.local` for AI puzzle generation

3. Run the app:
   ```
   npm run dev
   ```
