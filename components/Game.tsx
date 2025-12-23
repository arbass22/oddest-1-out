'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import dayjs from "dayjs";
import {
  GameData,
  GameRow as GameRowType,
  RowDisplayState,
  GamePhase,
  RowCheckStatus,
} from "@/types";
import GameRow from "@/components/GameRow";
import InfoModal from "@/components/InfoModal";
import OddestPuzzleRow from "@/components/OddestPuzzleRow";

const SCORE_LIMIT = 3;
type ScoreColor = "RED" | "YELLOW" | "PURPLE";
type ScoreShape = "circle" | "star";
interface ScoreItem {
  color: ScoreColor;
  shape: ScoreShape;
}
type FeedbackMessage = "wrong" | "partial" | "lastguess";

// Tip configuration - single source of truth for all tip text
// Note: className is now dynamic based on whether this text area is "active" (newest instruction)
interface Tip {
  id: string;
  text: string;
  // For split-color tips like wrong state
  splitText?: { redPart: string; purplePart: string };
}

const TIPS: Record<string, Tip> = {
  initial: {
    id: "initial",
    text: "3 words in each row fit a category. Tap the Odd 1 Out in each.",
  },
  selecting: {
    id: "selecting",
    text: "Keep going - find the Odd 1 Out in each row.",
  },
  ready: {
    id: "ready",
    text: "You may change your selection for each row in the grid at any time.",
  },
  continueSelecting: {
    id: "continueSelecting",
    text: "Select the Odd 1 Out in the remaining rows.",
  },
  nearWin: {
    id: "nearWin",
    text: "One row left - is this the Oddest 1 Out?",
  },
  wrong: {
    id: "wrong",
    text: "",
    splitText: { redPart: "That word is not the Odd 1.", purplePart: "Try another in that row." },
  },
  partial: {
    id: "partial",
    text: "Correct outlier, but not the Oddest one.",
  },
  lastGuess: {
    id: "lastGuess",
    text: "Final chance! Choose carefully.",
  },
  allRevealed: {
    id: "allRevealed",
    text: "These are the Odd words for each row. Now tap the Oddest of the Odds to win.",
  },
};

// Derive tip based on game state
function getTip(
  feedbackMessage: FeedbackMessage | null,
  selectionsInUnrevealedRows: number,
  unrevealedRowCount: number,
  allRowsSelected: boolean,
  hasAnyReveals: boolean
): Tip {
  // Priority 1: Active feedback (overrides everything)
  if (feedbackMessage) {
    if (feedbackMessage === "lastguess") return TIPS.lastGuess;
    if (feedbackMessage === "wrong") return TIPS.wrong;
    if (feedbackMessage === "partial") return TIPS.partial;
  }

  // Priority 2: All rows revealed - pick the ultimate
  if (unrevealedRowCount === 0) return TIPS.allRevealed;

  // Priority 3: Near-win (1 row left with selection)
  if (unrevealedRowCount === 1 && allRowsSelected) return TIPS.nearWin;

  // Priority 3: Ready state (all selections made)
  if (allRowsSelected) return TIPS.ready;

  // Priority 4: Continue after reveals
  if (hasAnyReveals && selectionsInUnrevealedRows < unrevealedRowCount) {
    return TIPS.continueSelecting;
  }

  // Priority 5: Selecting (some progress)
  if (selectionsInUnrevealedRows > 0) return TIPS.selecting;

  // Priority 6: Initial
  return TIPS.initial;
}

// Animation timing constants
const SLIDE_DURATION = 800;
const CATEGORY_FADE_DURATION = 600;
const ROW_REORDER_DURATION = 1000;
const WIN_PAUSE = 1000;
const WRONG_FLASH_DURATION = 500;
const ROW_CHECK_DELAY = 400;

