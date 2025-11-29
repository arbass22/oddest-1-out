import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getRandomPuzzle } from './data/puzzles';
import { GameData, CardState, GameStatus, GameRow as GameRowType, RowDisplayState, GamePhase } from './types';
import Card from './components/Card';

const STRIKE_LIMIT = 3;
type StrikeType = 'RED' | 'BLUE';

// Animation timing constants
const SLIDE_DURATION = 800;
const CATEGORY_FADE_DURATION = 600;
const ROW_REORDER_DURATION = 1000;
const WIN_PAUSE = 1000;

// Helper for async delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Category Card Component ---
interface CategoryCardProps {
  category: string;
  words: string[];
  isWinner: boolean;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, words, isWinner }) => {
  const bgClass = isWinner ? "bg-green-100 border-green-200" : "bg-blue-100 border-blue-200";

  return (
    <div
      className={`col-span-3 h-16 ${bgClass} border-2 rounded-md flex flex-col items-center justify-center shadow-sm px-2 text-center select-none`}
      style={{ animation: 'fadeIn 600ms ease-out' }}
    >
      <span className="font-bold text-gray-900 uppercase text-xs sm:text-sm tracking-widest leading-tight mb-0.5">
        {category}
      </span>
      <span className="text-gray-600 uppercase text-[10px] sm:text-xs font-medium truncate w-full px-2">
        {words.join(', ')}
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
  onCardClick
}) => {
  const [gapSize, setGapSize] = useState('0.5rem');

  useEffect(() => {
    const updateGap = () => {
      setGapSize(window.innerWidth >= 640 ? '1rem' : '0.5rem');
    };
    updateGap();
    window.addEventListener('resize', updateGap);
    return () => window.removeEventListener('resize', updateGap);
  }, []);

  const outlierWord = row.words[row.outlierIndex];
  const nonOutlierWords = row.words
    .filter((_, idx) => idx !== row.outlierIndex)
    .map(w => w.text);

  // REVEALED STATE: Only show category card + outlier
  if (displayState === 'revealed') {
    const outlierState = isUltimateWinner ? CardState.WIN : CardState.CORRECT_ROW_WRONG_GAME;

    return (
      <div className="grid grid-cols-4 gap-2 sm:gap-4 h-16">
        <CategoryCard
          category={row.category}
          words={nonOutlierWords}
          isWinner={isUltimateWinner}
        />
        <Card
          text={outlierWord.text}
          state={outlierState}
          onClick={() => {}}
          disabled={true}
        />
      </div>
    );
  }

  // Get card state for interactive/sliding modes
  const getCardState = (wIdx: number): CardState => {
    const isOutlier = wIdx === row.outlierIndex;

    // During sliding, show the correct color for outlier
    if (displayState === 'sliding' && isOutlier) {
      return isUltimateWinner ? CardState.WIN : CardState.CORRECT_ROW_WRONG_GAME;
    }

    if (failedIndices.has(wIdx)) return CardState.WRONG;
    if (selection === wIdx) return CardState.SELECTED;
    return CardState.IDLE;
  };

  // Calculate slide positions
  const getCardStyle = (wIdx: number): React.CSSProperties => {
    if (displayState !== 'sliding') {
      return {};
    }

    const isOutlier = wIdx === row.outlierIndex;
    const outlierIdx = row.outlierIndex;

    if (isOutlier) {
      // Outlier moves to position 3 (far right)
      const slotsToMove = 3 - wIdx;
      return {
        transform: slotsToMove !== 0 ? `translateX(calc(${slotsToMove} * (100% + ${gapSize})))` : undefined,
        transition: `transform ${SLIDE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        zIndex: 20
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
        transform: slotsToMove !== 0 ? `translateX(calc(${slotsToMove} * (100% + ${gapSize})))` : undefined,
        transition: `transform ${SLIDE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`
      };
    }
  };

  // INTERACTIVE or SLIDING: Show all 4 cards
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4 h-16">
      {row.words.map((word, wIdx) => (
        <Card
          key={word.id}
          text={word.text}
          state={getCardState(wIdx)}
          onClick={() => onCardClick(rowIndex, wIdx)}
          disabled={gamePhase !== 'playing' || failedIndices.has(wIdx) || displayState !== 'interactive'}
          style={getCardStyle(wIdx)}
        />
      ))}
    </div>
  );
};


// --- Main App Component ---
export default function App() {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>('playing');
  const [gameResult, setGameResult] = useState<'won' | 'lost' | null>(null);

  const [selections, setSelections] = useState<Record<number, number>>({});
  const [rowStates, setRowStates] = useState<Record<number, RowDisplayState>>({
    0: 'interactive', 1: 'interactive', 2: 'interactive', 3: 'interactive'
  });

  const [visualRowOrder, setVisualRowOrder] = useState<number[]>([0, 1, 2, 3]);
  const [showMetaOverlay, setShowMetaOverlay] = useState(false);

  const [strikes, setStrikes] = useState<StrikeType[]>([]);
  const [failedGuesses, setFailedGuesses] = useState<Record<number, Set<number>>>({});

  // Track if animation is running to prevent double triggers
  const isAnimatingRef = useRef(false);

  const initGame = useCallback(() => {
    setSelections({});
    setRowStates({ 0: 'interactive', 1: 'interactive', 2: 'interactive', 3: 'interactive' });
    setStrikes([]);
    setFailedGuesses({});
    setVisualRowOrder([0, 1, 2, 3]);
    setShowMetaOverlay(false);
    setGamePhase('playing');
    setGameResult(null);
    isAnimatingRef.current = false;
    const data = getRandomPuzzle();
    setGameData(data);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // --- Animation Sequences ---

  const runWinSequence = useCallback(async (winnerRowIndex: number) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setGamePhase('animating');
    setGameResult('won');

    // 1. Winner row: slide cards
    setRowStates(prev => ({ ...prev, [winnerRowIndex]: 'sliding' }));
    await delay(SLIDE_DURATION);

    // 2. Winner row: reveal category
    setRowStates(prev => ({ ...prev, [winnerRowIndex]: 'revealed' }));
    await delay(WIN_PAUSE);

    // 3. Reveal other rows sequentially (skip already revealed ones)
    const otherRows = [0, 1, 2, 3].filter(i => i !== winnerRowIndex);
    for (const rowIdx of otherRows) {
      // Check current state - skip if already revealed
      const currentState = rowStates[rowIdx];
      if (currentState === 'revealed') continue;

      setRowStates(prev => ({ ...prev, [rowIdx]: 'sliding' }));
      await delay(SLIDE_DURATION);
      setRowStates(prev => ({ ...prev, [rowIdx]: 'revealed' }));
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
    setGamePhase('ended');
  }, [rowStates]);

  const runLossSequence = useCallback(async (ultimateRowIndex: number) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setGamePhase('animating');
    setGameResult('lost');

    await delay(500);

    // Reveal all rows sequentially, ultimate winner last
    const rowOrder = [0, 1, 2, 3].filter(i => i !== ultimateRowIndex);
    rowOrder.push(ultimateRowIndex);

    for (const rowIdx of rowOrder) {
      // Skip already revealed rows
      if (rowStates[rowIdx] === 'revealed') continue;

      setRowStates(prev => ({ ...prev, [rowIdx]: 'sliding' }));
      await delay(SLIDE_DURATION);
      setRowStates(prev => ({ ...prev, [rowIdx]: 'revealed' }));
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
    setGamePhase('ended');
  }, [rowStates]);

  const runBlueRowSequence = useCallback(async (rowIndex: number) => {
    // Single row reveal for partial correct
    setRowStates(prev => ({ ...prev, [rowIndex]: 'sliding' }));
    await delay(SLIDE_DURATION);
    setRowStates(prev => ({ ...prev, [rowIndex]: 'revealed' }));
  }, []);

  // --- Game Logic ---

  const allRowsSelected = gameData ? Object.keys(selections).length === 4 : false;

  const handleCardClick = async (rowIndex: number, wordIndex: number) => {
    if (gamePhase !== 'playing' || !gameData) return;
    if (rowStates[rowIndex] !== 'interactive') return;
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
        // WIN!
        await runWinSequence(rowIndex);
      } else {
        // Partial correct (Blue strike)
        const newStrikes = [...strikes, 'BLUE' as StrikeType];
        setStrikes(newStrikes);

        if (newStrikes.length >= STRIKE_LIMIT) {
          await runLossSequence(gameData.ultimateOutlierRowIndex);
        } else {
          await runBlueRowSequence(rowIndex);
        }
      }
    } else {
      // WRONG (Red strike)
      const newStrikes = [...strikes, 'RED' as StrikeType];
      setStrikes(newStrikes);

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

      if (newStrikes.length >= STRIKE_LIMIT) {
        await runLossSequence(gameData.ultimateOutlierRowIndex);
      }
    }
  };

  // --- Render ---

  if (!gameData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <h2 className="text-xl font-bold mb-4">Something went wrong.</h2>
        <button onClick={initGame} className="bg-black text-white px-6 py-2 rounded-full">Retry</button>
      </div>
    );
  }

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
        <h1 className="font-serif text-4xl font-bold text-gray-900 tracking-tight mb-2">
          Oddest<span className="text-yellow-500">1</span>Out
        </h1>
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
        {gameResult ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className={`text-2xl font-serif font-bold mb-2 ${gameResult === 'won' ? 'text-green-600' : 'text-red-600'}`}>
              {gameResult === 'won' ? 'Victory!' : 'Game Over'}
            </h2>
            <p className="text-gray-700 font-medium max-w-lg mx-auto">
              {gameData.ultimateExplanation}
            </p>
            <button
              onClick={initGame}
              className="mt-4 text-sm font-bold uppercase tracking-wider text-black border-b-2 border-black hover:text-gray-600 hover:border-gray-600 transition-colors"
            >
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
                transition: `transform ${ROW_REORDER_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                zIndex: isWinner && showMetaOverlay ? 5 : 10
              }}
            >
              <div className="pb-4 h-20">
                <GameRow
                  row={row}
                  rowIndex={rIdx}
                  displayState={rowStates[rIdx]}
                  selection={selections[rIdx]}
                  failedIndices={failedGuesses[rIdx] || new Set()}
                  gamePhase={gamePhase}
                  isUltimateWinner={isWinner}
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
              width: 'calc(25% - 0.375rem)',
              height: 'calc(3 * (4rem + 1rem) - 1rem)',
              animation: 'fadeIn 800ms ease-out'
            }}
          >
            <div className="w-full h-full bg-blue-100 border-2 border-blue-200 rounded-md shadow-lg flex flex-col items-center justify-center text-center p-3 select-none">
              <span className="font-bold text-gray-900 uppercase text-xs sm:text-sm tracking-widest leading-tight mb-3">
                {gameData.metaCategory}
              </span>
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
