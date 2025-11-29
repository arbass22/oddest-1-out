import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getRandomPuzzle } from './data/puzzles';
import { GameData, CardState, GameStatus, GameRow as GameRowType } from './types';
import Card from './components/Card';

const STRIKE_LIMIT = 3;
type StrikeType = 'RED' | 'BLUE';

// --- Helper Component for Individual Rows to Handle Animation ---
interface GameRowProps {
  row: GameRowType;
  rowIndex: number;
  isSolved: boolean;
  selection: number | undefined; // Selected word index
  failedIndices: Set<number>;
  gameStatus: GameStatus;
  isUltimateWinner: boolean; // New prop to style the winning row green
  onCardClick: (rIdx: number, wIdx: number) => void;
}

const GameRow: React.FC<GameRowProps> = ({
  row,
  rowIndex,
  isSolved,
  selection,
  failedIndices,
  gameStatus,
  isUltimateWinner,
  onCardClick
}) => {
  const [showSolvedState, setShowSolvedState] = useState(isSolved);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gapSize, setGapSize] = useState('0.5rem'); // Default gap-2

  // Ref to track if we mounted already solved (no animation needed)
  const mountedSolved = useRef(isSolved);

  useEffect(() => {
    // Check gap size on mount/resize for accurate animation
    const updateGap = () => {
      setGapSize(window.innerWidth >= 640 ? '1rem' : '0.5rem'); // sm breakpoint
    };
    updateGap();
    window.addEventListener('resize', updateGap);
    return () => window.removeEventListener('resize', updateGap);
  }, []);

  useEffect(() => {
    if (isSolved && !mountedSolved.current) {
      // Trigger animation sequence
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setShowSolvedState(true);
      }, 600); // Duration matches CSS transition
      return () => clearTimeout(timer);
    } else if (isSolved && mountedSolved.current) {
      // If we mounted solved, just ensure state is correct
      setShowSolvedState(true);
    }
  }, [isSolved]);

  // Update mountedSolved when isSolved changes to true so subsequent re-renders don't re-animate
  useEffect(() => {
      if (isSolved) {
          mountedSolved.current = true;
      }
  }, [isSolved]);

  // Helper to determine visual state of a card
  const getCardState = (rIdx: number, wIdx: number): CardState => {
    // If this row is the ultimate winner, override everything for the winning card
    if (isUltimateWinner && wIdx === row.outlierIndex && isSolved) {
        return CardState.WIN;
    }

    if (gameStatus === 'won' && rIdx === rowIndex) {
       return CardState.WIN;
    }
    
    // If it's the specific outlier in a solved row, it's correct (Blue or Green)
    if (isSolved && wIdx === row.outlierIndex) return CardState.CORRECT_ROW_WRONG_GAME;

    if (failedIndices.has(wIdx)) return CardState.WRONG;
    if (selection === wIdx) return CardState.SELECTED;
    return CardState.IDLE;
  };
  
  // If we are showing the final solved state (Summary + Outlier Card)
  if (showSolvedState && !isAnimating) {
    const outlierWord = row.words[row.outlierIndex];
    const categoryWords = row.words
        .filter((_, idx) => idx !== row.outlierIndex)
        .map(w => w.text)
        .join(', ');

    // Determine styles based on whether this is the Ultimate Winner row or a regular Meta-Category row
    const containerClass = isUltimateWinner 
        ? "bg-green-100 border-green-200" 
        : "bg-blue-100 border-blue-200";
    
    // The card state handles the color of the outlier card itself (Green via WIN or Blue via CORRECT_ROW_WRONG_GAME)
    const cardState = isUltimateWinner ? CardState.WIN : CardState.CORRECT_ROW_WRONG_GAME;

    return (
      <div className="grid grid-cols-4 gap-2 sm:gap-4 animate-in fade-in duration-500 h-16">
        <div className={`col-span-3 h-16 ${containerClass} border-2 rounded-md flex flex-col items-center justify-center shadow-sm px-2 text-center select-none`}>
            <span className="font-bold text-gray-900 uppercase text-xs sm:text-sm tracking-widest leading-tight mb-0.5">{row.category}</span>
            <span className="text-gray-600 uppercase text-[10px] sm:text-xs font-medium truncate w-full px-2">{categoryWords}</span>
        </div>
        <Card 
            text={outlierWord.text}
            state={cardState}
            onClick={() => {}}
            disabled={true}
        />
      </div>
    );
  }

  // Render the 4 cards (either interactive or during animation)
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4 relative">
        {row.words.map((word, wIdx) => {
            const isOutlier = wIdx === row.outlierIndex;
            
            // Animation Styles
            let style: React.CSSProperties = {};
            let className = "";
            
            if (isAnimating) {
                style = { transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' };
                
                if (isOutlier) {
                    // Calculate distance to the last slot (index 3)
                    const slotsToMove = 3 - wIdx;
                    if (slotsToMove !== 0) {
                        style.transform = `translateX(calc(${slotsToMove} * (100% + ${gapSize})))`;
                        style.zIndex = 50;
                    }
                } else {
                    // Non-outliers fade out and shrink
                    style.opacity = 0;
                    style.transform = 'scale(0.8)';
                }
            }

            return (
                <Card
                    key={word.id}
                    text={word.text}
                    state={getCardState(rowIndex, wIdx)}
                    onClick={() => onCardClick(rowIndex, wIdx)}
                    disabled={gameStatus === 'won' || gameStatus === 'lost' || !!failedIndices.has(wIdx) || isSolved}
                    style={style}
                    className={className}
                />
            );
        })}
    </div>
  );
};


