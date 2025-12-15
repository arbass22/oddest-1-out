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

### Step 1: Find the Outliers

Tap one word in each row that you think is the Odd 1 Out. The game guides you with contextual tips:
- *"3 words in each row fit a category. Tap the Odd 1 Out in each."*
- *"Keep going - find the Odd 1 Out in each row."*

Selected words get a **purple border**. Once all 4 rows have selections, your choices begin **pulsing with a purple glow**.

### Step 2: Check or Go for the Win

After selecting all rows, you have two options:

**Option A: Check Button (Safe Path)**
- Press the yellow **Check** button to verify your selections
- Correct guesses reveal the row's category
- Wrong guesses flash red, cost a strike (shown as a **circle**), and clear that selection
- If all 4 are correct, the outliers glow and you pick the Oddest

**Option B: Stand Out Mode (Risky Path)**
- Skip Check entirely and tap a pulsing selection directly
- Strikes and wins in Stand Out mode are shown as **stars** instead of circles
- If it's the **Oddest 1 Out** → You win immediately with a purple star!
- If it's a correct outlier but not the Oddest → Amber star, +1 strike
- If it's not even an outlier → Red star, +1 strike

### Step 3: Find the Oddest

Once rows are revealed (via Check), the 4 outliers glow on the right side. The tip updates:
- *"These are the Odd words for each row. Now tap the Oddest of the Odds to win."*

Three of these outliers share a hidden **meta-category**. One does not — that's the **Oddest 1 Out**. Tap it to win!

## Feedback & Strikes

You have **3 strikes** before game over. Your score is displayed as shapes:
- **Circles** = Check mode results
- **Stars** = Stand Out mode results (the reward for taking risks!)

| Result | Color | Shape | What Happened |
|--------|-------|-------|---------------|
| Win | Purple | Star | You found the Oddest 1 Out in Stand Out mode! |
| Partial | Amber | Star | Correct outlier via Stand Out, but not the Oddest |
| Wrong (Stand Out) | Red | Star | Guessed wrong in Stand Out mode |
| Wrong (Check) | Red | Circle | Failed a Check verification |

When you win in Stand Out mode, the victory screen displays a special **"Stand Out Mode"** acknowledgment with stars!

The tip system keeps you informed:
- *"That word fits the category. Try another in that row."* (red feedback)
- *"Correct outlier, but not the Oddest one."* (amber feedback)
- *"Final chance! Choose carefully."* (2 strikes used)

## Example Puzzle

| Row | Words | Category | Outlier |
|-----|-------|----------|---------|
| 1 | Mars, Venus, Jupiter, **Apollo** | Planets | Apollo |
| 2 | Zeus, Athena, **Gemini**, Poseidon | Greek Gods | Gemini |
| 3 | Poker, Blackjack, **Solitaire**, Bridge | Card Games | Solitaire |
| 4 | Aries, Leo, **Mercury**, Scorpio | Zodiac Signs | Mercury |

**The outliers:** Apollo, Gemini, Solitaire, Mercury

**Meta Category:** NASA Space Programs (Apollo, Gemini, Mercury)

**Oddest 1 Out:** Solitaire — it's the only one with no connection to space!

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
│   ├── globals.css          # Global styles
│   └── api/
│       └── puzzle/
│           ├── today/route.ts   # GET today's puzzle
│           └── random/route.ts  # GET random past puzzle
├── components/
│   ├── Game.tsx             # Main game component (state & logic)
│   ├── GameRow.tsx          # Row rendering with animations
│   ├── Card.tsx             # Individual word card (10 visual states)
│   ├── CategoryCard.tsx     # Revealed category display
│   ├── InfoModal.tsx        # How-to-play modal
│   └── Modals.tsx           # Win/loss modals
├── lib/
│   └── googleSheets.ts      # Puzzle fetching & parsing from Google Sheets
├── types.ts                 # TypeScript interfaces and enums
└── tailwind.config.js       # Custom animations
```

---

## Code Walkthrough: What Happens During Gameplay

### 1. Game Initialization

When the page loads, `Game.tsx` fetches today's puzzle:

```
Client sends local date → /api/puzzle/today?date=YYYY-MM-DD
                        ↓
