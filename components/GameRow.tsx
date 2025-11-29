import React, { useState, useEffect } from 'react';
import { GameRow as GameRowType, RowDisplayState, GamePhase, CardState } from '../types';
import CategoryCard from './CategoryCard';
import Card from './Card';

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

export default GameRow;
