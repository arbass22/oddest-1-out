# Oddest 1 Out

A NYTimes-style daily word puzzle where you find outliers within outliers. Built with Next.js, React, TypeScript, and Tailwind CSS.

## The Concept

This is a **two-layer puzzle**:

1. **Layer 1:** Find the word that doesn't belong in each row (the "Odd 1 Out")
2. **Layer 2:** Among those 4 outliers, find the one that doesn't fit with the others (the "Oddest 1 Out")

## How to Play

### The Grid

You're presented with a 4x4 grid of 16 words organized into 4 rows. In each row:
- **3 words** share a hidden category
- **1 word** is the outlier that doesn't fit

### The Oddest Puzzle Row

Below the main grid is the **Oddest Puzzle Row** - a row of 4 empty slots that fills as you make selections. This row makes the two-phase puzzle clear:
- As you select an outlier from each row in the grid above, it appears in the next available slot
- Once all 4 slots are filled, the Oddest Puzzle Row glows, indicating you're ready for the final phase
- This is where you'll make your final guess for the Oddest 1 Out

### Step 1: Find the Outliers

Tap one word in each row that you think is the Odd 1 Out:
- Selected words get a **purple border** in the main grid
- Each selection fills a slot in the Oddest Puzzle Row below
- If you change your mind, tap a different word - the Oddest Puzzle Row updates automatically

### Step 2: Check or Pick the Oddest

Once all 4 rows have selections, you have two options shown between the grid and the Oddest Puzzle Row:

**Left side:** "Now pick the Oddest of the Odds below" - instructs you to select from the Oddest Puzzle Row

**Right side:** Yellow **Check** button - validates your outlier selections first

#### Option A: Pick from Oddest Puzzle Row (Stand Out Mode)
- Tap a card in the glowing Oddest Puzzle Row
- That card glows brighter, other cards dim (but remain selectable if you change your mind)
- "Tap again to submit" appears below
- Tap again to confirm your guess
- If correct: You win with a purple star!
- If wrong: Strike added, continue playing

#### Option B: Check Button (Safe Path)
- Press Check to verify your outlier selections first
- Correct guesses: Row reveals its category, outlier stays in Oddest Puzzle Row
- Wrong guesses:
  - Strike added (shown as circle)
  - That slot shows "Pick another word" in the Oddest Puzzle Row
  - The corresponding row in the grid glows, prompting you to pick again
- After Check, pick from the Oddest Puzzle Row to find the ultimate winner

### Step 3: Win or Lose

- Find the Oddest 1 Out to win!
- Three strikes and you lose
- The meta-category is revealed showing how 3 of the outliers connect

## Feedback & Strikes

You have **3 strikes** before game over. Your score is displayed as shapes:
- **Stars** = Stand Out mode results (picked from Oddest Puzzle Row without Check)
- **Circles** = Check mode results

| Result | Color | Shape | What Happened |
|--------|-------|-------|---------------|
| Win | Purple | Star/Circle | You found the Oddest 1 Out! |
| Partial | Amber | Star | Correct outlier via Stand Out, but not the Oddest |
| Wrong (Stand Out) | Red | Star | Guessed wrong in Stand Out mode |
| Wrong (Check) | Red | Circle | Failed a Check verification |

## UI Components

### Main Grid (4x4)
- Interactive word cards organized in 4 rows
- Purple border indicates selection
- Cards no longer glow when all selected (glow moved to Oddest Puzzle Row)
- Revealed rows show category + outlier

### Check Button Section
- **Left:** Instruction text ("Now pick the Oddest of the Odds below")
- **Middle:** "Or" separator
- **Right:** Check button (grey when inactive, yellow with wipe animation when active)

### Oddest Puzzle Row
- 4 slots that fill as selections are made
- Empty slots show "?" placeholder
- Wrong guesses show "Pick another word" placeholder
- Glows purple when all slots filled
- Two-tap selection: first tap highlights, second tap submits

