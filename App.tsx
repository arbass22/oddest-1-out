import React, { useState, useEffect, useCallback, useRef } from "react";
import { getTodaysPuzzle, getRandomPastPuzzle } from "./data/puzzles";
import {
  GameData,
  CardState,
  GameStatus,
  GameRow as GameRowType,
  RowDisplayState,
  GamePhase,
} from "./types";
import Card from "./components/Card";

const SCORE_LIMIT = 3;
type ScoreType = "RED" | "YELLOW" | "PURPLE";

// Animation timing constants
const SLIDE_DURATION = 800;
const CATEGORY_FADE_DURATION = 600;
const ROW_REORDER_DURATION = 1000;
const WIN_PAUSE = 1000;

// Helper for async delays
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Category Card Component ---
interface CategoryCardProps {
  category: string;
  words: string[];
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, words }) => {
  return (
    <div
      className="col-span-3 h-14 sm:h-16 bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 border-2 rounded-md flex flex-col items-center justify-center shadow-sm px-2 text-center select-none"
      style={{ animation: "fadeIn 600ms ease-out" }}
    >
      <span className="font-bold text-stone-900 dark:text-stone-100 uppercase text-xs sm:text-sm tracking-widest leading-tight mb-0.5">
        {category}
      </span>
      <span className="text-stone-600 dark:text-stone-400 uppercase text-[10px] sm:text-xs font-medium truncate w-full px-2">
        {words.join(", ")}
      </span>
    </div>
  );
};

// --- Game Row Component ---
interface GameRowProps {
  row: GameRowType;
  rowIndex: number;
  displayState: RowDisplayState;
  selection: number | undefined;
  failedIndices: Set<number>;
  gamePhase: GamePhase;
  isUltimateWinner: boolean;
  isPhase2: boolean;
  isSolved: boolean;
  onCardClick: (rIdx: number, wIdx: number) => void;
}

const GameRow: React.FC<GameRowProps> = ({
  row,
  rowIndex,
  displayState,
  selection,
  failedIndices,
  gamePhase,
  isUltimateWinner,
  isPhase2,
  isSolved,
  onCardClick,
}) => {
  const [gapSize, setGapSize] = useState("0.5rem");

  useEffect(() => {
    const updateGap = () => {
      setGapSize(window.innerWidth >= 640 ? "1rem" : "0.5rem");
    };
    updateGap();
    window.addEventListener("resize", updateGap);
    return () => window.removeEventListener("resize", updateGap);
  }, []);

  const outlierWord = row.words[row.outlierIndex];
  const nonOutlierWords = row.words
    .filter((_, idx) => idx !== row.outlierIndex)
    .map((w) => w.text);

  // REVEALED STATE: Only show category card + outlier
  if (displayState === "revealed") {
    // Ultimate winner shows purple, solved rows stay yellow, others keep selection color
    let outlierState = CardState.SELECTED_PHASE2;
    if (isUltimateWinner) {
      outlierState = CardState.ULTIMATE_WINNER;
    } else if (isSolved) {
      outlierState = CardState.LOCKED_OUTLIER;
    }

    return (
      <div className="grid grid-cols-4 gap-2 sm:gap-4 h-14 sm:h-16">
        <CategoryCard category={row.category} words={nonOutlierWords} />
        <Card
          text={outlierWord.text}
          state={outlierState}
          onClick={() => {}}
          disabled={true}
        />
      </div>
    );
  }

  // Get card state for interactive/sliding/locked modes
  const getCardState = (wIdx: number): CardState => {
    const isOutlier = wIdx === row.outlierIndex;

    // Sliding the ultimate winner: show purple for outlier
    if (displayState === "sliding" && isUltimateWinner) {
      return isOutlier ? CardState.ULTIMATE_WINNER : CardState.LOCKED_OTHER;
    }

    // Locked state or sliding a solved row: outlier is yellow, others are grayed out
    if (displayState === "locked" || (displayState === "sliding" && isSolved)) {
      return isOutlier ? CardState.LOCKED_OUTLIER : CardState.LOCKED_OTHER;
    }

    // Sliding an unsolved row: keep current colors
    if (failedIndices.has(wIdx)) return CardState.WRONG;
    if (selection === wIdx)
      return isPhase2 ? CardState.SELECTED_PHASE2 : CardState.SELECTED;
    return CardState.IDLE;
  };

  // Calculate slide positions
  const getCardStyle = (wIdx: number): React.CSSProperties => {
    if (displayState !== "sliding") {
      return {};
    }

    const isOutlier = wIdx === row.outlierIndex;
    const outlierIdx = row.outlierIndex;

    if (isOutlier) {
      // Outlier moves to position 3 (far right)
      const slotsToMove = 3 - wIdx;
      return {
        transform:
          slotsToMove !== 0
            ? `translateX(calc(${slotsToMove} * (100% + ${gapSize})))`
            : undefined,
        transition: `transform ${SLIDE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        zIndex: 20,
      };
    } else {
      // Non-outliers fill positions 0, 1, 2 in original relative order
      let nonOutlierOrder = 0;
      for (let i = 0; i < 4; i++) {
        if (i === outlierIdx) continue;
        if (i === wIdx) break;
        nonOutlierOrder++;
      }
      const targetPosition = nonOutlierOrder;
      const slotsToMove = targetPosition - wIdx;

      return {
        transform:
          slotsToMove !== 0
            ? `translateX(calc(${slotsToMove} * (100% + ${gapSize})))`
            : undefined,
        transition: `transform ${SLIDE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      };
    }
  };

  // INTERACTIVE or SLIDING: Show all 4 cards
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4 h-14 sm:h-16">
      {row.words.map((word, wIdx) => (
        <Card
          key={word.id}
          text={word.text}
          state={getCardState(wIdx)}
          onClick={() => onCardClick(rowIndex, wIdx)}
          disabled={
            gamePhase !== "playing" ||
            failedIndices.has(wIdx) ||
            displayState !== "interactive"
          }
          style={getCardStyle(wIdx)}
        />
      ))}
    </div>
  );
};