API fetches from Google Sheets (cached 5 min)
                        ↓
Words shuffled within rows, rows shuffled
                        ↓
GameData returned to client
```

### 2. Phase 1: Selection

**User clicks a word card:**
- `handleCardClick()` in `Game.tsx` updates `selections` state
- `GameRow.tsx` receives the selection and determines card states
- Card transitions from `IDLE` → `SELECTED` (purple border)

**All 4 rows selected:**
- `allRowsSelected` becomes true
- Cards transition to `SELECTED_PHASE2` (adds `animate-pulse-glow`)
- After 1 second: Check button appears with `animate-check-entrance`
- After 2 seconds: "Stand Out Mode" text slides in

### 3. Phase 2a: Check Mode

**User clicks Check button:**
- `runCheckSequence()` iterates through each row
- For each row with a selection:
  - Compares `selections[rowIndex]` to `row.outlierIndex`
  - **If correct:**
    - `rowStates[rowIndex]` → `"sliding"`
    - Cards animate, outlier slides to position 3
    - `rowCheckStatuses[rowIndex]` → `"revealed"`
    - Category card appears
  - **If wrong:**
    - Card state → `WRONG` (red + shake animation)
    - Strike added to `score` array
    - Selection cleared from that row
- If 3 strikes: triggers `runLossSequence()`

### 3. Phase 2b: Stand Out Mode

**User clicks a pulsing selected card:**
- `handleStandoutGuess()` validates:
  1. Is this the correct outlier for the row?
  2. Is this the ultimate outlier row?
- **Both correct:** `runWinSequence()` triggers, purple star added to score
- **Outlier correct, not ultimate:** Amber reveal, yellow star strike
- **Wrong:** Red flash, red star strike, selection clears

Stand Out mode results are tracked with `shape: "star"` in the score items, while Check mode uses `shape: "circle"`.

### 4. Win/Loss Sequences

**Win Sequence (`runWinSequence`):**
1. Winner row slides (outlier moves right)
2. 1 second pause
3. Other rows reveal sequentially
4. Rows reorder: winner moves to bottom
5. Meta category overlay fades in showing the 3 connected outliers

**Loss Sequence (`runLossSequence`):**
1. Correct answer row reveals
2. Other rows reveal
3. Rows reorder: correct answer to bottom
4. Meta overlay shows with "Game Over" state

### 5. Visual State Machine

Cards flow through these states (defined in `types.ts`):

```
IDLE → SELECTED → SELECTED_PHASE2 (pulsing)
                        ↓
         ┌──────────────┼──────────────┐
         ↓              ↓              ↓
      WRONG     LOCKED_OUTLIER   ULTIMATE_WINNER
    (red shake)    (amber)         (purple)
```

---

## Animations

Custom Tailwind animations in `tailwind.config.js`:

| Animation | Duration | Purpose |
|-----------|----------|---------|
| `shake` | 500ms | Wrong guess feedback |
| `pulse-glow` | 1.5s infinite | Phase 2 selected cards |
| `pulse-text` | 1.5s infinite | "Stand Out" text emphasis |
| `check-entrance` | 1000ms | Check button slide-in |
| `standout-text-entrance` | 800ms | Stand Out text slide-in |

---

## API Endpoints

### GET /api/puzzle/today

Returns today's puzzle based on client's local date.

**Query params:**
- `date` (required): Client's local date as `YYYY-MM-DD`

**Response:**
```json
{
  "puzzle": {
    "rows": [...],
    "metaCategory": "NASA Space Programs",
    "ultimateOutlierRowIndex": 2,
    "ultimateExplanation": "..."
  }
}
```

### GET /api/puzzle/random

Returns a random puzzle from past dates (never today or future).

**Query params:**
- `date` (required): Client's local date as `YYYY-MM-DD`

---

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000

## Build for Production

```bash
npm run build
npm start
```