## Example Puzzle

| Row | Words | Category | Outlier |
|-----|-------|----------|---------|
| 1 | Mars, Venus, Jupiter, **Apollo** | Planets | Apollo |
| 2 | Zeus, Athena, **Gemini**, Poseidon | Greek Gods | Gemini |
| 3 | Poker, Blackjack, **Solitaire**, Bridge | Card Games | Solitaire |
| 4 | Aries, Leo, **Mercury**, Scorpio | Zodiac Signs | Mercury |

**The outliers:** Apollo, Gemini, Solitaire, Mercury

**Meta Category:** NASA Space Programs (Apollo, Gemini, Mercury)

**Oddest 1 Out:** Solitaire - it's the only one with no connection to space!

---

## Technical Architecture

### Tech Stack

- **Framework:** Next.js 15 with App Router
- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS with dark mode support
- **Data Source:** Google Sheets via Google Visualization API
- **Date Handling:** dayjs

### Project Structure

```
oddest-1-out/
├── app/
│   ├── layout.tsx           # Root layout with metadata & fonts
│   ├── page.tsx             # Home page (renders <Game />)
│   ├── globals.css          # Global styles & animations
│   └── api/
│       └── puzzle/
│           ├── today/route.ts   # GET today's puzzle
│           └── random/route.ts  # GET random past puzzle
├── components/
│   ├── Game.tsx             # Main game component (state & logic)
│   ├── GameRow.tsx          # Row rendering with animations
│   ├── Card.tsx             # Individual word card (visual states)
│   ├── CategoryCard.tsx     # Revealed category display
│   ├── OddestPuzzleRow.tsx  # Bottom puzzle row for final selection
│   └── InfoModal.tsx        # How-to-play modal
├── lib/
│   └── googleSheets.ts      # Puzzle fetching & parsing
├── types.ts                 # TypeScript interfaces and enums
└── tailwind.config.js       # Custom animations
```

### Key State Variables (Game.tsx)

| State | Purpose |
|-------|---------|
| `selections` | Maps row index to selected word index |
| `selectionOrder` | Tracks order of selections for Oddest Puzzle Row |
| `oddestPuzzleSelection` | Currently highlighted card in Oddest Puzzle Row |
| `rowsNeedingReselection` | Rows that failed Check and need new selection |
| `rowCheckStatuses` | Tracks if each row is "pending" or "revealed" |
| `allPuzzleSlotsFilled` | True when all 4 slots in Oddest Puzzle Row are filled |

### Card States (types.ts)

| State | Visual | When Used |
|-------|--------|-----------|
| `IDLE` | White/default | Unselected cards |
| `SELECTED` | Purple border | Selected in main grid |
| `SELECTED_NO_GLOW` | Purple border, no glow | Selected when all rows have selections |
| `SELECTED_PHASE2` | Purple border + glow | Cards in Oddest Puzzle Row ready for selection |
| `DIMMED` | Greyed out | Other cards when one is selected in Oddest Puzzle Row |
| `WRONG` | Red + shake | Failed guess |
| `LOCKED_OUTLIER` | Amber | Correct outlier (not ultimate) |
| `ULTIMATE_WINNER` | Purple | The winning card |

---

## Animations

| Animation | Purpose |
|-----------|---------|
| `shake` | Wrong guess feedback |
| `pulse-glow` | Synced glow on ready-to-select cards |
| `wipeActivate` | Check button turns yellow with left-to-right wipe |
| `fadeIn` | Meta category overlay appearance |
| `textPop` | Instruction text animations |

---

## API Endpoints

### GET /api/puzzle/today

Returns today's puzzle based on client's local date.

**Query params:**
- `date` (required): Client's local date as `YYYY-MM-DD`

### GET /api/puzzle/random

Returns a random puzzle from past dates (never today or future).

---

## Run Locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build for Production

```bash
npm run build
npm start
```