// --- Info Modal Component ---
const InfoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <div
      className="bg-white dark:bg-stone-800 rounded-lg shadow-2xl max-w-md w-full p-4 sm:p-6 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg sm:text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
          How to Play
        </h2>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-2xl leading-none"
        >
          &times;
        </button>
      </div>
      <div className="space-y-3 sm:space-y-4 text-stone-700 dark:text-stone-300 text-xs sm:text-sm">
        <div>
          <h3 className="font-bold text-stone-900 dark:text-stone-100 mb-1">
            Goal
          </h3>
          <p>
            Find the{" "}
            <span className="font-semibold">
              Oddest<span className="text-violet-500">1</span>Out
            </span>{" "}
            — the outlier among outliers.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-stone-900 dark:text-stone-100 mb-1">
            Phase 1: Select the Odd one out
          </h3>
          <p>
            Each row has four words. Three belong to a category, one doesn't.
            Select the Odd one in each row.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-stone-900 dark:text-stone-100 mb-1">
            Phase 2: Find the Oddest<span className="text-violet-500">1</span>
            Out
          </h3>
          <p>
            Once all rows have an Odd word selected, tap your choice for the
            Oddest word. Three of the Odd words share a hidden connection — one
            does not.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-stone-900 dark:text-stone-100 mb-1">
            Strikes
          </h3>
          <p>
            <span className="text-rose-500 font-semibold">Red</span> = Wrong
            guess (not an odd word).
            <br />
            <span className="text-amber-500 font-semibold">Yellow</span> =
            Correct word in row, but not the{" "}
            <span className="font-semibold">
              Oddest<span className="text-violet-500">1</span>Out
            </span>
            <br />3 strikes and you lose!
          </p>
        </div>
      </div>
    </div>
  </div>
);

