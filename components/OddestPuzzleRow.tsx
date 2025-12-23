import React from 'react';
import Card from '@/components/Card';
import { CardState, WordItem } from '@/types';

interface SelectedWord {
  rowIndex: number;
  word: WordItem | null; // null means needs reselection
}

interface OddestPuzzleRowProps {
  selectedWords: SelectedWord[];
  allSelected: boolean;
  puzzleSelection: number | null; // rowIndex of card selected for final guess
  onCardClick: (rowIndex: number) => void;
  onCardSubmit: (rowIndex: number) => void;
  disabled: boolean;
}

const OddestPuzzleRow: React.FC<OddestPuzzleRowProps> = ({
  selectedWords,
  allSelected,
  puzzleSelection,
  onCardClick,
  onCardSubmit,
  disabled,
}) => {
  // Only show container glow when all selected AND no specific card is selected for submission
  const containerClasses = allSelected && puzzleSelection === null
    ? "animate-pulse-glow rounded-lg"
    : "";

  const handleClick = (rowIndex: number) => {
    if (disabled) return;

    if (puzzleSelection === rowIndex) {
      // Second tap on same card - submit
      onCardSubmit(rowIndex);
    } else {
      // First tap or different card - select
      onCardClick(rowIndex);
    }
  };

  const getCardState = (rowIndex: number): CardState => {
    if (puzzleSelection !== null) {
      // A card is selected for final guess
      if (puzzleSelection === rowIndex) {
        return CardState.SELECTED_PHASE2; // This card glows
      } else {
        return CardState.DIMMED; // Other cards are dimmed
      }
    }
    // No card selected yet - show normal state based on allSelected
    return allSelected ? CardState.SELECTED_PHASE2 : CardState.SELECTED;
  };

  return (
    <div className={`grid grid-cols-4 gap-2 sm:gap-4 h-14 sm:h-16 ${containerClasses}`}>
      {[0, 1, 2, 3].map((slotIndex) => {
        const selectedWord = selectedWords[slotIndex];

        if (selectedWord) {
          // Check if this slot needs reselection (word is null)
          if (selectedWord.word === null) {
            return (
              <div
                key={`reselect-${slotIndex}`}
                className="h-14 sm:h-16 w-full flex items-center justify-center rounded-md border-2 border-stone-300 dark:border-stone-600 bg-stone-200 dark:bg-stone-700 px-2"
              >
                <span className="text-stone-500 dark:text-stone-400 text-[10px] sm:text-xs text-center leading-tight">
                  Pick another word
                </span>
              </div>
            );
          }

          return (
            <Card
              key={`slot-${slotIndex}-${selectedWord.word.id}`}
              text={selectedWord.word.text}
              state={getCardState(selectedWord.rowIndex)}
              onClick={() => handleClick(selectedWord.rowIndex)}
              disabled={disabled}
            />
          );
        }

        // Empty slot
        return (
          <div
            key={`empty-${slotIndex}`}
            className="h-14 sm:h-16 w-full flex items-center justify-center rounded-md border-2 border-dashed border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800/50"
          >
            <span className="text-stone-400 dark:text-stone-500 text-xs">?</span>
          </div>
        );
      })}
    </div>
  );
};

export default OddestPuzzleRow;
