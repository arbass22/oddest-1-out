import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getRandomPuzzle } from './data/puzzles';
import { GameData, CardState, GameStatus, GameRow as GameRowType } from './types';
import Card from './components/Card';

const STRIKE_LIMIT = 3;
type StrikeType = 'RED' | 'BLUE';

// Animation phases for a row
type RowAnimationPhase = 'idle' | 'sliding' | 'category-reveal' | 'complete';

// --- Helper Component for Individual Rows to Handle Animation ---
interface GameRowProps {
  row: GameRowType;
  rowIndex: number;
  animationPhase: RowAnimationPhase;
  selection: number | undefined;
  failedIndices: Set<number>;
  gameStatus: GameStatus;
  isUltimateWinner: boolean;
  onCardClick: (rIdx: number, wIdx: number) => void;
  onAnimationComplete?: () => void;
}

const GameRow: React.FC<GameRowProps> = ({
  row,
  rowIndex,
  animationPhase,
  selection,
  failedIndices,
  gameStatus,
  isUltimateWinner,
  onCardClick,
  onAnimationComplete
}) => {
  const [gapSize, setGapSize] = useState('0.5rem');
  const [showCategory, setShowCategory] = useState(false);
  const animationCompleteRef = useRef(false);

  // Store callback in ref to avoid effect re-runs canceling the timeout
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    const updateGap = () => {
      setGapSize(window.innerWidth >= 640 ? '1rem' : '0.5rem');
    };
    updateGap();
    window.addEventListener('resize', updateGap);
    return () => window.removeEventListener('resize', updateGap);
  }, []);

  // Handle animation phase transitions
  useEffect(() => {
    if (animationPhase === 'sliding') {
      // After slide completes, trigger category reveal
      const timer = setTimeout(() => {
        setShowCategory(true);
      }, 800); // Wait for slide animation
      return () => clearTimeout(timer);
    }
    if (animationPhase === 'complete') {
      setShowCategory(true);
    }
  }, [animationPhase]);

  // Notify parent when animation is complete
  useEffect(() => {
    if (showCategory && animationPhase === 'sliding' && !animationCompleteRef.current) {
      animationCompleteRef.current = true;
      const timer = setTimeout(() => {
        onAnimationCompleteRef.current?.();
      }, 600); // Wait for category fade-in
      return () => clearTimeout(timer);
    }
  }, [showCategory, animationPhase]); // Removed onAnimationComplete - using ref instead

  // Reset ref when phase changes
  useEffect(() => {
    if (animationPhase === 'idle') {
      animationCompleteRef.current = false;
      setShowCategory(false);
    }
  }, [animationPhase]);

  const getCardState = (wIdx: number): CardState => {
    const isOutlier = wIdx === row.outlierIndex;

    // Ultimate winner card is always green when solved
    if (isUltimateWinner && isOutlier && (animationPhase === 'sliding' || animationPhase === 'category-reveal' || animationPhase === 'complete')) {
      return CardState.WIN;
    }

    // Non-ultimate solved rows show blue outlier
    if (!isUltimateWinner && isOutlier && (animationPhase === 'sliding' || animationPhase === 'category-reveal' || animationPhase === 'complete')) {
      return CardState.CORRECT_ROW_WRONG_GAME;
    }

    if (failedIndices.has(wIdx)) return CardState.WRONG;
    if (selection === wIdx) return CardState.SELECTED;
    return CardState.IDLE;
  };

  // Calculate card positions for the unshuffle animation
  const getCardStyle = (wIdx: number): React.CSSProperties => {
    const isOutlier = wIdx === row.outlierIndex;
    const isSliding = animationPhase === 'sliding' || animationPhase === 'category-reveal' || animationPhase === 'complete';

    if (!isSliding) {
      return {};
    }

    // Calculate where this card needs to move
    // Outlier goes to position 3 (far right)
    // Other cards fill positions 0, 1, 2 in their original relative order

    if (isOutlier) {
      const slotsToMove = 3 - wIdx;
      if (slotsToMove !== 0) {
        return {
          transform: `translateX(calc(${slotsToMove} * (100% + ${gapSize})))`,
          transition: 'transform 800ms cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 20
        };
      }
    } else {
      // Non-outlier cards: calculate how many positions to shift left
      // to fill the gap left by the outlier moving right
      const outlierIdx = row.outlierIndex;
      if (wIdx > outlierIdx) {
        // This card is to the right of the outlier, needs to shift left by 1
        // But only if the outlier is moving (i.e., outlier is not already at position 3)
        if (outlierIdx < 3) {
          // Card at position wIdx needs to move to position wIdx - 1 if wIdx > outlierIdx
          // Actually, we need to think about this differently:
          // After animation: positions 0,1,2 = non-outliers in order, position 3 = outlier
          // Find the target position for this non-outlier
          let nonOutlierOrder = 0;
          for (let i = 0; i < 4; i++) {
            if (i === row.outlierIndex) continue;
            if (i === wIdx) break;
            nonOutlierOrder++;
          }
          const targetPosition = nonOutlierOrder;
          const slotsToMove = targetPosition - wIdx;
          if (slotsToMove !== 0) {
            return {
              transform: `translateX(calc(${slotsToMove} * (100% + ${gapSize})))`,
              transition: 'transform 800ms cubic-bezier(0.4, 0, 0.2, 1)'
            };
          }
        }
      }
    }

    return {
      transition: 'transform 800ms cubic-bezier(0.4, 0, 0.2, 1)'
    };
  };

  const outlierWord = row.words[row.outlierIndex];
  const categoryWords = row.words
    .filter((_, idx) => idx !== row.outlierIndex)
    .map(w => w.text)
    .join(', ');

  const categoryBgClass = isUltimateWinner
    ? "bg-green-100 border-green-200"
    : "bg-blue-100 border-blue-200";

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4 relative h-16">
      {/* Category overlay - appears on top of the first 3 cards */}
      {showCategory && (
        <div
          className={`absolute left-0 top-0 h-16 ${categoryBgClass} border-2 rounded-md flex flex-col items-center justify-center shadow-sm px-2 text-center select-none z-10`}
          style={{
            width: `calc(75% - ${gapSize} * 0.25)`,
            animation: 'fadeIn 600ms ease-out'
          }}
        >
          <span className="font-bold text-gray-900 uppercase text-xs sm:text-sm tracking-widest leading-tight mb-0.5">{row.category}</span>
          <span className="text-gray-600 uppercase text-[10px] sm:text-xs font-medium truncate w-full px-2">{categoryWords}</span>
        </div>
      )}

      {/* Cards */}
      {row.words.map((word, wIdx) => (
        <Card
          key={word.id}
          text={word.text}
          state={getCardState(wIdx)}
          onClick={() => onCardClick(rowIndex, wIdx)}
          disabled={gameStatus === 'won' || gameStatus === 'lost' || failedIndices.has(wIdx) || animationPhase !== 'idle'}
          style={getCardStyle(wIdx)}
        />
      ))}
    </div>
  );
};