// --- Main App Component ---
export default function App() {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [gameResult, setGameResult] = useState<"won" | "lost" | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [rowHeight, setRowHeight] = useState("4rem");
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("darkMode");
      return stored === null ? true : stored === "true";
    }
    return true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const updateRowHeight = () => {
      setRowHeight(window.innerWidth >= 640 ? "4rem" : "3.5rem");
    };
    updateRowHeight();
    window.addEventListener("resize", updateRowHeight);
    return () => window.removeEventListener("resize", updateRowHeight);
  }, []);

  const [selections, setSelections] = useState<Record<number, number>>({});
  const [rowStates, setRowStates] = useState<Record<number, RowDisplayState>>({
    0: "interactive",
    1: "interactive",
    2: "interactive",
    3: "interactive",
  });

  const [visualRowOrder, setVisualRowOrder] = useState<number[]>([0, 1, 2, 3]);
  const [showMetaOverlay, setShowMetaOverlay] = useState(false);

  const [score, setScore] = useState<ScoreType[]>([]);
  const [failedGuesses, setFailedGuesses] = useState<
    Record<number, Set<number>>
  >({});
  const [solvedRows, setSolvedRows] = useState<Set<number>>(new Set());
  const [feedbackMessage, setFeedbackMessage] = useState<
    "wrong" | "partial" | "lastguess" | null
  >(null);

  // Track if animation is running to prevent double triggers
  const isAnimatingRef = useRef(false);

  const resetGameState = useCallback(() => {
    setSelections({});
    setRowStates({
      0: "interactive",
      1: "interactive",
      2: "interactive",
      3: "interactive",
    });
    setScore([]);
    setFailedGuesses({});
    setSolvedRows(new Set());
    setFeedbackMessage(null);
    setVisualRowOrder([0, 1, 2, 3]);
    setShowMetaOverlay(false);
    setGamePhase("playing");
    setGameResult(null);
    isAnimatingRef.current = false;
  }, []);

  // Load today's puzzle (used on initial page load)
  const initGame = useCallback(async () => {
    resetGameState();
    const data = await getTodaysPuzzle();
    setGameData(data);
  }, [resetGameState]);

  // Load a random past puzzle (used when clicking shuffle button)
  const loadRandomPastPuzzle = useCallback(async () => {
    resetGameState();
    const data = await getRandomPastPuzzle();
    setGameData(data);
  }, [resetGameState]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // --- Animation Sequences ---

  const runWinSequence = useCallback(async (winnerRowIndex: number) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setGamePhase("animating");
    setGameResult("won");

    // 1. Winner row: slide cards
    setRowStates((prev) => ({ ...prev, [winnerRowIndex]: "sliding" }));
    await delay(SLIDE_DURATION);

    // 2. Winner row: reveal category
    setRowStates((prev) => ({ ...prev, [winnerRowIndex]: "revealed" }));
    await delay(WIN_PAUSE);

    // 3. Reveal other rows sequentially (including locked ones)
    const otherRows = [0, 1, 2, 3].filter((i) => i !== winnerRowIndex);
    for (const rowIdx of otherRows) {
      setRowStates((prev) => ({ ...prev, [rowIdx]: "sliding" }));
      await delay(SLIDE_DURATION);
      setRowStates((prev) => ({ ...prev, [rowIdx]: "revealed" }));
      await delay(CATEGORY_FADE_DURATION);
    }

    // 4. Reorder rows: winner to bottom
    await delay(500);
    const newOrder = new Array(4).fill(0);
    let pos = 0;
    for (let i = 0; i < 4; i++) {
      if (i !== winnerRowIndex) {
        newOrder[i] = pos;
        pos++;
      }
    }
    newOrder[winnerRowIndex] = 3;
    setVisualRowOrder(newOrder);
    await delay(ROW_REORDER_DURATION);

    // 5. Show meta overlay
    setShowMetaOverlay(true);
    setGamePhase("ended");
  }, []);

  const runLossSequence = useCallback(async (ultimateRowIndex: number) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setGamePhase("animating");
    setGameResult("lost");

    await delay(500);

    // Reveal all rows sequentially (including locked), ultimate winner last
    const rowOrder = [0, 1, 2, 3].filter((i) => i !== ultimateRowIndex);
    rowOrder.push(ultimateRowIndex);

    for (const rowIdx of rowOrder) {
      setRowStates((prev) => ({ ...prev, [rowIdx]: "sliding" }));
      await delay(SLIDE_DURATION);
      setRowStates((prev) => ({ ...prev, [rowIdx]: "revealed" }));
      await delay(CATEGORY_FADE_DURATION);
    }

    // Reorder rows: ultimate winner to bottom
    await delay(500);
    const newOrder = new Array(4).fill(0);
    let pos = 0;
    for (let i = 0; i < 4; i++) {
      if (i !== ultimateRowIndex) {
        newOrder[i] = pos;
        pos++;
      }
    }
    newOrder[ultimateRowIndex] = 3;
    setVisualRowOrder(newOrder);
    await delay(ROW_REORDER_DURATION);

    // Show meta overlay
    setShowMetaOverlay(true);
    setGamePhase("ended");
  }, []);

  // --- Game Logic ---

  const allRowsSelected = gameData
    ? Object.keys(selections).length === 4
    : false;

  const handleCardClick = async (rowIndex: number, wordIndex: number) => {
    if (gamePhase !== "playing" || !gameData) return;
    if (rowStates[rowIndex] !== "interactive") return;
    if (failedGuesses[rowIndex]?.has(wordIndex)) return;

    // --- PHASE 1: SELECTION ---
    if (!allRowsSelected) {
      setSelections((prev) => ({ ...prev, [rowIndex]: wordIndex }));
      setFeedbackMessage(null);
      return;
    }

    // --- PHASE 2: VERDICT ---
    if (selections[rowIndex] !== wordIndex) {
      setSelections((prev) => ({ ...prev, [rowIndex]: wordIndex }));
      setFeedbackMessage(null);
      return;
    }

    const targetRow = gameData.rows[rowIndex];
    const isRowOutlier = wordIndex === targetRow.outlierIndex;

    if (isRowOutlier) {
      const isUltimate = rowIndex === gameData.ultimateOutlierRowIndex;

      if (isUltimate) {
        // WIN!
        setScore((prev) => [...prev, "PURPLE" as ScoreType]);
        await runWinSequence(rowIndex);
      } else {
        // Partial correct (Yellow lock) - lock the row but don't reveal yet
        const newScore = [...score, "YELLOW" as ScoreType];
        setScore(newScore);
        setSolvedRows((prev) => new Set([...prev, rowIndex]));
        setRowStates((prev) => ({ ...prev, [rowIndex]: "locked" }));
        setFeedbackMessage(newScore.length === 2 ? "lastguess" : "partial");

        if (newScore.length >= SCORE_LIMIT) {
          await runLossSequence(gameData.ultimateOutlierRowIndex);
        }
      }
    } else {
      // WRONG (Red)
      const newScore = [...score, "RED" as ScoreType];
      setScore(newScore);
      setFeedbackMessage(newScore.length === 2 ? "lastguess" : "wrong");

      setFailedGuesses((prev) => {
        const rowSet = new Set(prev[rowIndex] || []);
        rowSet.add(wordIndex);
        return { ...prev, [rowIndex]: rowSet };
      });

      setSelections((prev) => {
        const next = { ...prev };
        delete next[rowIndex];
        return next;
      });

      if (newScore.length >= SCORE_LIMIT) {
        await runLossSequence(gameData.ultimateOutlierRowIndex);
      }
    }
  };

  // --- Render ---

  if (!gameData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-900 p-4 text-center">
        <h2 className="text-xl font-bold mb-4 text-stone-900 dark:text-stone-100">
          Something went wrong.
        </h2>
        <button
          onClick={initGame}
          className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-6 py-2 rounded-full"
        >
          Retry
        </button>
      </div>
    );
  }

  const metaWords = gameData.rows
    .filter((_, idx) => idx !== gameData.ultimateOutlierRowIndex)
    .map((r) => r.words[r.outlierIndex].text);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex flex-col items-center py-4 sm:py-8 px-3 sm:px-6 transition-colors duration-300">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Navbar */}
      <nav className="w-full max-w-2xl flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={loadRandomPastPuzzle}
          className="p-2 text-stone-700 dark:text-stone-300 hover:text-violet-500 transition-colors"
          aria-label="Random past puzzle"
          title="Random past puzzle"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              let shareText = 'Can you find the Oddest1Out? 🧩';

              if (gameResult === 'won') {
                const strikes = score.filter(s => s !== 'PURPLE').length;
                if (strikes === 0) {
                  shareText = 'I found the Oddest1Out with no strikes! 🟣 Can you beat that?';
                } else {
                  shareText = `I found the Oddest1Out! ${'🔴'.repeat(score.filter(s => s === 'RED').length)}${'🟡'.repeat(score.filter(s => s === 'YELLOW').length)}🟣 Can you do better?`;
                }
              } else if (gameResult === 'lost') {
                shareText = `I couldn't find the Oddest1Out today 😅 Can you?`;
              }

              try {
                await navigator.share({
                  title: 'Oddest1Out',
                  text: shareText,
                  url: window.location.href,
                });
              } catch (err) {
                // Fallback: copy to clipboard
                const fullText = `${shareText}\n${window.location.href}`;
                await navigator.clipboard.writeText(fullText);
                alert('Copied to clipboard!');
              }
            }}
            className="p-2 text-stone-700 dark:text-stone-300 hover:text-violet-500 transition-colors"
            aria-label="Share"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
              />
            </svg>
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowInfo(true)}
            className="p-2 text-stone-700 dark:text-stone-300 hover:text-violet-500 transition-colors"
            aria-label="How to play"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </nav>

      <header className="max-w-2xl w-full flex flex-col items-center mb-4 sm:mb-6">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
          Oddest<span className="text-violet-500">1</span>Out
        </h1>
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-stone-500 dark:text-stone-400 uppercase tracking-widest font-semibold mt-3">
          <span>Score:</span>
          <div className="flex space-x-1">
            {[...Array(SCORE_LIMIT)].map((_, i) => {
              const item = score[i];
              let colorClass = "bg-stone-300";
              if (item === "RED") colorClass = "bg-rose-500";
              if (item === "YELLOW") colorClass = "bg-amber-400";
              if (item === "PURPLE") colorClass = "bg-violet-500";
              return (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full transition-colors duration-300 ${colorClass}`}
                />
              );
            })}
          </div>
        </div>
      </header>

      <div className="max-w-2xl w-full mb-4 sm:mb-6 text-center">
        {gameResult ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2
              className={`text-xl sm:text-2xl font-serif font-bold mb-2 ${
                gameResult === "won" ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {gameResult === "won" ? "Victory!" : "Game Over"}
            </h2>
            <p className="text-stone-700 dark:text-stone-300 font-medium max-w-lg mx-auto text-sm sm:text-base">
              {gameData.ultimateExplanation}
            </p>
            <button
              onClick={initGame}
              className="mt-4 text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 border-b-2 border-stone-900 dark:border-stone-100 hover:text-stone-600 dark:hover:text-stone-400 hover:border-stone-600 dark:hover:border-stone-400 transition-colors"
            >
              Play Again
            </button>
          </div>
        ) : (
          <p
            className={`font-medium transition-colors duration-300 text-sm sm:text-base ${
              feedbackMessage === "wrong"
                ? "text-rose-500"
                : feedbackMessage === "partial"
                ? "text-amber-500"
                : feedbackMessage === "lastguess"
                ? "text-violet-500 font-bold"
                : allRowsSelected
                ? "text-violet-500"
                : "text-stone-600 dark:text-stone-400"
            }`}
          >
            {feedbackMessage === "wrong"
              ? "That one wasn't even Odd, try again"
              : feedbackMessage === "partial"
              ? "That's the Odd one out for this row, but not the Oddest one of them all."
              : feedbackMessage === "lastguess"
              ? "Last guess!"
              : !allRowsSelected
              ? "Select the outlier in each row"
              : "Find the Oddest1Out among your selections"}
          </p>
        )}
      </div>

      <div
        className="max-w-2xl w-full relative"
        style={{ height: `calc(4 * (${rowHeight} + 1rem))` }}
      >
        {/* Game Rows */}
        {gameData.rows.map((row, rIdx) => {
          const visualIndex = visualRowOrder[rIdx];
          const isWinner = gameData.ultimateOutlierRowIndex === rIdx;

          return (
            <div
              key={row.id}
              className="absolute w-full"
              style={{
                top: 0,
                transform: `translateY(calc(${visualIndex} * (${rowHeight} + 1rem)))`,
                transition: `transform ${ROW_REORDER_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                zIndex: isWinner && showMetaOverlay ? 5 : 10,
              }}
            >
              <div className="pb-4 h-[4.5rem] sm:h-20">
                <GameRow
                  row={row}
                  rowIndex={rIdx}
                  displayState={rowStates[rIdx]}
                  selection={selections[rIdx]}
                  failedIndices={failedGuesses[rIdx] || new Set()}
                  gamePhase={gamePhase}
                  isUltimateWinner={isWinner}
                  isPhase2={allRowsSelected}
                  isSolved={solvedRows.has(rIdx)}
                  onCardClick={handleCardClick}
                />
              </div>
            </div>
          );
        })}

        {/* Meta Category Overlay */}
        {showMetaOverlay && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              top: 0,
              right: 0,
              width: "calc(25% - 0.375rem)",
              height: `calc(3 * (${rowHeight} + 1rem) - 1rem)`,
              animation: "fadeIn 800ms ease-out",
            }}
          >
            <div className="w-full h-full bg-stone-100 dark:bg-stone-800 border-2 border-violet-500 rounded-md flex flex-col items-center justify-center text-center p-3 select-none">
              <span className="font-bold text-stone-900 dark:text-stone-100 uppercase text-xs sm:text-sm tracking-widest leading-tight mb-3">
                {gameData.metaCategory}
              </span>
              <div className="flex flex-col space-y-2">
                {metaWords.map((word) => (
                  <span
                    key={word}
                    className="text-stone-600 dark:text-stone-400 uppercase text-[10px] sm:text-xs font-medium"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </div>
  );
}