// Helper for async delays
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch today's puzzle from API
async function fetchTodaysPuzzle(): Promise<GameData> {
  const localDate = dayjs().format('YYYY-MM-DD');
  const res = await fetch(`/api/puzzle/today?date=${localDate}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.puzzle;
}

// Fetch random past puzzle from API
async function fetchRandomPastPuzzle(): Promise<GameData> {
  const localDate = dayjs().format('YYYY-MM-DD');
  const res = await fetch(`/api/puzzle/random?date=${localDate}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.puzzle;
}

export default function Game() {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [gameResult, setGameResult] = useState<"won" | "lost" | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showStandoutInfo, setShowStandoutInfo] = useState(false);
  const [showStandoutText, setShowStandoutText] = useState(false);
  const [showCheckButtonDelayed, setShowCheckButtonDelayed] = useState(false);
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

  // Synced glow animation using CSS custom property
  useEffect(() => {
    const GLOW_DURATION = 1500; // ms, matches animation duration
    let animationId: number;

    const updateGlow = () => {
      const progress = (Date.now() % GLOW_DURATION) / GLOW_DURATION;
      // Sine wave: 0 -> 1 -> 0 over the cycle
      const intensity = Math.sin(progress * Math.PI);
      document.documentElement.style.setProperty('--glow-intensity', String(intensity));
      animationId = requestAnimationFrame(updateGlow);
    };

    updateGlow();
    return () => cancelAnimationFrame(animationId);
  }, []);

  const [selections, setSelections] = useState<Record<number, number>>({});
  const [selectionOrder, setSelectionOrder] = useState<number[]>([]); // Track order of row selections
  const [oddestPuzzleSelection, setOddestPuzzleSelection] = useState<number | null>(null); // Track selected card in Oddest Puzzle row (by rowIndex)
  const [rowStates, setRowStates] = useState<Record<number, RowDisplayState>>({
    0: "interactive",
    1: "interactive",
    2: "interactive",
    3: "interactive",
  });

  const [visualRowOrder, setVisualRowOrder] = useState<number[]>([0, 1, 2, 3]);
  const [showMetaOverlay, setShowMetaOverlay] = useState(false);

  const [score, setScore] = useState<ScoreItem[]>([]);
  const [hasUsedCheck, setHasUsedCheck] = useState(false);
  const [failedGuesses, setFailedGuesses] = useState<
    Record<number, Set<number>>
  >({});
  const [solvedRows, setSolvedRows] = useState<Set<number>>(new Set());
  const [rowsNeedingReselection, setRowsNeedingReselection] = useState<Set<number>>(new Set());
  const [feedbackMessage, setFeedbackMessage] = useState<
    "wrong" | "partial" | "lastguess" | null
  >(null);
  const [rowCheckStatuses, setRowCheckStatuses] = useState<Record<number, RowCheckStatus>>({
    0: "pending",
    1: "pending",
    2: "pending",
    3: "pending",
  });

  // Track if animation is running to prevent double triggers
  const isAnimatingRef = useRef(false);

  // Store last displayed tip to freeze during checking phase
  const lastTipRef = useRef<Tip>(TIPS.initial);

  // Keep score ref in sync for use in async callbacks (avoids stale closure issues)
  const scoreRef = useRef<ScoreItem[]>([]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const resetGameState = useCallback(() => {
    setSelections({});
    setSelectionOrder([]);
    setOddestPuzzleSelection(null);
    setRowStates({
      0: "interactive",
      1: "interactive",
      2: "interactive",
      3: "interactive",
    });
    setScore([]);
    scoreRef.current = [];
    setHasUsedCheck(false);
    setFailedGuesses({});
    setSolvedRows(new Set());
    setRowsNeedingReselection(new Set());
    setFeedbackMessage(null);
    setVisualRowOrder([0, 1, 2, 3]);
    setShowMetaOverlay(false);
    setGamePhase("playing");
    setGameResult(null);
    setRowCheckStatuses({
      0: "pending",
      1: "pending",
      2: "pending",
      3: "pending",
    });
    isAnimatingRef.current = false;
  }, []);

  // Load today's puzzle (used on initial page load)
  const initGame = useCallback(async () => {
    resetGameState();
    const data = await fetchTodaysPuzzle();
    setGameData(data);
  }, [resetGameState]);

  // Load a random past puzzle (used when clicking shuffle button)
  const loadRandomPastPuzzle = useCallback(async () => {
    resetGameState();
    const data = await fetchRandomPastPuzzle();
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

    // 1. Winner row: slide cards (only if not already revealed)
    if (rowStates[winnerRowIndex] !== "revealed") {
      setRowStates((prev) => ({ ...prev, [winnerRowIndex]: "sliding" }));
      await delay(SLIDE_DURATION);
      setRowStates((prev) => ({ ...prev, [winnerRowIndex]: "revealed" }));
    }
    await delay(WIN_PAUSE);

    // 2. Reveal other rows sequentially (skip already revealed)
    const otherRows = [0, 1, 2, 3].filter((i) => i !== winnerRowIndex);
    for (const rowIdx of otherRows) {
      if (rowStates[rowIdx] === "revealed") continue; // Skip already revealed
      setRowStates((prev) => ({ ...prev, [rowIdx]: "sliding" }));
      await delay(SLIDE_DURATION);
      setRowStates((prev) => ({ ...prev, [rowIdx]: "revealed" }));
      await delay(CATEGORY_FADE_DURATION);
    }

    // 3. Reorder rows: winner to bottom
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

    // 4. Show meta overlay
    setShowMetaOverlay(true);
    setGamePhase("ended");
  }, [rowStates]);

  const runLossSequence = useCallback(async (ultimateRowIndex: number) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setGamePhase("animating");
    setGameResult("lost");

    await delay(500);

    // Reveal all rows sequentially (skip already revealed), ultimate winner last
    const rowOrder = [0, 1, 2, 3].filter((i) => i !== ultimateRowIndex);
    rowOrder.push(ultimateRowIndex);

    for (const rowIdx of rowOrder) {
      if (rowStates[rowIdx] === "revealed") continue; // Skip already revealed
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
  }, [rowStates]);

  // --- Check Mode: Grade row selections one by one ---
  const runCheckSequence = useCallback(async () => {
    if (isAnimatingRef.current || !gameData) return;
    isAnimatingRef.current = true;
    setGamePhase("checking");
    setFeedbackMessage(null);

    // Mark that Check was used - Stand Out mode is now forfeit
    setHasUsedCheck(true);

    // Convert any existing stars to circles (forfeit Stand Out mode rewards)
    // Use scoreRef to ensure we have the latest score (avoids stale closure issues)
    let currentScore = scoreRef.current.map(item => ({
      ...item,
      shape: "circle" as ScoreShape
    }));
    setScore(currentScore);
    scoreRef.current = currentScore;

    for (let rowIndex = 0; rowIndex < 4; rowIndex++) {
      // Skip already revealed rows
      if (rowCheckStatuses[rowIndex] === "revealed") continue;

      const selectedIdx = selections[rowIndex];
      if (selectedIdx === undefined) continue;

      const isCorrect = selectedIdx === gameData.rows[rowIndex].outlierIndex;

      if (isCorrect) {
        // Slide animation → reveal category (stays purple, no strike)
        setRowStates((prev) => ({ ...prev, [rowIndex]: "sliding" }));
        await delay(SLIDE_DURATION);
        setRowStates((prev) => ({ ...prev, [rowIndex]: "revealed" }));
        setRowCheckStatuses((prev) => ({ ...prev, [rowIndex]: "revealed" }));
        // Note: Don't set solvedRows here - that's only for Standout partial (amber)
        await delay(CATEGORY_FADE_DURATION);
      } else {
        // Wrong: flash red, add strike, clear selection
        setFailedGuesses((prev) => {
          const set = new Set(prev[rowIndex] || []);
          set.add(selectedIdx);
          return { ...prev, [rowIndex]: set };
        });

        currentScore = [...currentScore, { color: "RED" as ScoreColor, shape: "circle" as ScoreShape }];
        setScore(currentScore);
        scoreRef.current = currentScore;

        setSelections((prev) => {
          const next = { ...prev };
          delete next[rowIndex];
          return next;
        });
        // Mark row as needing reselection (keep in selectionOrder for slot position)
        setRowsNeedingReselection((prev) => new Set([...prev, rowIndex]));

        // Show feedback message based on strikes
        setFeedbackMessage(currentScore.length === 2 ? "lastguess" : "wrong");

        await delay(WRONG_FLASH_DURATION);

        if (currentScore.length >= SCORE_LIMIT) {
          // Reset animation flag so runLossSequence can execute
          isAnimatingRef.current = false;
          await runLossSequence(gameData.ultimateOutlierRowIndex);
          return;
        }
      }

      await delay(ROW_CHECK_DELAY);
    }

    isAnimatingRef.current = false;
    setGamePhase("playing");
  }, [gameData, selections, rowCheckStatuses, runLossSequence]);

  // --- Standout Mode: Guess the ultimate oddest one out ---
  const handleStandoutGuess = useCallback(async (rowIndex: number) => {
    if (!gameData) return;

    // Clear the puzzle selection after any guess attempt
    setOddestPuzzleSelection(null);

    const isRevealed = rowCheckStatuses[rowIndex] === "revealed";
    // For revealed rows, use the outlier index since that's what's displayed in OddestPuzzleRow
    const selectedIdx = isRevealed
      ? gameData.rows[rowIndex].outlierIndex
      : selections[rowIndex];
    const isRowOutlier = selectedIdx === gameData.rows[rowIndex].outlierIndex;
    const isUltimate = rowIndex === gameData.ultimateOutlierRowIndex;

    // Use stars only if Check was never used (pure Stand Out mode)
    const scoreShape: ScoreShape = hasUsedCheck ? "circle" : "star";

    if (isUltimate && isRowOutlier) {
      // WIN!
      const newScore = [...scoreRef.current, { color: "PURPLE" as ScoreColor, shape: scoreShape }];
      setScore(newScore);
      scoreRef.current = newScore;
      await runWinSequence(rowIndex);
      return;
    }

    if (isRowOutlier) {
      // Correct outlier but not ultimate → YELLOW
      const newScore = [...scoreRef.current, { color: "YELLOW" as ScoreColor, shape: scoreShape }];
      setScore(newScore);
      scoreRef.current = newScore;
      setSolvedRows((prev) => new Set([...prev, rowIndex]));

      // Reveal this row if not already revealed
      if (!isRevealed) {
        setRowStates((prev) => ({ ...prev, [rowIndex]: "sliding" }));
        await delay(SLIDE_DURATION);
        setRowStates((prev) => ({ ...prev, [rowIndex]: "revealed" }));
        setRowCheckStatuses((prev) => ({ ...prev, [rowIndex]: "revealed" }));
      }

      setFeedbackMessage(newScore.length === 2 ? "lastguess" : "partial");

      if (newScore.length >= SCORE_LIMIT) {
        await runLossSequence(gameData.ultimateOutlierRowIndex);
      }
    } else {
      // Wrong → RED (only possible on unrevealed rows)
      const newScore = [...scoreRef.current, { color: "RED" as ScoreColor, shape: scoreShape }];
      setScore(newScore);
      scoreRef.current = newScore;
      setFeedbackMessage(newScore.length === 2 ? "lastguess" : "wrong");

      setFailedGuesses((prev) => {
        const set = new Set(prev[rowIndex] || []);
        set.add(selectedIdx);
        return { ...prev, [rowIndex]: set };
      });

      setSelections((prev) => {
        const next = { ...prev };
        delete next[rowIndex];
        return next;
      });
      // Remove from selection order when cleared
      setSelectionOrder((prev) => prev.filter((idx) => idx !== rowIndex));

      if (newScore.length >= SCORE_LIMIT) {
        await runLossSequence(gameData.ultimateOutlierRowIndex);
      }
    }
  }, [gameData, selections, rowCheckStatuses, hasUsedCheck, runWinSequence, runLossSequence]);

  // --- Game Logic ---

  // Count how many unrevealed rows exist and how many have selections
  const unrevealedRowCount = Object.values(rowCheckStatuses).filter(s => s === "pending").length;
  const selectionsInUnrevealedRows = gameData
    ? Object.keys(selections).filter(rowIdx => rowCheckStatuses[parseInt(rowIdx)] === "pending").length
    : 0;

  // All rows are "selected" when every unrevealed row has a selection
  const allRowsSelected = gameData
    ? unrevealedRowCount > 0 && selectionsInUnrevealedRows === unrevealedRowCount
    : false;

  // Check if any rows have been revealed (for tip logic)
  const hasAnyReveals = Object.values(rowCheckStatuses).some(s => s === "revealed");

  // All puzzle slots filled = every row is either revealed OR has a pending selection
  const allPuzzleSlotsFilled = gameData
    ? [0, 1, 2, 3].every((rowIdx) =>
        rowCheckStatuses[rowIdx] === "revealed" ||
        (rowCheckStatuses[rowIdx] === "pending" && selections[rowIdx] !== undefined)
      )
    : false;

  // Show Check button when all rows selected and game is in playing state
  const showCheckButton = allRowsSelected && gamePhase === "playing";

  // Delay showing the Check button and Stand Out text
  useEffect(() => {
    if (showCheckButton) {
      // Show Check button after 1 second
      const checkTimer = setTimeout(() => {
        setShowCheckButtonDelayed(true);
      }, 1000);
      // Show Stand Out text 1 second after Check button (2s total)
      const standoutTimer = setTimeout(() => {
        setShowStandoutText(true);
      }, 2000);
      return () => {
        clearTimeout(checkTimer);
        clearTimeout(standoutTimer);
      };
    } else {
      setShowCheckButtonDelayed(false);
      setShowStandoutText(false);
    }
  }, [showCheckButton]);

  const handleCardClick = async (rowIndex: number, wordIndex: number) => {
    if (gamePhase !== "playing" || !gameData) return;

    const isRevealed = rowCheckStatuses[rowIndex] === "revealed";

    // Revealed rows: no direct interaction, use Oddest Puzzle row instead
    if (isRevealed) {
      return;
    }

    // Unrevealed row checks
    if (rowStates[rowIndex] !== "interactive") return;
    if (failedGuesses[rowIndex]?.has(wordIndex)) return;

    // Clear any oddest puzzle selection when changing grid selections
    setOddestPuzzleSelection(null);

    // Toggle/change selection - grid only feeds the bottom puzzle, no direct guesses
    setSelections((prev) => ({ ...prev, [rowIndex]: wordIndex }));
    // Update selection order - add to end if not already present
    setSelectionOrder((prev) => {
      if (prev.includes(rowIndex)) {
        return prev; // Already in order, keep position
      }
      return [...prev, rowIndex];
    });
    // Clear from rowsNeedingReselection if user just made a new selection for this row
    setRowsNeedingReselection((prev) => {
      const next = new Set(prev);
      next.delete(rowIndex);
      return next;
    });
    setFeedbackMessage(null);
  };

  // --- Render ---

  if (!gameData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-900 p-4 text-center">
        <h2 className="text-xl font-bold mb-4 text-stone-900 dark:text-stone-100">
          Loading...
        </h2>
      </div>
    );
  }

  const metaWordsWithStatus = gameData.rows
    .map((r, idx) => ({
      text: r.words[r.outlierIndex].text,
      rowIndex: idx,
      isPartial: solvedRows.has(idx)
    }))
    .filter((item) => item.rowIndex !== gameData.ultimateOutlierRowIndex);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex flex-col items-center py-4 sm:py-8 px-3 sm:px-6 transition-colors duration-300">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes textPop {
          0% { opacity: 0; transform: translateY(-8px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-text-pop {
          animation: textPop 300ms ease-out forwards;
        }
      `}</style>

      {/* Navbar */}
      <nav className="w-full max-w-2xl flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={loadRandomPastPuzzle}
          className="text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
          aria-label="Play Archived Puzzles"
        >
          Play Archived Puzzles
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              let shareText = 'Can you find the Oddest1Out?';

              if (gameResult === 'won') {
                const strikes = score.filter(s => s.color !== 'PURPLE').length;
                const hasStars = score.some(s => s.shape === 'star');
                if (strikes === 0 && hasStars) {
                  shareText = 'I found the Oddest1Out in Stand Out mode with no strikes! ⭐ Can you beat that?';
                } else if (strikes === 0) {
                  shareText = 'I found the Oddest1Out with no strikes! Can you beat that?';
                } else if (hasStars) {
                  shareText = `I found the Oddest1Out in Stand Out mode! ⭐ Can you do better?`;
                } else {
                  shareText = `I found the Oddest1Out! Can you do better?`;
                }
              } else if (gameResult === 'lost') {
                shareText = `I couldn't find the Oddest1Out today. Can you?`;
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

              // Determine colors - using explicit class names to avoid Tailwind purging
              let starColorClass = "text-stone-300 dark:text-stone-700";
              let circleColorClass = "bg-stone-300 dark:bg-stone-700";

              if (item?.color === "RED") {
                starColorClass = "text-rose-500";
                circleColorClass = "bg-rose-500";
              } else if (item?.color === "YELLOW") {
                starColorClass = "text-amber-400";
                circleColorClass = "bg-amber-400";
              } else if (item?.color === "PURPLE") {
                starColorClass = "text-violet-500";
                circleColorClass = "bg-violet-500";
              }

              // Show star for Stand Out mode, circle otherwise
              if (item?.shape === "star") {
                return (
                  <svg
                    key={i}
                    className={`h-3.5 w-3.5 transition-colors duration-300 ${starColorClass}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                );
              }
              return (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full transition-colors duration-300 ${circleColorClass}`}
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
            {gameResult === "won" && score.some(s => s.shape === "star" && s.color === "PURPLE") && (
              <p className="text-violet-500 font-bold text-sm sm:text-base mb-2 flex items-center justify-center gap-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Stand Out Mode
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </p>
            )}
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
          (() => {
            // Freeze tip during checking phase to avoid rapid changes
            const tip = gamePhase === "checking"
              ? lastTipRef.current
              : getTip(
                  feedbackMessage,
                  selectionsInUnrevealedRows,
                  unrevealedRowCount,
                  allRowsSelected,
                  hasAnyReveals
                );

            // Update ref when not checking
            if (gamePhase !== "checking") {
              lastTipRef.current = tip;
            }

            // Determine which text area is "active" (newest instruction = purple)
            // Priority: bottom "tap again" > check area text > top text
            const isBottomActive = oddestPuzzleSelection !== null;
            const isCheckAreaActive = allPuzzleSlotsFilled && !isBottomActive;
            const isTopActive = !isCheckAreaActive && !isBottomActive;

            // Special rendering for wrong tip - split into red and purple parts
            if (tip.splitText) {
              return (
                <p
                  key={tip.id}
                  className="font-medium text-sm sm:text-base animate-text-pop"
                >
                  <span className="text-rose-500">{tip.splitText.redPart} </span>
                  <span className="text-violet-600 dark:text-violet-400">{tip.splitText.purplePart}</span>
                </p>
              );
            }

            // Special rendering for allRevealed tip - split into grey and purple parts
            if (tip === TIPS.allRevealed) {
              return (
                <p
                  key="allRevealed"
                  className="font-medium text-sm sm:text-base animate-text-pop"
                >
                  <span className="text-stone-500 dark:text-stone-400">These are the Odd words for each row. </span>
                  <span className={isTopActive ? "text-violet-600 dark:text-violet-400" : "text-stone-500 dark:text-stone-400"}>Now tap the Oddest of the Odds to win.</span>
                </p>
              );
            }

            // Dynamic color: purple when this area is active, grey otherwise
            const colorClass = isTopActive
              ? "text-violet-600 dark:text-violet-400"
              : "text-stone-500 dark:text-stone-400";

            return (
              <p
                key={tip.id}
                className={`font-medium text-sm sm:text-base animate-text-pop ${colorClass}`}
              >
                {tip.text}
              </p>
            );
          })()
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
                  slideDuration={SLIDE_DURATION}
                  onCardClick={handleCardClick}
                  rowCheckStatus={rowCheckStatuses[rIdx]}
                  needsAttention={
                    rowCheckStatuses[rIdx] === "pending" &&
                    selections[rIdx] === undefined &&
                    (failedGuesses[rIdx]?.size ?? 0) > 0
                  }
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
                {metaWordsWithStatus.map((item) => (
                  <span
                    key={item.text}
                    className={
                      item.isPartial
                        ? "text-amber-500 font-bold uppercase text-[10px] sm:text-xs"
                        : "text-stone-600 dark:text-stone-400 uppercase text-[10px] sm:text-xs font-medium"
                    }
                  >
                    {item.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Check button and instruction text - always visible */}
      {!gameResult && (
        <div className="max-w-2xl w-full mt-4 sm:mt-6">
          <div className="flex justify-between items-center">
            {/* Instruction text - left side */}
            {(() => {
              // Check area is active when all slots filled AND bottom "tap again" is not showing
              const isCheckAreaActive = allPuzzleSlotsFilled && oddestPuzzleSelection === null;
              const textColorClass = isCheckAreaActive
                ? "text-violet-600 dark:text-violet-400"
                : "text-stone-500 dark:text-stone-400";
              return (
                <div
                  className={`transition-opacity duration-500 ${allPuzzleSlotsFilled ? 'opacity-100' : 'opacity-0'}`}
                >
                  <p className={`text-base leading-tight ${textColorClass}`}>
                    Now pick the Oddest<br />of the Odds below
                  </p>
                </div>
              );
            })()}
            {/* "Or" separator */}
            <span
              className={`text-sm text-stone-400 dark:text-stone-500 transition-opacity duration-500 ${allPuzzleSlotsFilled ? 'opacity-100' : 'opacity-0'}`}
            >
              Or
            </span>
            {/* Check button - right side */}
            <button
              onClick={allRowsSelected ? runCheckSequence : undefined}
              disabled={!allRowsSelected || gamePhase !== "playing"}
              className={`px-8 py-3 font-bold rounded-lg uppercase tracking-wider ${
                allRowsSelected && gamePhase === "playing"
                  ? 'check-button-active'
                  : 'check-button-inactive'
              }`}
            >
              Check
            </button>
          </div>
        </div>
      )}

      {/* Oddest Puzzle Row - always visible during gameplay */}
      {!gameResult && (
        <div className="max-w-2xl w-full mt-6 sm:mt-8">
          <OddestPuzzleRow
            selectedWords={selectionOrder
              .filter((rowIdx) => {
                // Include pending rows with selections
                if (rowCheckStatuses[rowIdx] === "pending" && selections[rowIdx] !== undefined) {
                  return true;
                }
                // Include revealed rows (they show the correct outlier)
                if (rowCheckStatuses[rowIdx] === "revealed") {
                  return true;
                }
                // Include rows needing reselection (show placeholder)
                if (rowsNeedingReselection.has(rowIdx)) {
                  return true;
                }
                return false;
              })
              .map((rowIdx) => {
                // Check if this row needs reselection
                if (rowsNeedingReselection.has(rowIdx)) {
                  return {
                    rowIndex: rowIdx,
                    word: null, // null indicates needs reselection
                  };
                }
                const row = gameData.rows[rowIdx];
                // For revealed rows, show the correct outlier; for pending rows, show user's selection
                const wordIndex = rowCheckStatuses[rowIdx] === "revealed"
                  ? row.outlierIndex
                  : selections[rowIdx];
                return {
                  rowIndex: rowIdx,
                  word: row.words[wordIndex],
                };
              })}
            allSelected={allPuzzleSlotsFilled}
            puzzleSelection={oddestPuzzleSelection}
            onCardClick={(rowIdx) => setOddestPuzzleSelection(rowIdx)}
            onCardSubmit={(rowIdx) => handleStandoutGuess(rowIdx)}
            disabled={gamePhase !== "playing"}
          />
          {/* Tap again to submit text cue */}
          {oddestPuzzleSelection !== null && (
            <p className="text-center mt-3 text-sm text-violet-600 dark:text-violet-400 font-medium animate-text-pop">
              Tap again to submit
            </p>
          )}
        </div>
      )}

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

      {/* Standout Mode Info Modal */}
      {showStandoutInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowStandoutInfo(false)}>
          <div
            className="bg-white dark:bg-stone-800 rounded-xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                Stand Out Mode
              </h2>
              <button
                onClick={() => setShowStandoutInfo(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-stone-700 dark:text-stone-300 text-sm">
              <p>
                Skip the Check button and directly guess the Oddest of the Odd words without the help and penalty of a check. Earn a score in Stars to stand out to your friends.
              </p>
            </div>
            <button
              onClick={() => setShowStandoutInfo(false)}
              className="mt-6 w-full py-2 bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-lg transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
