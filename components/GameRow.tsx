import React, { useState, useEffect } from 'react';
import { GameRow as GameRowType, RowDisplayState, GamePhase, CardState, RowCheckStatus } from '@/types';
import CategoryCard, { WordWithStatus } from '@/components/CategoryCard';
import Card from '@/components/Card';

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
  slideDuration: number;
  onCardClick: (rIdx: number, wIdx: number) => void;
  rowCheckStatus: RowCheckStatus;
  needsAttention: boolean;
  allRowsRevealed: boolean;
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
  slideDuration,
  onCardClick,
  rowCheckStatus,
  needsAttention,
  allRowsRevealed,
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

  // Build non-outlier words with status for CategoryCard display
  const nonOutlierWords: WordWithStatus[] = row.words
    .map((w, idx) => ({
      text: w.text,
      index: idx,
      status: failedIndices.has(idx) ? 'wrong' as const : 'normal' as const
    }))
    .filter((w) => w.index !== row.outlierIndex)
    .map(({ text, status }) => ({ text, status }));

  // REVEALED STATE: Only show category card + outlier
  if (displayState === "revealed") {
    // Check-verified rows stay purple until tapped for standout
    // Only show ULTIMATE_WINNER (solid purple) after game is ended
    // Only show LOCKED_OUTLIER (amber) for standout partial (isSolved = true)
    // Glow (SELECTED_PHASE2) when all unrevealed rows have selections (isPhase2) OR all rows are revealed
    const shouldGlow = isPhase2 || allRowsRevealed;
    let outlierState = shouldGlow ? CardState.SELECTED_PHASE2 : CardState.SELECTED;
    let isClickable = gamePhase === "playing"; // Revealed outliers are clickable for standout guesses

    if (isUltimateWinner && gamePhase === "ended") {
      // Only show solid purple after game is won/ended
      outlierState = CardState.ULTIMATE_WINNER;
      isClickable = false;
    } else if (isSolved) {
      // Standout partial - amber (cost a strike)
      outlierState = CardState.LOCKED_OUTLIER;
      isClickable = false; // Already tried this one
    }

    return (
      <div className="grid grid-cols-4 gap-2 sm:gap-4 h-14 sm:h-16">
        <CategoryCard category={row.category} words={nonOutlierWords} />
        <Card
          text={outlierWord.text}
          state={outlierState}
          onClick={() => onCardClick(rowIndex, row.outlierIndex)}
          disabled={!isClickable}
        />
      </div>
    );
  }

  // Get card state for interactive/sliding/locked modes
  const getCardState = (wIdx: number): CardState => {
    const isOutlier = wIdx === row.outlierIndex;

    // During sliding for Check: keep purple (don't reveal ultimate or amber)
    // Only show ULTIMATE_WINNER when game is ended
    // Only show LOCKED_OUTLIER (amber) for Standout partial (isSolved)
    if (displayState === "sliding") {
      if (gamePhase === "ended" && isUltimateWinner) {
        // Win sequence sliding - show solid purple for ultimate
        return isOutlier ? CardState.ULTIMATE_WINNER : CardState.LOCKED_OTHER;
      }
      if (isSolved) {
        // Standout partial sliding - show amber
        return isOutlier ? CardState.LOCKED_OUTLIER : CardState.LOCKED_OTHER;
      }
      // Check sliding - stay light purple, don't reveal anything
      return isOutlier ? CardState.SELECTED_PHASE2 : CardState.LOCKED_OTHER;
    }

    // Locked state (Standout partial before reveal): amber for outlier
    if (displayState === "locked") {
      return isOutlier ? CardState.LOCKED_OUTLIER : CardState.LOCKED_OTHER;
    }

    // Interactive state
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
        transition: `transform ${slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
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
        transition: `transform ${slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      };
    }
  };

  // INTERACTIVE or SLIDING: Show all 4 cards
  const attentionClasses = needsAttention
    ? "p-0.5 sm:p-1 rounded-lg animate-pulse-glow-ring"
    : "";

  return (
    <div className={`grid grid-cols-4 gap-2 sm:gap-4 ${needsAttention ? '' : 'h-14 sm:h-16'} ${attentionClasses}`}>
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

export default GameRow;