export default function App() {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [status, setStatus] = useState<GameStatus>('playing');

  const [selections, setSelections] = useState<Record<number, number>>({});

  // Animation state per row
  const [rowAnimationPhases, setRowAnimationPhases] = useState<Record<number, RowAnimationPhase>>({
    0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle'
  });

  // Visual row positions for reordering
  const [visualRowOrder, setVisualRowOrder] = useState<number[]>([0, 1, 2, 3]);
  const [showMetaOverlay, setShowMetaOverlay] = useState(false);

  const [strikes, setStrikes] = useState<StrikeType[]>([]);
  const [failedGuesses, setFailedGuesses] = useState<Record<number, Set<number>>>({});

  // Queue for sequential row reveals during win sequence
  const [revealQueue, setRevealQueue] = useState<number[]>([]);
  const [isWinSequenceActive, setIsWinSequenceActive] = useState(false);
  const winnerRowRef = useRef<number | null>(null);

  const initGame = useCallback(() => {
    setSelections({});
    setRowAnimationPhases({ 0: 'idle', 1: 'idle', 2: 'idle', 3: 'idle' });
    setStrikes([]);
    setFailedGuesses({});
    setVisualRowOrder([0, 1, 2, 3]);
    setShowMetaOverlay(false);
    setRevealQueue([]);
    setIsWinSequenceActive(false);
    winnerRowRef.current = null;
    const data = getRandomPuzzle();
    setGameData(data);
    setStatus('playing');
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Process reveal queue sequentially
  useEffect(() => {
    if (revealQueue.length > 0 && !isWinSequenceActive) {
      const nextRow = revealQueue[0];
      setIsWinSequenceActive(true);

      // Start sliding animation for this row
      setRowAnimationPhases(prev => ({ ...prev, [nextRow]: 'sliding' }));
    }
  }, [revealQueue, isWinSequenceActive]);

  // Handle row animation completion
  const handleRowAnimationComplete = useCallback((rowIndex: number) => {
    setRowAnimationPhases(prev => ({ ...prev, [rowIndex]: 'complete' }));

    // Remove from queue and allow next
    setRevealQueue(prev => prev.slice(1));
    setIsWinSequenceActive(false);
  }, []);

  // After all rows revealed, do row reordering then meta overlay
  useEffect(() => {
    if (!gameData) return;

    const allComplete = [0, 1, 2, 3].every(i =>
      rowAnimationPhases[i] === 'complete'
    );

    if (allComplete && (status === 'won' || status === 'lost') && winnerRowRef.current !== null) {
      const winnerIdx = winnerRowRef.current;

      // Delay before row reordering
      setTimeout(() => {
        // Reorder rows: winner goes to bottom
        const newOrder = new Array(4).fill(0);
        let pos = 0;
        for (let i = 0; i < 4; i++) {
          if (i !== winnerIdx) {
            newOrder[i] = pos;
            pos++;
          }
        }
        newOrder[winnerIdx] = 3;
        setVisualRowOrder(newOrder);

        // Show meta overlay after row animation
        setTimeout(() => {
          setShowMetaOverlay(true);
        }, 1200);
      }, 800);
    }
  }, [rowAnimationPhases, status, gameData]);

  const allRowsSelected = gameData ? Object.keys(selections).length === 4 : false;

  const handleCardClick = (rowIndex: number, wordIndex: number) => {
    if (status !== 'playing' || !gameData) return;
    if (rowAnimationPhases[rowIndex] !== 'idle') return;
    if (failedGuesses[rowIndex]?.has(wordIndex)) return;

    // --- PHASE 1: SELECTION ---
    if (!allRowsSelected) {
      setSelections(prev => ({ ...prev, [rowIndex]: wordIndex }));
      return;
    }

    // --- PHASE 2: VERDICT ---
    if (selections[rowIndex] !== wordIndex) {
      setSelections(prev => ({ ...prev, [rowIndex]: wordIndex }));
      return;
    }

    const targetRow = gameData.rows[rowIndex];
    const isRowOutlier = wordIndex === targetRow.outlierIndex;

    if (isRowOutlier) {
      const isUltimate = rowIndex === gameData.ultimateOutlierRowIndex;

      if (isUltimate) {
        // --- WIN SEQUENCE ---
        setStatus('won');
        winnerRowRef.current = rowIndex;

        // 1. Only the green card changes immediately (just mark the phase)
        setRowAnimationPhases(prev => ({ ...prev, [rowIndex]: 'sliding' }));

        // 2. After a delay, queue remaining rows to reveal one by one
        setTimeout(() => {
          // Mark winner as complete first
          setRowAnimationPhases(prev => ({ ...prev, [rowIndex]: 'complete' }));

          // Queue other rows for sequential reveal
          const otherRows = [0, 1, 2, 3].filter(i => i !== rowIndex);
          setRevealQueue(otherRows);
        }, 1500);

      } else {
        // Partial Correct (Blue) - single row animation
        addStrike('BLUE');
        setRowAnimationPhases(prev => ({ ...prev, [rowIndex]: 'sliding' }));
      }
    } else {
      // WRONG (Red Strike)
      handleRedStrike(rowIndex, wordIndex);
    }
  };

  const addStrike = (type: StrikeType) => {
    const newStrikes = [...strikes, type];
    setStrikes(newStrikes);

    if (newStrikes.length >= STRIKE_LIMIT && gameData) {
      // --- LOSS SEQUENCE ---
      setStatus('lost');
      winnerRowRef.current = gameData.ultimateOutlierRowIndex;

      // Queue all rows for sequential reveal
      setTimeout(() => {
        const rowOrder = [0, 1, 2, 3];
        // Put the ultimate winner row last
        const reordered = rowOrder.filter(i => i !== gameData.ultimateOutlierRowIndex);
        reordered.push(gameData.ultimateOutlierRowIndex);
        setRevealQueue(reordered);
      }, 500);
    }
  };

  const handleRedStrike = (rowIndex: number, wordIndex: number) => {
    addStrike('RED');
    setFailedGuesses(prev => {
      const rowSet = new Set(prev[rowIndex] || []);
      rowSet.add(wordIndex);
      return { ...prev, [rowIndex]: rowSet };
    });
    setSelections(prev => {
      const next = { ...prev };
      delete next[rowIndex];
      return next;
    });
  };

  // Handle individual blue row completion (during normal play)
  const handleBlueRowComplete = useCallback((rowIndex: number) => {
    setRowAnimationPhases(prev => ({ ...prev, [rowIndex]: 'complete' }));
  }, []);

  if (!gameData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <h2 className="text-xl font-bold mb-4">Something went wrong.</h2>
        <button onClick={initGame} className="bg-black text-white px-6 py-2 rounded-full">Retry</button>
      </div>
    );
  }

  let endTitle = "";
  let endTitleClass = "";
  if (status === 'won') {
    endTitle = "Victory!";
    endTitleClass = "text-green-600";
  } else if (status === 'lost') {
    endTitle = "Game Over";
    endTitleClass = "text-red-600";
  }

  // Get words for the Meta Category (outliers from non-winning rows)
  const metaWords = gameData.rows
    .filter((_, idx) => idx !== gameData.ultimateOutlierRowIndex)
    .map(r => r.words[r.outlierIndex].text);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4 sm:px-6">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <header className="max-w-2xl w-full flex flex-col items-center mb-8">
        <h1 className="font-serif text-4xl font-bold text-gray-900 tracking-tight mb-2">Odd<span className="text-yellow-500">1</span>Out</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500 uppercase tracking-widest font-semibold">
          <span>Strikes:</span>
          <div className="flex space-x-1">
            {[...Array(STRIKE_LIMIT)].map((_, i) => {
              const strike = strikes[i];
              let colorClass = 'bg-gray-300';
              if (strike === 'RED') colorClass = 'bg-red-500';
              if (strike === 'BLUE') colorClass = 'bg-blue-500';
              return (
                <div key={i} className={`h-3 w-3 rounded-full transition-colors duration-300 ${colorClass}`} />
              );
            })}
          </div>
        </div>
      </header>

      <div className="max-w-2xl w-full mb-6 text-center">
        {(status === 'won' || status === 'lost') ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className={`text-2xl font-serif font-bold mb-2 ${endTitleClass}`}>{endTitle}</h2>
            <p className="text-gray-700 font-medium max-w-lg mx-auto">
              {gameData.ultimateExplanation}
            </p>
            <button onClick={initGame} className="mt-4 text-sm font-bold uppercase tracking-wider text-black border-b-2 border-black hover:text-gray-600 hover:border-gray-600 transition-colors">
              Play Again
            </button>
          </div>
        ) : (
          <p className={`font-medium transition-colors duration-300 ${allRowsSelected ? 'text-black scale-105' : 'text-gray-600'}`}>
            {!allRowsSelected
              ? "Phase 1: Select the outlier in each row."
              : "Phase 2: Identify the Ultimate Odd1Out among the yellow cards."}
          </p>
        )}
      </div>

      <div className="max-w-2xl w-full relative" style={{ height: 'calc(4 * (4rem + 1rem))' }}>
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
                transform: `translateY(calc(${visualIndex} * (4rem + 1rem)))`,
                transition: 'transform 1000ms cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: isWinner && showMetaOverlay ? 5 : 10
              }}
            >
              <div className="pb-4 h-20">
                <GameRow
                  row={row}
                  rowIndex={rIdx}
                  animationPhase={rowAnimationPhases[rIdx]}
                  selection={selections[rIdx]}
                  failedIndices={failedGuesses[rIdx] || new Set()}
                  gameStatus={status}
                  isUltimateWinner={isWinner}
                  onCardClick={handleCardClick}
                  onAnimationComplete={
                    status === 'won' || status === 'lost'
                      ? () => handleRowAnimationComplete(rIdx)
                      : () => handleBlueRowComplete(rIdx)
                  }
                />
              </div>
            </div>
          );
        })}

        {/* Meta Category Overlay - vertical card over top 3 right-column cards */}
        {showMetaOverlay && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              top: 0,
              right: 0,
              width: 'calc(25% - 0.375rem)',
              height: 'calc(3 * (4rem + 1rem) - 1rem)',
              animation: 'fadeIn 800ms ease-out'
            }}
          >
            <div className="w-full h-full bg-blue-100 border-2 border-blue-200 rounded-md shadow-lg flex flex-col items-center justify-center text-center p-3 select-none">
              <span className="font-bold text-gray-900 uppercase text-xs sm:text-sm tracking-widest leading-tight mb-3">{gameData.metaCategory}</span>
              <div className="flex flex-col space-y-2">
                {metaWords.map(word => (
                  <span key={word} className="text-gray-600 uppercase text-[10px] sm:text-xs font-medium">
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