export default function App() {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [status, setStatus] = useState<GameStatus>('playing');
  
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [solvedRows, setSolvedRows] = useState<Set<number>>(new Set());
  
  // Visual reordering state
  const [visualRowOrder, setVisualRowOrder] = useState<number[]>([0, 1, 2, 3]);
  const [showMetaOverlay, setShowMetaOverlay] = useState(false);
  
  // Track strikes with type
  const [strikes, setStrikes] = useState<StrikeType[]>([]);
  
  const [failedGuesses, setFailedGuesses] = useState<Record<number, Set<number>>>({});

  const initGame = useCallback(() => {
    setSelections({});
    setSolvedRows(new Set());
    setStrikes([]);
    setFailedGuesses({});
    setVisualRowOrder([0, 1, 2, 3]);
    setShowMetaOverlay(false);
    const data = getRandomPuzzle();
    setGameData(data);
    setStatus('playing');
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Helper to trigger the final reorder animation
  const scheduleReorderAndOverlay = useCallback((winnerIdx: number, delayStart: number = 1000) => {
      if (!gameData) return;
      setTimeout(() => {
          const newVisualOrder = new Array(4).fill(0);
          
          let currentPos = 0;
          gameData.rows.forEach((_, rIdx) => {
              if (rIdx !== winnerIdx) {
                  newVisualOrder[rIdx] = currentPos;
                  currentPos++;
              }
          });
          newVisualOrder[winnerIdx] = 3; // Winner goes to bottom
          
          setVisualRowOrder(newVisualOrder);

          // Show Meta Overlay after rows have moved
          setTimeout(() => {
            setShowMetaOverlay(true);
          }, 2000); // Matches the transition duration

      }, delayStart); 
  }, [gameData]);

  const allRowsSelected = gameData ? Object.keys(selections).length === 4 : false;

  const handleCardClick = (rowIndex: number, wordIndex: number) => {
    if (status !== 'playing' || !gameData) return;
    if (solvedRows.has(rowIndex)) return;
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
        
        // 1. Mark winner as solved immediately (triggers Green animation)
        setSolvedRows(prev => new Set(prev).add(rowIndex));
        
        // 2. Reveal all other rows after a short delay
        setTimeout(() => {
            setSolvedRows(new Set([0, 1, 2, 3]));
            // 3. Reorder
            scheduleReorderAndOverlay(rowIndex, 1000);
        }, 1200); 

      } else {
        // Partial Correct (Blue)
        addStrike('BLUE');
        setSolvedRows(prev => new Set(prev).add(rowIndex));
      }
    } else {
      // WRONG (Red Strike)
      handleRedStrike(rowIndex, wordIndex);
    }
  };

  const addStrike = (type: StrikeType) => {
    const newStrikes = [...strikes, type];
    setStrikes(newStrikes);
    
    if (newStrikes.length >= STRIKE_LIMIT) {
      // --- LOSS SEQUENCE ---
      setStatus('lost');
      
      // Reveal the whole board immediately so user sees the answer
      if (gameData) {
         setSolvedRows(new Set([0, 1, 2, 3]));
         scheduleReorderAndOverlay(gameData.ultimateOutlierRowIndex, 1200);
      }
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

  if (!gameData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <h2 className="text-xl font-bold mb-4">Something went wrong.</h2>
        <button onClick={initGame} className="bg-black text-white px-6 py-2 rounded-full">Retry</button>
      </div>
    );
  }

  // Determine Title and Color for End Screen
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
            return (
                <div 
                    key={row.id}
                    className="absolute w-full transition-transform ease-in-out"
                    style={{
                        top: 0,
                        transform: `translateY(calc(${visualIndex} * 100%))`,
                        transitionDuration: '2000ms', // Slower animation
                        zIndex: 10
                    }}
                >
                    <div className="pb-2 sm:pb-4 h-20 sm:h-24">
                        <GameRow
                            row={row}
                            rowIndex={rIdx}
                            isSolved={solvedRows.has(rIdx)}
                            selection={selections[rIdx]}
                            failedIndices={failedGuesses[rIdx] || new Set()}
                            gameStatus={status}
                            isUltimateWinner={gameData.ultimateOutlierRowIndex === rIdx}
                            onCardClick={handleCardClick}
                        />
                    </div>
                </div>
            );
        })}

        {/* Meta Category Overlay */}
        {showMetaOverlay && (
          <div className="absolute top-0 right-0 w-1/4 h-[75%] z-20 animate-in fade-in duration-1000 pl-2 sm:pl-4 pb-2 sm:pb-4 pointer-events-none">
             <div className="w-full h-full bg-blue-100 border-2 border-blue-200 rounded-md shadow-sm flex flex-col items-center justify-center text-center p-2 select-none">
                 <span className="font-bold text-gray-900 uppercase text-xs sm:text-sm tracking-widest leading-tight mb-4">{gameData.metaCategory}</span>
                 <div className="flex flex-col space-y-2">
                    {metaWords.map(word => (
                        <span key={word} className="text-gray-600 uppercase text-[10px] sm:text-xs font-medium truncate">
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